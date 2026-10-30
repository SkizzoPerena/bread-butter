<script setup lang="ts">
import type { JamInvitation } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { fetchJamSite, unlockJamSite } = useSeating()

const token = computed(() => String(route.params.token || ''))
const gatheringName = ref('')
const invitation = ref<JamInvitation | null>(null)
const passcode = ref('')
const errorMessage = ref('')
const loading = ref(true)
const unlocking = ref(false)

useHead({ title: 'Invitation' })

onMounted(async () => {
  try {
    const site = await fetchJamSite(token.value)
    gatheringName.value = site.gatheringName
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'This invitation is not available.')
  } finally {
    loading.value = false
  }
})

async function unlock() {
  unlocking.value = true
  errorMessage.value = ''
  try {
    invitation.value = await unlockJamSite(token.value, passcode.value)
    gatheringName.value = invitation.value.gatheringName
  } catch (error) {
    invitation.value = null
    errorMessage.value = getApiErrorMessage(error, 'Incorrect passcode.')
  } finally {
    unlocking.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-toast-800 text-bread-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4">
      <p class="text-sm uppercase tracking-wide">
        Invitation
      </p>
      <h1 class="text-3xl font-serif font-bold">
        {{ gatheringName || 'Gathering' }}
      </h1>
      <p v-if="loading">
        Loading...
      </p>
      <p v-else-if="errorMessage && !invitation">
        {{ errorMessage }}
      </p>
      <form
        v-if="!loading && gatheringName && !invitation"
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
          :disabled="unlocking"
        >
          Open invitation
        </button>
      </form>
      <template v-else-if="invitation">
        <p class="whitespace-pre-line">
          {{ invitation.invitationMessage || 'You are invited.' }}
        </p>
        <p class="text-sm">
          {{ new Date(invitation.eventDate).toLocaleDateString() }}
        </p>
        <p class="text-sm">
          {{ invitation.venue }}
        </p>
      </template>
    </div>
  </div>
</template>
