<script setup lang="ts">
import type { JamBulkPreview, JamBulkResult } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

const props = defineProps<{ gatheringId: string }>()
const emit = defineEmits<{ sent: [] }>()

const toast = useToast()
const seating = useSeating()

const text = ref('')
const preview = ref<JamBulkPreview | null>(null)
const result = ref<JamBulkResult | null>(null)
const checking = ref(false)
const sending = ref(false)
const retrying = ref(false)

const emails = computed(() => text.value.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean))

// A preview only describes the list it checked, so editing the list clears it.
watch(text, () => {
  preview.value = null
})

async function check() {
  if (!emails.value.length) return
  checking.value = true
  result.value = null
  try {
    preview.value = await seating.previewBulkInvites(props.gatheringId, emails.value)
  } catch (error) {
    toast.add({ title: 'Could not check the list', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    checking.value = false
  }
}

async function send() {
  sending.value = true
  try {
    result.value = await seating.sendBulkInvites(props.gatheringId, emails.value)
    text.value = ''
    emit('sent')
  } catch (error) {
    toast.add({ title: 'Could not send the invitations', description: getApiErrorMessage(error), color: 'error' })
    await check()
  } finally {
    sending.value = false
  }
}

async function retrySkipped() {
  retrying.value = true
  try {
    const retried = await seating.sendInvites(props.gatheringId)
    toast.add({ title: retried.message, color: retried.skipped ? 'warning' : 'success' })
    if (result.value) result.value = { ...result.value, sent: result.value.sent + retried.sent, skipped: retried.skipped }
    emit('sent')
  } catch (error) {
    toast.add({ title: 'Could not send the invitations', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    retrying.value = false
  }
}
</script>

<template>
  <div
    class="white-bread-container p-4 sm:p-5 space-y-3 shadow-xs"
    data-testid="bulk-invite"
  >
    <div class="flex items-center gap-1.5 border-b border-bread-200/60 pb-2">
      <UIcon
        name="i-lucide-mails"
        class="size-4 text-toast-600"
      />
      <h3 class="font-serif font-bold text-base text-toast-900">
        Bulk Invite
      </h3>
    </div>
    <p class="text-xs text-muted">
      Paste email addresses, and each person gives their own name when they reply.
    </p>
    <label class="block text-[11px] font-semibold text-toast-800">
      Email addresses
      <textarea
        v-model="text"
        rows="4"
        placeholder="ana@example.com, ben@example.com"
        class="mt-1 w-full rounded-lg border border-toast-300 bg-white p-2.5 text-xs font-normal text-toast-900 sm:text-sm"
      />
    </label>
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        size="sm"
        color="toast"
        variant="outline"
        class="cursor-pointer"
        :loading="checking"
        :disabled="!emails.length || sending"
        @click="check"
      >
        Check List
      </UButton>
      <UButton
        size="sm"
        color="primary"
        icon="i-lucide-send"
        :loading="sending"
        :disabled="!preview?.canSend || checking"
        @click="send"
      >
        Send {{ preview?.canSend ? preview.toInvite : '' }} Invitations
      </UButton>
    </div>

    <div
      v-if="preview"
      class="space-y-1 rounded-lg bg-toast-50/70 p-2.5 text-xs"
      data-testid="bulk-preview"
    >
      <p>{{ preview.toInvite }} new · {{ preview.creditsRemaining }} email credits left</p>
      <p v-if="preview.duplicateCount">
        {{ preview.duplicateCount }} repeated, which will be ignored
      </p>
      <p v-if="preview.alreadyOnList">
        {{ preview.alreadyOnList }} already on your list, who won't be emailed again
      </p>
      <p
        v-if="preview.invalidEmails.length"
        class="font-semibold text-red-700"
      >
        Fix these first: {{ preview.invalidEmails.join(', ') }}
      </p>
      <p
        v-if="preview.shortBy > 0"
        class="font-semibold text-red-700"
      >
        That's {{ preview.shortBy }} more than you have credits for.
        <NuxtLink
          :to="`/user/seating-upgrade/${gatheringId}`"
          class="underline"
        >
          Upgrade your plan
        </NuxtLink>
        or shorten the list.
      </p>
      <p v-if="!preview.toInvite && !preview.invalidEmails.length">
        Everyone here is already on your list.
      </p>
    </div>

    <div
      v-if="result"
      role="status"
      class="space-y-1 rounded-lg bg-emerald-50 p-2.5 text-xs"
    >
      <p>{{ result.created }} added · {{ result.sent }} emailed · {{ result.creditsRemaining }} credits left</p>
      <div
        v-if="result.skipped"
        class="flex flex-wrap items-center gap-2"
      >
        <span>{{ result.skipped }} couldn't be emailed. They're on your list as pending.</span>
        <UButton
          size="xs"
          color="toast"
          variant="outline"
          class="cursor-pointer"
          :loading="retrying"
          @click="retrySkipped"
        >
          Try Again
        </UButton>
      </div>
    </div>
  </div>
</template>
