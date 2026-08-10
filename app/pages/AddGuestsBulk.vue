<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reportApiError, getApiErrorMessage } from '~/types/auth'
import { useGuests } from '~/composables/useGuests'
import { formatGuestValidationErrors } from '~/utils/guestListUpdates'
import { formatGuestDisplayName } from '~/utils/guestName'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Bulk Add Guests',
  bgClass: 'bg-orange-50',
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
  firstName: string
  lastName: string
  email: string
  mailingAddress: string
  contactNumber: string
  envelopeName: string
}

const stagedGuests = ref<GuestRow[]>([])
const currentGuest = reactive({
  firstName: '',
  lastName: '',
  email: '',
  mailingAddress: '',
  contactNumber: '',
  envelopeName: '',
})
const isSubmitting = ref(false)

const rowSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  mailingAddress: z.string().optional(),
  contactNumber: z.string().optional(),
  envelopeName: z.string().optional(),
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

function addStagedGuest() {
  const parsed = rowSchema.safeParse({
    firstName: currentGuest.firstName.trim(),
    lastName: currentGuest.lastName.trim(),
    email: currentGuest.email.trim().toLowerCase(),
    mailingAddress: currentGuest.mailingAddress.trim(),
    contactNumber: currentGuest.contactNumber.trim(),
    envelopeName: currentGuest.envelopeName.trim(),
  })

  if (!parsed.success) {
    toast.add({ title: 'Please provide valid guest details', color: 'error' })
    return
  }

  const isDuplicate = stagedGuests.value.some((g) => g.email === parsed.data.email)
  if (isDuplicate) {
    toast.add({ title: 'Guest with this email is already staged', color: 'error' })
    return
  }

  stagedGuests.value.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    mailingAddress: parsed.data.mailingAddress ?? '',
    contactNumber: parsed.data.contactNumber ?? '',
    envelopeName: parsed.data.envelopeName ?? '',
  })

  currentGuest.firstName = ''
  currentGuest.lastName = ''
  currentGuest.email = ''
  currentGuest.mailingAddress = ''
  currentGuest.contactNumber = ''
  currentGuest.envelopeName = ''
}

function removeStagedGuest(rowId: string) {
  stagedGuests.value = stagedGuests.value.filter((row) => row.id !== rowId)
}

function getValidRows() {
  const valid: {
    firstName: string
    lastName: string
    email: string
    mailingAddress?: string
    contactNumber?: string
    envelopeName?: string
  }[] = []
  const seenEmails = new Set<string>()

  const allRows = [...stagedGuests.value]
  if (
    currentGuest.firstName.trim()
    || currentGuest.lastName.trim()
    || currentGuest.email.trim()
  ) {
    allRows.push({
      id: 'temp',
      firstName: currentGuest.firstName,
      lastName: currentGuest.lastName,
      email: currentGuest.email,
      mailingAddress: currentGuest.mailingAddress,
      contactNumber: currentGuest.contactNumber,
      envelopeName: currentGuest.envelopeName,
    })
  }

  for (const row of allRows) {
    const parsed = rowSchema.safeParse({
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      email: row.email.trim().toLowerCase(),
      mailingAddress: row.mailingAddress.trim(),
      contactNumber: row.contactNumber.trim(),
      envelopeName: row.envelopeName.trim(),
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
      description: 'Stage at least one guest with first name, last name, and a valid email.',
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
      path: '/event/guests',
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

function handleFormSubmit(event: FormSubmitEvent<Record<string, never>>) {
  event.preventDefault()
  addStagedGuest()
}
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      <!-- First Column: Form -->
      <div class="col-span-1 flex flex-col gap-4">
        <UPageCard class="white-bread-container">
          <p class="text-sm text-muted mb-4">
            Enter guest details for each person you want to add.
          </p>
          <UForm class="space-y-4" :state="currentGuest" @submit="handleFormSubmit">
            <UFormField label="First name" name="firstName" required>
              <UInput
                v-model="currentGuest.firstName"
                class="w-full"
                placeholder="Juan"
              />
            </UFormField>

            <UFormField label="Last name" name="lastName" required>
              <UInput
                v-model="currentGuest.lastName"
                class="w-full"
                placeholder="Dela Cruz"
              />
            </UFormField>

            <UFormField label="Email" name="email" required>
              <UInput
                v-model="currentGuest.email"
                type="email"
                class="w-full"
                placeholder="jdelacruz@example.com"
              />
            </UFormField>

            <UFormField label="Mailing address" name="mailingAddress">
              <UTextarea
                v-model="currentGuest.mailingAddress"
                class="w-full"
                placeholder="123 Rizal St, Manila"
                :rows="2"
              />
            </UFormField>

            <UFormField label="Contact number" name="contactNumber">
              <UInput
                v-model="currentGuest.contactNumber"
                class="w-full"
                placeholder="+63 912 345 6789"
              />
            </UFormField>

            <UFormField label="Envelope name" name="envelopeName">
              <UInput
                v-model="currentGuest.envelopeName"
                class="w-full"
                placeholder="Mr. & Mrs. Juan Dela Cruz"
              />
            </UFormField>
            
            <UButton
              type="submit"
              variant="outline"
              color="orange"
              icon="i-lucide-plus"
              block
              class="mt-2"
            >
              Stage Guest
            </UButton>
          </UForm>
        </UPageCard>

        <UButton
          color="orange"
          block
          size="lg"
          :loading="isSubmitting"
          :disabled="(!eventId && !isUiOnlyMode) || (stagedGuests.length === 0 && !currentGuest.firstName)"
          @click="handleSubmit"
        >
          Submit to Guest List
        </UButton>
      </div>

      <!-- Next 2 Columns: Staged Guests -->
      <div class="md:col-span-2">
        <div v-if="stagedGuests.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UPageCard
            v-for="row in stagedGuests"
            :key="row.id"
            class="white-bread-container relative group"
            :ui="{ body: 'p-4 sm:p-4' }"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium truncate text-default">
                  {{ formatGuestDisplayName(row.firstName, row.lastName) }}
                </div>
                <div class="text-sm text-muted truncate">{{ row.email }}</div>
                <div
                  v-if="row.envelopeName"
                  class="text-xs text-muted truncate mt-1"
                >
                  Envelope: {{ row.envelopeName }}
                </div>
              </div>
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                class="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                @click="removeStagedGuest(row.id)"
              />
            </div>
          </UPageCard>
        </div>
        
        <div
          v-else
          class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center h-full min-h-50"
        >
          <UIcon name="i-lucide-users" class="size-10 text-muted" />
          <p class="mt-4 text-sm font-medium">No guests staged</p>
          <p class="mt-1 text-sm text-muted">Add a guest using the form to see them here.</p>
        </div>
      </div>
    </div>
  </UContainer>
</template>
