<script setup lang="ts">
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { respondToJamInvite } = useSeating()

const token = computed(() => String(route.params.token || ''))
const passcode = ref('')
const unlocked = ref(false)
const resultMessage = ref('')
const errorMessage = ref('')
const saving = ref(false)

useHead({ title: 'Reply' })

function openReply() {
  errorMessage.value = ''
  unlocked.value = true
}

async function reply(rsvpStatus: 'GOING' | 'NOT_GOING') {
  saving.value = true
  errorMessage.value = ''
  try {
    const result = await respondToJamInvite(token.value, passcode.value, rsvpStatus)
    resultMessage.value = result.message
  } catch (error) {
    resultMessage.value = ''
    errorMessage.value = getApiErrorMessage(error, 'Could not save your reply.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-toast-800 text-bread-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4 text-center">
      <p class="text-sm uppercase tracking-wide">
        Reply
      </p>
      <h1 class="text-3xl font-serif font-bold">
        Are you coming?
      </h1>
      <p v-if="resultMessage">
        {{ resultMessage }}
      </p>
      <p v-else-if="errorMessage">
        {{ errorMessage }}
      </p>
      <form
        v-if="!unlocked && !resultMessage"
        class="space-y-3 text-left"
        @submit.prevent="openReply"
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
        >
          Continue
        </button>
      </form>
      <div
        v-else-if="!resultMessage"
        class="flex justify-center gap-2"
      >
        <button
          type="button"
          class="rounded-md bg-toast-800 px-4 py-2 text-bread-100"
          :disabled="saving"
          @click="reply('GOING')"
        >
          Yes, I'm coming
        </button>
        <button
          type="button"
          class="rounded-md border border-toast-800 px-4 py-2"
          :disabled="saving"
          @click="reply('NOT_GOING')"
        >
          No
        </button>
      </div>
    </div>
  </div>
</template>
