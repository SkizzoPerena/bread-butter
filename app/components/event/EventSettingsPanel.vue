<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { EVENT_TYPE_OPTIONS } from '~/types/event'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'

const props = defineProps<{
  eventId: string
  isUiOnlyMode?: boolean
}>()

const eventRecord = defineModel<EventRecord | null>('eventRecord', { default: null })

const eventIdRef = toRef(props, 'eventId')
const eventRecordRef = eventRecord

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const {
  form,
  coverImageFile,
  coverImageInput,
  isSubmitting,
  isEventCancelled,
  onCoverImageChange,
  submit,
} = useEventSettingsForm({
  eventId: eventIdRef,
  eventRecord: eventRecordRef,
})

const eventCoverUrl = computed(() => {
  if (eventRecord.value?.coverImageURL) {
    return resolveEventCoverImageUrl(eventRecord.value.coverImageURL)
  }
  if (props.isUiOnlyMode || !props.eventId) {
    return demoCoverImage
  }
  return null
})

const overviewDateLabel = computed(() => {
  const iso = eventRecord.value?.eventDate
  if (iso) {
    return df.format(new Date(iso))
  }
  if (props.isUiOnlyMode) {
    return 'May 18, 2026'
  }
  return ''
})

const overviewVenue = computed(() => eventRecord.value?.venue ?? '')

const overviewTitle = computed(
  () => eventRecord.value?.eventName ?? 'Event Settings'
)

const statusBadge = computed(() => {
  if (eventRecord.value?.status === 'CANCELLED') {
    return { label: 'Cancelled', color: 'error' as const }
  }
  return { label: 'Ongoing', color: 'success' as const }
})

function onCoverImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}
</script>

<template>
  <UPageCard class="white-bread-container space-y-6">
    <UAlert
      v-if="isEventCancelled"
      color="warning"
      variant="subtle"
      title="Event cancelled"
      description="This event is cancelled. You can still update its details here."
    />

    <div class="space-y-4">
      <div class="overflow-hidden rounded-lg border border-default">
        <img
          v-if="eventCoverUrl"
          :src="eventCoverUrl"
          :alt="`${overviewTitle} cover`"
          class="h-48 w-full object-cover"
          @error="onCoverImageError"
        >
        <div
          v-else
          class="flex h-48 items-center justify-center bg-muted/30 text-sm text-muted"
        >
          No cover image
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-2xl font-bold font-serif">
            {{ overviewTitle }}
          </h2>
          <UBadge :color="statusBadge.color" variant="subtle">
            {{ statusBadge.label }}
          </UBadge>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="overviewDateLabel"
            icon="i-lucide-calendar"
            class="rounded-full px-4"
            variant="subtle"
            disabled
            :ui="{ base: 'disabled:cursor-default' }"
          >
            {{ overviewDateLabel }}
          </UButton>
          <UButton
            v-if="overviewVenue"
            icon="i-lucide-map-pin"
            class="rounded-full px-4"
            variant="subtle"
            disabled
            :ui="{ base: 'disabled:cursor-default' }"
          >
            {{ overviewVenue }}
          </UButton>
        </div>
      </div>
    </div>

    <div class="border-t border-default pt-6">
      <div class="mb-4 text-xl font-semibold uppercase text-muted">
        Edit event details
      </div>

      <UForm class="space-y-4" @submit.prevent="submit">
        <UFormField label="Event Name" name="eventName" required>
          <UInput
            v-model="form.eventName"
            class="w-full"
            placeholder="Jane & John's Wedding"
          />
        </UFormField>

        <UFormField label="Event Type" name="eventType" required>
          <USelect
            v-model="form.eventType"
            :items="EVENT_TYPE_OPTIONS"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Venue" name="venue" required>
          <UInput
            v-model="form.venue"
            class="w-full"
            placeholder="Manila Cathedral"
          />
        </UFormField>

        <UFormField label="Description" name="description" required>
          <UTextarea
            v-model="form.description"
            class="w-full"
            placeholder="Tell us more about your special day"
          />
        </UFormField>

        <UFormField label="Cover Image" name="coverImage">
          <input
            ref="coverImageInput"
            type="file"
            accept="image/*"
            class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-white"
            @change="onCoverImageChange"
          >
          <p v-if="coverImageFile" class="mt-1 text-xs text-muted">
            Selected: {{ coverImageFile.name }}
          </p>
          <p
            v-else-if="eventRecord?.coverImageURL"
            class="mt-1 text-xs text-muted"
          >
            Current cover will be kept unless you upload a new image.
          </p>
        </UFormField>

        <div class="flex justify-end pt-2">
          <UButton
            type="submit"
            icon="i-lucide-save"
            :loading="isSubmitting"
          >
            Save Changes
          </UButton>
        </div>
      </UForm>
    </div>
  </UPageCard>
</template>
