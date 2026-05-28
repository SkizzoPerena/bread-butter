<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reportApiError, getApiErrorMessage } from '~/types/auth'
import { useGuests } from '~/composables/useGuests'
import { formatGuestValidationErrors } from '~/utils/guestListUpdates'

definePageMeta({
  layout: 'event-navbar',
  key: (route) => route.fullPath,
})

const toast = useToast()
const route = useRoute()
const { createGuestsBulk } = useGuests()
const { isUiOnlyMode } = useApiMode()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

type GuestRow = {
  id: string
  name: string
  email: string
}

function createRow(): GuestRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    email: '',
  }
}

const guestRows = ref<GuestRow[]>([createRow()])
const isSubmitting = ref(false)

const rowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

onMounted(() => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
  }
})

function addRow() {
  guestRows.value.push(createRow())
}

function removeRow(rowId: string) {
  if (guestRows.value.length <= 1) {
    return
  }
  guestRows.value = guestRows.value.filter((row) => row.id !== rowId)
}

function getValidRows(): { name: string; email: string }[] {
  const valid: { name: string; email: string }[] = []
  const seenEmails = new Set<string>()

  for (const row of guestRows.value) {
    const parsed = rowSchema.safeParse({
      name: row.name.trim(),
      email: row.email.trim().toLowerCase(),
    })
    if (!parsed.success) {
      continue
    }
    if (seenEmails.has(parsed.data.email)) {
      continue
    }
    seenEmails.add(parsed.data.email)
    valid.push(parsed.data)
  }

  return valid
}

async function handleSubmit() {
  const targetEventId = eventId.value || 'mock-event-id'
  const validRows = getValidRows()

  if (validRows.length === 0) {
    toast.add({
      title: 'No valid guests',
      description: 'Add at least one guest with a name and valid email.',
      color: 'error',
    })
    return
  }

  isSubmitting.value = true
  try {
    const response = await createGuestsBulk(targetEventId, validRows)
    const skipped = response.skippedExisting ?? 0
    toast.add({
      title: 'Guests added',
      description:
        skipped > 0
          ? `${response.created} added, ${skipped} already on the list.`
          : `${response.created} guest(s) added to the list.`,
    })
    await navigateTo({
      path: '/UserEventDashboard',
      query: { eventId: targetEventId },
    })
  } catch (error) {
    const validationMessage = formatGuestValidationErrors(error)
    if (validationMessage) {
      toast.add({
        title: 'Validation failed',
        description: validationMessage,
        color: 'error',
      })
      return
    }
    reportApiError(toast, {
      title: 'Could not add guests',
      error,
      fallback: getApiErrorMessage(error),
    })
  } finally {
    isSubmitting.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent<Record<string, never>>) {
  event.preventDefault()
  await handleSubmit()
}
</script>

<template>
  <UContainer class="space-y-6 pb-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-serif font-bold text-highlighted">
          Add multiple guests
        </h1>
        <p class="text-sm text-muted mt-1">
          Enter name and email for each guest you want to add.
        </p>
      </div>
      <UButton
        variant="outline"
        icon="i-lucide-arrow-left"
        :to="{ path: '/UserEventDashboard', query: eventId ? { eventId } : {} }"
      >
        Back to event
      </UButton>
    </div>

    <UPageCard class="white-bread-container space-y-4">
      <UForm class="space-y-4" @submit="onFormSubmit">
        <div
          v-for="(row, index) in guestRows"
          :key="row.id"
          class="rounded-lg border border-default/60 p-4 space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-muted">Guest {{ index + 1 }}</span>
            <UButton
              v-if="guestRows.length > 1"
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              type="button"
              @click="removeRow(row.id)"
            >
              Remove
            </UButton>
          </div>

          <UFormField label="Name" :name="`name-${row.id}`" required>
            <UInput
              v-model="row.name"
              class="w-full"
              placeholder="Juan Dela Cruz"
            />
          </UFormField>

          <UFormField label="Email" :name="`email-${row.id}`" required>
            <UInput
              v-model="row.email"
              type="email"
              class="w-full"
              placeholder="jdelacruz@example.com"
            />
          </UFormField>
        </div>

        <UButton
          type="button"
          variant="outline"
          icon="i-lucide-plus"
          block
          @click="addRow"
        >
          Add another guest
        </UButton>

        <UButton
          type="submit"
          block
          class="mt-2"
          :loading="isSubmitting"
          :disabled="!eventId && !isUiOnlyMode"
        >
          Add guests to list
        </UButton>
      </UForm>
    </UPageCard>
  </UContainer>
</template>
