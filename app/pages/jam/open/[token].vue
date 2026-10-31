<script setup lang="ts">
import type { JamOpenInvitation } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import {
  validateGuestRsvpSubmission,
  type GuestAnswerMap,
  type GuestNotesMap,
} from '~/utils/guestRsvpValidation'
import GuestRsvpQuestionForm from '~/components/GuestRsvpQuestionForm.vue'
import JamInvitationCard from '~/components/JamInvitationCard.vue'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { fetchOpenInvite, unlockOpenInvite, registerOpenGuest } = useSeating()

const token = computed(() => String(route.params.token || ''))
const step = ref<'loading' | 'passcode' | 'form' | 'unavailable'>('loading')
const gatheringName = ref('')
const passcode = ref('')
const invitation = ref<JamOpenInvitation | null>(null)
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const attendanceStatus = ref<'GOING' | 'NOT_GOING' | null>('GOING')
const answerMap = ref<GuestAnswerMap>({})
const notesMap = ref<GuestNotesMap>({})
const errorMessage = ref('')
const resultMessage = ref('')
const attendanceToken = ref('')
const attendPath = ref('')
const saving = ref(false)

useHead({ title: 'Join the guest list' })

onMounted(async () => {
  try {
    const invite = await fetchOpenInvite(token.value)
    gatheringName.value = invite.gatheringName
    if (invite.passcodeRequired === false) {
      await unlock()
    } else {
      step.value = 'passcode'
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'This invite link is not available.')
    step.value = 'unavailable'
  }
})

async function unlock() {
  errorMessage.value = ''
  saving.value = true
  try {
    invitation.value = await unlockOpenInvite(token.value, passcode.value)
    step.value = 'form'
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Incorrect passcode.')
    step.value = 'passcode'
  } finally {
    saving.value = false
  }
}

async function register() {
  errorMessage.value = ''
  const { payload, error } = validateGuestRsvpSubmission(
    invitation.value?.questions ?? [],
    'GOING',
    answerMap.value,
    notesMap.value,
  )
  if (!payload) {
    errorMessage.value = error || 'Please check your answers.'
    return
  }
  saving.value = true
  try {
    const result = await registerOpenGuest(token.value, {
      passcode: passcode.value,
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      answers: payload.answers,
    })
    resultMessage.value = result.message
    attendanceToken.value = result.attendanceToken || ''
    attendPath.value = result.attendPath || ''
  } catch (registerError) {
    errorMessage.value = getApiErrorMessage(registerError, 'Could not add you to the guest list.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-toast-800 text-bread-100 flex items-center justify-center p-4">
    <div class="w-full max-w-xl rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4">
      <p class="text-sm uppercase tracking-wide">
        You're invited
      </p>
      <h1 class="text-3xl font-serif font-bold">
        {{ invitation?.gatheringName || gatheringName || 'Gathering' }}
      </h1>
      <p v-if="step === 'loading'">
        Loading...
      </p>
      <p
        v-if="resultMessage"
        role="status"
      >
        {{ resultMessage }}
      </p>
      <p
        v-else-if="errorMessage"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <template v-if="attendanceToken">
        <JamSeatPicker :token="attendanceToken" />
        <NuxtLink
          :to="attendPath"
          class="inline-block rounded-md border border-toast-800 px-4 py-2"
        >
          See my seat pass
        </NuxtLink>
      </template>

      <form
        v-else-if="step === 'passcode' && !resultMessage"
        class="space-y-3"
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
        v-else-if="step === 'form' && invitation && !resultMessage"
        class="space-y-4"
        @submit.prevent="register"
      >
        <JamInvitationCard
          :gathering-name="invitation.gatheringName"
          :venue="invitation.venue"
          :event-date="invitation.eventDate"
          :message="invitation.invitationMessage"
          :design="invitation.design"
        />
        <div class="grid gap-3 sm:grid-cols-2">
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
        <label class="block text-sm font-semibold">
          Email address
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 w-full rounded-md border border-toast-700/30 bg-white px-3 py-2"
          >
        </label>
        <GuestRsvpQuestionForm
          v-if="invitation.questions?.length"
          v-model:attendance-status="attendanceStatus"
          v-model:answer-map="answerMap"
          v-model:notes-map="notesMap"
          :questions="invitation.questions"
          :disabled="saving"
          hide-attendance
        />
        <button
          type="submit"
          class="rounded-md bg-toast-800 px-4 py-2 text-bread-100"
          :disabled="saving"
        >
          I'm coming
        </button>
      </form>
    </div>
  </div>
</template>
