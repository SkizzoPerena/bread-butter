<script setup lang="ts">
import type { JamInvitationDesign } from '~/types/seating'
import { resolvePalette, resolveTypography } from '~/utils/websiteTheme'

const props = defineProps<{
  gatheringName: string
  venue: string
  eventDate: string
  message?: string
  design?: JamInvitationDesign | null
}>()

useWeddingFonts()

const palette = computed(() => resolvePalette(props.design?.paletteName).colors)
const typography = computed(() => resolveTypography(props.design?.typographyName))
const dateText = computed(() => {
  const date = new Date(props.eventDate)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { dateStyle: 'long' })
})
</script>

<template>
  <article
    class="overflow-hidden rounded-2xl text-center shadow-sm"
    :style="{ backgroundColor: palette.primary, color: palette.secondary_text_color, fontFamily: typography.bodyFont }"
    data-testid="jam-invitation-card"
  >
    <img
      v-if="design?.bannerImageUrl"
      :src="design.bannerImageUrl"
      alt=""
      class="aspect-5/2 w-full object-cover"
    >
    <div class="space-y-3 p-6">
      <p
        v-if="design?.requestLine"
        class="text-sm"
        :style="{ fontFamily: typography.subheaderFont }"
      >
        {{ design.requestLine }}
      </p>
      <h2
        class="break-words text-4xl leading-tight"
        :style="{ color: palette.text_color, fontFamily: typography.headerFont }"
      >
        {{ design?.headline || gatheringName }}
      </h2>
      <p
        v-if="message"
        class="whitespace-pre-line"
      >
        {{ message }}
      </p>
      <div
        class="mx-auto h-px w-24"
        :style="{ backgroundColor: palette.secondary }"
      />
      <p class="font-semibold">
        {{ dateText }}<span v-if="design?.eventTime"> · {{ design.eventTime }}</span>
      </p>
      <p>{{ venue }}</p>
      <p
        v-if="design?.deadlineText"
        class="text-sm"
      >
        {{ design.deadlineText }}
      </p>
    </div>
  </article>
</template>
