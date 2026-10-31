<script setup lang="ts">
import type { GatheringRecord, JamInvitationDesign } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { colorPalettes, typographySets } from '~/utils/websiteTheme'
import JamInvitationCard from '~/components/JamInvitationCard.vue'

const props = defineProps<{
  gathering: GatheringRecord
  message: string
}>()

const emit = defineEmits<{ updated: [gathering: GatheringRecord] }>()

const toast = useToast()
const seating = useSeating()

const saving = ref(false)
const form = reactive({
  requestLine: '',
  headline: '',
  eventTime: '',
  deadlineText: '',
  paletteName: colorPalettes[0]!.name,
  typographyName: typographySets[0]!.name,
})

const mode = computed(() => props.gathering.invitationDesign?.mode || 'MAKER')
const ownImageUrl = computed(() => props.gathering.invitationDesign?.imageUrl || '')

const previewDesign = computed<JamInvitationDesign>(() => ({
  ...form,
  mode: mode.value,
  imageUrl: ownImageUrl.value,
  bannerImageUrl: props.gathering.invitationDesign?.bannerImageUrl || '',
}))

function syncFromGathering() {
  const design = props.gathering.invitationDesign
  form.requestLine = design?.requestLine || ''
  form.headline = design?.headline || ''
  form.eventTime = design?.eventTime || ''
  form.deadlineText = design?.deadlineText || ''
  form.paletteName = design?.paletteName || colorPalettes[0]!.name
  form.typographyName = design?.typographyName || typographySets[0]!.name
}

onMounted(syncFromGathering)

async function saveDesign() {
  saving.value = true
  try {
    const updated = await seating.saveInvitation(props.gathering._id, { invitationDesign: { ...form } })
    emit('updated', updated)
    toast.add({ title: 'Invitation design saved', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not save the design', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function uploadImage(kind: 'banner' | 'invitation', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  saving.value = true
  try {
    emit('updated', await seating.uploadInvitationImage(props.gathering._id, kind, file))
  } catch (error) {
    toast.add({ title: 'Could not upload the image', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function removeImage(kind: 'banner' | 'invitation') {
  saving.value = true
  try {
    emit('updated', await seating.removeInvitationImage(props.gathering._id, kind))
  } catch (error) {
    toast.add({ title: 'Could not remove the image', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function chooseMode(next: 'MAKER' | 'IMAGE') {
  if (next === mode.value) return
  saving.value = true
  try {
    emit('updated', await seating.saveInvitation(props.gathering._id, { invitationDesign: { mode: next } }))
  } catch (error) {
    toast.add({ title: 'Could not change the invitation', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <div class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <UButton
          type="button"
          size="xs"
          :variant="mode === 'MAKER' ? 'solid' : 'outline'"
          class="cursor-pointer"
          :disabled="saving"
          @click="chooseMode('MAKER')"
        >
          Use the invitation maker
        </UButton>
        <UButton
          type="button"
          size="xs"
          :variant="mode === 'IMAGE' ? 'solid' : 'outline'"
          class="cursor-pointer"
          :disabled="saving || !ownImageUrl"
          @click="chooseMode('IMAGE')"
        >
          Use my own image
        </UButton>
      </div>
      <UFormField
        label="Your own invitation image"
        hint="JPEG or PNG. Uploading it switches your invitation to this image."
      >
        <div class="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Upload your own invitation image"
            class="min-w-0 flex-1 text-xs"
            :disabled="saving"
            @change="uploadImage('invitation', $event)"
          >
          <UButton
            v-if="ownImageUrl"
            type="button"
            size="xs"
            color="error"
            variant="ghost"
            class="cursor-pointer"
            :disabled="saving"
            @click="removeImage('invitation')"
          >
            Remove my image
          </UButton>
        </div>
      </UFormField>

    <form
      v-if="mode === 'MAKER'"
      class="space-y-3"
      @submit.prevent="saveDesign"
    >
      <UFormField label="Request line">
        <UInput
          v-model="form.requestLine"
          maxlength="200"
          placeholder="Please join us for"
          size="sm"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Headline">
        <UInput
          v-model="form.headline"
          maxlength="120"
          :placeholder="gathering.name"
          size="sm"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Time">
        <UInput
          v-model="form.eventTime"
          maxlength="40"
          placeholder="6:00 PM"
          size="sm"
          class="w-full"
        />
      </UFormField>
      <UFormField label="RSVP deadline">
        <UInput
          v-model="form.deadlineText"
          maxlength="200"
          placeholder="Kindly reply by March 1"
          size="sm"
          class="w-full"
        />
      </UFormField>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Colors">
          <USelect
            v-model="form.paletteName"
            :items="colorPalettes.map((palette) => palette.name)"
            size="sm"
            class="w-full"
            aria-label="Colors"
          />
        </UFormField>
        <UFormField label="Fonts">
          <USelect
            v-model="form.typographyName"
            :items="typographySets.map((set) => set.name)"
            size="sm"
            class="w-full"
            aria-label="Fonts"
          />
        </UFormField>
      </div>
      <UFormField label="Banner image (optional)">
        <div class="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Upload a banner image"
            class="min-w-0 flex-1 text-xs"
            :disabled="saving"
            @change="uploadImage('banner', $event)"
          >
          <UButton
            v-if="gathering.invitationDesign?.bannerImageUrl"
            type="button"
            size="xs"
            color="error"
            variant="ghost"
            class="cursor-pointer"
            :disabled="saving"
            @click="removeImage('banner')"
          >
            Remove banner
          </UButton>
        </div>
      </UFormField>
      <UButton
        type="submit"
        color="primary"
        size="sm"
        icon="i-lucide-save"
        :loading="saving"
      >
        Save Design
      </UButton>
    </form>
    </div>

    <div class="space-y-2">
      <p class="text-xs font-semibold text-toast-800">
        Preview
      </p>
      <JamInvitationCard
        :gathering-name="gathering.name"
        :venue="gathering.venue"
        :event-date="gathering.eventDate"
        :message="message"
        :design="previewDesign"
      />
    </div>
  </div>
</template>
