<script setup lang="ts">
import type { EventQuestion } from '~/types/event'
import { getApiErrorMessage } from '~/types/auth'
import {
  guestAnswerMapFromRsvp,
  guestNotesMapFromRsvp,
  validateGuestRsvpSubmission,
  type GuestAnswerMap,
  type GuestNotesMap,
} from '~/utils/guestRsvpValidation'
import GuestRsvpQuestionForm from '~/components/GuestRsvpQuestionForm.vue'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { fetchJamInvite, unlockJamInvite, respondToJamInvite } = useSeating()

const token = computed(() => String(route.params.token || ''))
const step = ref<'loading' | 'passcode' | 'reply' | 'unavailable'>('loading')
const passcode = ref('')
const gatheringName = ref('')
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
    const invite = await fetchJamInvite(token.value)
    gatheringName.value = invite.gatheringName || ''
    if (invite.passcodeRequired === false) {
      await unlock()
    } else {
      step.value = 'passcode'
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'This invitation is not available.')
    step.value = 'unavailable'
  }
})

async function unlock() {
  errorMessage.value = ''
  saving.value = true
  try {
    const unlocked = await unlockJamInvite(token.value, passcode.value)
    questions.value = unlocked.questions ?? []
    needsName.value = Boolean(unlocked.needsName)
    answerMap.value = guestAnswerMapFromRsvp(unlocked.answers ?? [])
    notesMap.value = guestNotesMapFromRsvp(unlocked.answers ?? [])
    if (unlocked.rsvpStatus === 'GOING' || unlocked.rsvpStatus === 'NOT_GOING') {
      attendanceStatus.value = unlocked.rsvpStatus
    }
    step.value = 'reply'
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Incorrect passcode.')
    step.value = 'passcode'
  } finally {
    saving.value = false
  }
}

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
      passcode: passcode.value,
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
      <form
        v-if="step === 'passcode' && !resultMessage"
        class="space-y-3 text-left"
        @submit.prevent="unlock"
      >
        <label class="block text-sm font-semibold">
          Passcode
          <input
            v-model="passcode"
            type="password"
            required
            class="mt-1 w-full rounded-md border border-toast-700/30 bg-white px-3 py-2"
          >
        </label>
        <button
          type="submit"
          class="rounded-md bg-toast-800 px-4 py-2 text-bread-100"
          :disabled="saving"
        >
          Continue
        </button>
      </form>
      <form
        v-else-if="step === 'reply' && !resultMessage"
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
