<script lang="ts" setup>
import type { InvitationRecord } from '~/types/invitation'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'

const props = defineProps<{
  invitation: InvitationRecord
}>()

const headingBlock = computed(() =>
  props.invitation.blocks.find((block) => block.type === 'heading')
)

const textBlock = computed(() =>
  props.invitation.blocks.find((block) => block.type === 'text')
)

const eventDateInput = computed(() => {
  const iso = props.invitation.eventDate
  if (!iso) {
    return ''
  }
  return iso.split('T')[0] ?? iso
})

const deadlineDateInput = computed(() => {
  const iso = props.invitation.deadlineDate
  if (!iso) {
    return ''
  }
  return iso.split('T')[0] ?? iso
})
</script>

<template>
  <UPageCard class="bread-container-bordered border border-toast-400 shadow-lg">
    <div class="flex flex-col gap-8 text-center py-8 px-4">
      <div class="space-y-4">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          {{ invitation.requestLine }}
        </p>
        <h1 class="text-4xl md:text-5xl font-bold font-serif text-neutral-900 dark:text-white leading-tight">
          {{ invitation.eventLabel }}
        </h1>

        <div class="mt-6 flex flex-col items-center text-neutral-700 dark:text-neutral-300">
          <div class="text-lg font-semibold uppercase">
            {{ formatDateWithWeekday(eventDateInput) }}
          </div>
          <div>{{ formatTime(invitation.eventTime) }}</div>
          <div class="flex items-center font-semibold font-serif pt-2">
            {{ invitation.eventVenue }}
          </div>
        </div>
      </div>

      <div class="flex flex-col">
        <h2 v-if="headingBlock" class="text-2xl font-bold">
          {{ headingBlock.content }}
        </h2>
        <div
          v-if="textBlock"
          class="prose dark:prose-invert max-w-none mx-auto text-center"
          v-html="textBlock.content"
        />
      </div>

      <div class="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <div
          class="prose dark:prose-invert mx-auto text-center text-sm"
          v-html="invitation.deadlineText"
        />
        <div
          v-if="deadlineDateInput"
          class="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400 rounded-lg font-semibold text-sm"
        >
          <UIcon name="i-lucide-calendar" class="w-5 h-5" />
          RSVP by {{ formatDateWithWeekday(deadlineDateInput) }}
        </div>
      </div>
    </div>
  </UPageCard>
</template>
