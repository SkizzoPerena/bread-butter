<script lang="ts" setup>
import type { GuestRsvpSubEventInfo } from '~/types/rsvp'
import { formatIsoDate } from '~/utils/invitationDisplay'

defineProps<{
  subEvent: GuestRsvpSubEventInfo
}>()
</script>

<template>
  <UPageCard class="bread-container-bordered border border-pink-400 shadow-lg">
    <div class="space-y-4 py-8 px-6 text-center">
      <UBadge color="pink" variant="subtle">Sub-Event RSVP</UBadge>
      <h1 class="text-3xl md:text-4xl font-bold font-serif text-highlighted">
        {{ subEvent.name }}
      </h1>
      <div class="space-y-2 text-muted">
        <p v-if="subEvent.eventDate" class="text-lg font-medium">
          <UIcon name="i-lucide-calendar" class="inline size-4 -mt-0.5" />
          {{ formatIsoDate(subEvent.eventDate) }}
        </p>
        <p v-if="subEvent.venue">
          <UIcon name="i-lucide-map-pin" class="inline size-4 -mt-0.5" />
          {{ subEvent.venue }}
        </p>
        <p v-if="subEvent.description" class="text-sm">
          {{ subEvent.description }}
        </p>
      </div>
    </div>
  </UPageCard>
</template>
