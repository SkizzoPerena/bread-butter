<script lang="ts" setup>
import type { GuestRsvpFormResponse } from '~/types/rsvp'
import { GuestRsvpError, isValidRsvpObjectId } from '~/types/rsvp'
import { reportApiError } from '~/types/auth'
import {
  validateGuestRsvpSubmission,
  type GuestAnswerMap,
  type GuestNotesMap,
} from '~/utils/guestRsvpValidation'
import {
  formatRsvpAnswerValue,
  formatRsvpAnswerNotes,
  mapRsvpStatusToLabel,
} from '~/utils/rsvpDisplay'

definePageMeta({
  layout: false,
})

type PageState =
  | 'loading'
  | 'not-found'
  | 'already-responded'
  | 'form'
  | 'success'

const route = useRoute()
const toast = useToast()
const { fetchGuestRsvpForm, submitGuestRsvpResponse } = useGuestRsvp()

const rsvpId = computed(() => {
  const value = route.params.rsvpId
  return typeof value === 'string' ? value : ''
})

const pageState = ref<PageState>('loading')
const formData = ref<GuestRsvpFormResponse | null>(null)
const attendanceStatus = ref<'GOING' | 'NOT_GOING' | null>(null)
const answerMap = ref<GuestAnswerMap>({})
const notesMap = ref<GuestNotesMap>({})
const formError = ref('')
const isSubmitting = ref(false)

async function loadForm() {
  if (!rsvpId.value || !isValidRsvpObjectId(rsvpId.value)) {
    pageState.value = 'not-found'
    formData.value = null
    return
  }

  pageState.value = 'loading'
  formError.value = ''

  try {
    const response = await fetchGuestRsvpForm(rsvpId.value)
    formData.value = response

    if (response.alreadyResponded) {
      pageState.value = 'already-responded'
      return
    }

    attendanceStatus.value = null
    answerMap.value = {}
    notesMap.value = {}
    pageState.value = 'form'
  } catch (error) {
    if (error instanceof GuestRsvpError && error.notFound) {
      pageState.value = 'not-found'
      formData.value = null
      return
    }
    reportApiError(toast, { title: 'Could not load RSVP', error })
    pageState.value = 'not-found'
  }
}

async function handleSubmit() {
  if (!formData.value || isSubmitting.value) {
    return
  }

  const validation = validateGuestRsvpSubmission(
    formData.value.questions,
    attendanceStatus.value,
    answerMap.value,
    notesMap.value
  )

  if (validation.error || !validation.payload) {
    formError.value = validation.error || 'Please complete all required fields.'
    return
  }

  formError.value = ''
  isSubmitting.value = true

  try {
    await submitGuestRsvpResponse(rsvpId.value, validation.payload)
    pageState.value = 'success'
  } catch (error) {
    if (error instanceof GuestRsvpError && error.alreadyResponded) {
      pageState.value = 'already-responded'
      return
    }
    if (error instanceof GuestRsvpError) {
      formError.value = error.message
      return
    }
    reportApiError(toast, { title: 'Could not submit RSVP', error })
  } finally {
    isSubmitting.value = false
  }
}

const respondedAnswers = computed(() => formData.value?.rsvp.answers ?? [])

onMounted(() => {
  loadForm()
})

watch(rsvpId, () => {
  loadForm()
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 py-10 px-4">
    <UContainer class="max-w-3xl">
      <div
        v-if="pageState === 'loading'"
        class="flex min-h-[50vh] items-center justify-center text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
        <span class="ml-3 text-sm">Loading RSVP...</span>
      </div>

      <div
        v-else-if="pageState === 'not-found'"
        class="flex min-h-[50vh] items-center justify-center"
      >
        <div class="max-w-md text-center space-y-3">
          <UIcon name="i-lucide-search-x" class="mx-auto size-10 text-muted" />
          <p class="text-xl font-semibold text-highlighted">RSVP not found</p>
          <p class="text-sm text-muted">
            This invitation link may be invalid, or the event is no longer available.
          </p>
        </div>
      </div>

      <div
        v-else-if="pageState === 'success'"
        class="flex min-h-[50vh] items-center justify-center"
      >
        <UPageCard class="max-w-lg w-full space-y-3 p-8 text-center">
          <UIcon name="i-lucide-circle-check" class="mx-auto size-12 text-success" />
          <p class="text-xl font-semibold text-highlighted">
            You have successfully sent your response
          </p>
        </UPageCard>
      </div>

      <div v-else-if="pageState === 'already-responded' && formData" class="space-y-6">
        <UPageCard class="space-y-4 p-8 text-center">
          <UIcon name="i-lucide-mail-check" class="mx-auto size-10 text-muted" />
          <p class="text-xl font-semibold text-highlighted">
            You have already responded to this RSVP
          </p>
          <p class="text-sm text-muted">
            Response status:
            <UBadge variant="subtle" class="ml-1">
              {{ mapRsvpStatusToLabel(formData.rsvp.status) }}
            </UBadge>
          </p>
        </UPageCard>

        <UPageCard v-if="respondedAnswers.length" class="space-y-4">
          <p class="font-semibold text-highlighted">Your answers</p>
          <div
            v-for="(entry, index) in respondedAnswers"
            :key="`${entry.question}-${index}`"
            class="rounded-lg border border-default px-4 py-3"
          >
            <p class="text-sm font-medium">{{ entry.question }}</p>
            <p class="mt-1 text-sm text-muted">
              {{ formatRsvpAnswerValue(entry.answer) }}
            </p>
            <p
              v-if="formatRsvpAnswerNotes(entry.notes)"
              class="mt-2 text-sm text-muted italic"
            >
              Notes: {{ formatRsvpAnswerNotes(entry.notes) }}
            </p>
          </div>
        </UPageCard>
      </div>

      <div v-else-if="pageState === 'form' && formData" class="space-y-6">
        <InvitationRsvpVisual
          v-if="formData.invitation"
          :invitation="formData.invitation"
        />
        <SubEventRsvpHeader
          v-else-if="formData.subEvent"
          :sub-event="formData.subEvent"
        />

        <GuestRsvpQuestionForm
          v-model:attendance-status="attendanceStatus"
          v-model:answer-map="answerMap"
          v-model:notes-map="notesMap"
          :questions="formData.questions"
        />

        <p v-if="formError" class="text-sm text-error">
          {{ formError }}
        </p>

        <div class="flex justify-end">
          <UButton
            color="purple"
            size="lg"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="handleSubmit"
          >
            Submit Response
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>
