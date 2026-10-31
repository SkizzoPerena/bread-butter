<script setup lang="ts">
import type { EventQuestion } from '~/types/event'
import type { JamInviteUnlocked } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import {
  guestAnswerMapFromRsvp,
  guestNotesMapFromRsvp,
  validateGuestRsvpSubmission,
  type GuestAnswerMap,
  type GuestNotesMap,
} from '~/utils/guestRsvpValidation'
import GuestRsvpQuestionForm from '~/components/GuestRsvpQuestionForm.vue'
import JamInvitationCard from '~/components/JamInvitationCard.vue'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { unlockJamInvite, respondToJamInvite } = useSeating()

const token = computed(() => String(route.params.token || ''))
const step = ref<'loading' | 'reply' | 'unavailable'>('loading')
const gatheringName = ref('')
const invitation = ref<JamInviteUnlocked | null>(null)
const questions = ref<EventQuestion[]>([])
const needsName = ref(false)
const firstName = ref('')
const lastName = ref('')
const attendanceStatus = ref<'GOING' | 'NOT_GOING' | null>(null)
const answerMap = ref<GuestAnswerMap>({})
const notesMap = ref<GuestNotesMap>({})
const resultMessage = ref('')
const attendPath = ref('')
const errorMessage = ref('')
const saving = ref(false)

// Someone who isn't coming isn't asked things like a meal choice.
const visibleQuestions = computed(() => (attendanceStatus.value === 'GOING' ? questions.value : []))
const askForName = computed(() => needsName.value && attendanceStatus.value === 'GOING')

useHead({ title: 'Reply' })

onMounted(async () => {
  try {
    const unlocked = await unlockJamInvite(token.value)
    invitation.value = unlocked
    gatheringName.value = unlocked.gatheringName || ''
    questions.value = unlocked.questions ?? []
    needsName.value = Boolean(unlocked.needsName)
    answerMap.value = guestAnswerMapFromRsvp(unlocked.answers ?? [])
    notesMap.value = guestNotesMapFromRsvp(unlocked.answers ?? [])
    if (unlocked.rsvpStatus === 'GOING' || unlocked.rsvpStatus === 'NOT_GOING') {
      attendanceStatus.value = unlocked.rsvpStatus
    }
    step.value = 'reply'
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'This invitation is not available.')
    step.value = 'unavailable'
  }
})

async function sendReply() {
  errorMessage.value = ''
  const { payload, error } = validateGuestRsvpSubmission(
    visibleQuestions.value,
    attendanceStatus.value,
    answerMap.value,
    notesMap.value,
  )
  if (!payload) {
    errorMessage.value = error || 'Please check your reply.'
    return
  }
  if (askForName.value && (!firstName.value.trim() || !lastName.value.trim())) {
    errorMessage.value = 'Please enter your first and last name.'
    return
  }
  saving.value = true
  try {
    const result = await respondToJamInvite(token.value, {
      rsvpStatus: payload.status,
      answers: payload.answers,
      ...(askForName.value ? { firstName: firstName.value.trim(), lastName: lastName.value.trim() } : {}),
    })
    resultMessage.value = result.message
    attendPath.value = result.attendPath || ''
  } catch (replyError) {
    errorMessage.value = getApiErrorMessage(replyError, 'Could not save your reply.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-toast-800 text-bread-100 flex items-center justify-center p-4">
    <div class="w-full max-w-xl rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4 text-center">
      <p class="text-sm uppercase tracking-wide">
        Reply
      </p>
      <h1 class="text-3xl font-serif font-bold">
        {{ gatheringName || 'Are you coming?' }}
      </h1>
      <p v-if="step === 'loading'">
        Loading...
      </p>
      <p v-if="resultMessage">
        {{ resultMessage }}
      </p>
      <p
        v-else-if="errorMessage"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <template v-if="attendPath">
        <JamSeatPicker :token="token" />
        <NuxtLink
          :to="attendPath"
          class="inline-block rounded-md border border-toast-800 px-4 py-2"
        >
          See my seat pass
        </NuxtLink>
      </template>
      <JamInvitationCard
        v-if="invitation && !resultMessage"
        :gathering-name="invitation.gatheringName"
        :venue="invitation.venue ?? ''"
        :event-date="invitation.eventDate ?? ''"
        :message="invitation.invitationMessage"
        :design="invitation.design"
      />
      <form
        v-if="step === 'reply' && !resultMessage"
        class="space-y-4 text-left"
        @submit.prevent="sendReply"
      >
        <GuestRsvpQuestionForm
          v-model:attendance-status="attendanceStatus"
          v-model:answer-map="answerMap"
          v-model:notes-map="notesMap"
          :questions="visibleQuestions"
          :disabled="saving"
        />
        <div
          v-if="askForName"
          class="grid gap-3 sm:grid-cols-2"
        >
          <label class="block text-sm font-semibold">
            First name
            <input
              v-model="firstName"
              required
              maxlength="50"
              autocomplete="given-name"
              class="mt-1 w-full rounded-md border border-toast-700/30 bg-white px-3 py-2"
            >
          </label>
          <label class="block text-sm font-semibold">
            Last name
            <input
              v-model="lastName"
              required
              maxlength="50"
              autocomplete="family-name"
              class="mt-1 w-full rounded-md border border-toast-700/30 bg-white px-3 py-2"
            >
          </label>
        </div>
        <button
          type="submit"
          class="rounded-md bg-toast-800 px-4 py-2 text-bread-100"
          :disabled="saving"
        >
          Send reply
        </button>
      </form>
    </div>
  </div>
</template>
