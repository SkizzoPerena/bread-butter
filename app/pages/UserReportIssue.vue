<script setup lang="ts">
import { getApiErrorMessage } from '~/types/auth'
import { useIssues } from '~/composables/useIssues'

definePageMeta({
  layout: 'user-navbar',
})

const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { createIssue } = useIssues()

const report = reactive({
  title: '',
  description: '',
})

const attachmentFile = ref<File | null>(null)
const isSubmitting = ref(false)

function mediaKindFromFile(file: File | null): 'image' | 'other' | null {
  if (!file) {
    return null
  }
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) {
    return 'image'
  }
  const lower = (file.name || '').toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
    return 'image'
  }
  return 'other'
}

function resetAttachment() {
  attachmentFile.value = null
}

function validate(): string | null {
  if (!report.title.trim()) {
    return 'Title is required.'
  }
  if (!report.description.trim()) {
    return 'Description is required.'
  }
  const kind = mediaKindFromFile(attachmentFile.value)
  if (attachmentFile.value && kind === 'other') {
    return 'Only images (.jpg, .jpeg, .png) are supported.'
  }
  return null
}

async function submitReport() {
  const err = validate()
  if (err) {
    toast.add({ title: 'Validation failed', description: err, color: 'error' })
    return
  }

  isSubmitting.value = true
  try {
    const response = await createIssue({
      title: report.title,
      description: report.description,
      supplementaryFile: attachmentFile.value,
    })

    toast.add({
      title: 'Report submitted',
      description: response.message,
      color: 'success',
    })

    report.title = ''
    report.description = ''
    attachmentFile.value = null

    await navigateTo('/UserDashboard')
  } catch (error) {
    toast.add({
      title: 'Could not submit report',
      description: getApiErrorMessage(error),
      color: 'error',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <UPageHeader
      title="Report an issue"
      description="Tell us about a problem you ran into. Our team will review your report."
    />

    <div v-if="isUiOnlyMode" class="text-sm text-muted">
      UI-only mode: submissions are not sent to the API.
    </div>

    <UPageCard class="white-bread-container" title="Report a problem">
      <UForm class="space-y-4" @submit.prevent="submitReport">
        <UFormField label="Title" name="title" required>
          <UInput
            v-model="report.title"
            class="w-full"
            placeholder="e.g. Unable to publish my website"
          />
        </UFormField>

        <UFormField label="Description" name="description" required>
          <UTextarea
            v-model="report.description"
            class="w-full"
            placeholder="Please provide as much detail as possible..."
            :rows="8"
          />
        </UFormField>

        <UFormField label="Attach image (optional)" name="attachment">
          <UFileUpload
            v-model="attachmentFile"
            label="Click or drag to upload an image"
            accept="image/jpeg,image/png"
          />
          <div v-if="attachmentFile" class="flex items-center gap-2 mt-2">
            <span class="text-sm text-muted">{{ attachmentFile.name }}</span>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              @click="resetAttachment"
            >
              Remove
            </UButton>
          </div>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            to="/UserDashboard"
          />
          <UButton
            type="submit"
            label="Submit report"
            icon="i-lucide-send"
            color="primary"
            :loading="isSubmitting"
          />
        </div>
      </UForm>
    </UPageCard>
  </UContainer>
</template>
