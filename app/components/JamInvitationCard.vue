<script setup lang="ts">
import type { JamInvitationDesign } from '~/types/seating'
import { resolvePalette, resolveTypography } from '~/utils/websiteTheme'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'

const props = defineProps<{
  gatheringName: string
  venue: string
  eventDate: string
  message?: string
  design?: JamInvitationDesign | null
  ctaText?: string
  ctaHref?: string
  showCta?: boolean
}>()

defineEmits<{
  (e: 'clickCta'): void
}>()

useWeddingFonts()

const palette = computed(() => {
  const base = resolvePalette(props.design?.paletteName).colors
  if (props.design?.accentColor) {
    return { ...base, secondary: props.design.accentColor }
  }
  return base
})
const typography = computed(() => resolveTypography(props.design?.typographyName))
const usesOwnImage = computed(() => props.design?.mode === 'IMAGE' && Boolean(props.design.imageUrl))

const dateText = computed(() => {
  if (!props.eventDate) return ''
  return formatDateWithWeekday(props.eventDate) || props.eventDate
})

const isDualSchedule = computed(() => {
  return props.design?.scheduleType === 'dual' || Boolean(props.design?.ceremonyVenue || props.design?.receptionVenue)
})

const buttonLabel = computed(() => {
  return props.ctaText || props.design?.ctaText || 'Confirm Attendance'
})
</script>

<template>
  <article
    v-if="usesOwnImage"
    class="overflow-hidden rounded-2xl bg-white text-center text-toast-900 shadow-sm border border-stone-200/80"
    data-testid="jam-invitation-card"
  >
    <img
      :src="design?.imageUrl"
      :alt="`Invitation to ${gatheringName}`"
      class="h-auto w-full block"
    >
    <div class="space-y-1 p-5 text-sm">
      <p class="font-semibold text-stone-900">
        {{ dateText }}<span v-if="design?.eventTime"> · {{ formatTime(design.eventTime) || design.eventTime }}</span>
      </p>
      <p class="text-stone-600">{{ venue }}</p>
      <div v-if="showCta !== false" class="pt-3">
        <component
          :is="ctaHref ? 'a' : 'button'"
          :href="ctaHref"
          type="button"
          class="inline-flex items-center justify-center font-bold text-sm px-6 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 transition-colors shadow-2xs border border-stone-200/70"
          @click="$emit('clickCta')"
        >
          {{ buttonLabel }}
        </component>
      </div>
    </div>
  </article>

  <article
    v-else
    class="overflow-hidden rounded-2xl text-center shadow-sm border border-stone-200/60 max-w-lg mx-auto w-full transition-all"
    :style="{ backgroundColor: palette.primary, color: palette.secondary_text_color, fontFamily: typography.bodyFont }"
    data-testid="jam-invitation-card"
  >
    <!-- Panoramic Top Banner (if uploaded) -->
    <img
      v-if="design?.bannerImageUrl"
      :src="design.bannerImageUrl"
      alt="Banner"
      class="aspect-5/2 w-full object-cover block"
    >

    <div class="space-y-4 p-6 sm:p-8">
      <!-- Template Header Label (e.g. WEDDING INVITATION, 18TH BIRTHDAY INVITATION) -->
      <p
        v-if="design?.headerLabel"
        class="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] opacity-80"
        :style="{ fontFamily: typography.subheaderFont }"
      >
        {{ design.headerLabel }}
      </p>

      <!-- Headline (e.g. A Night to Remember, A Blessed Celebration, Let's Celebrate!, You're Invited!) -->
      <h2
        v-if="design?.headline"
        class="wrap-break-word text-2xl sm:text-3xl font-bold leading-tight"
        :style="{ color: palette.text_color, fontFamily: typography.headerFont }"
      >
        {{ design.headline }}
      </h2>

      <!-- Host / Company Name (e.g. [Company / Organization Name]) -->
      <p
        v-if="design?.hostName"
        class="wrap-break-word text-lg sm:text-xl font-bold leading-snug"
        :style="{ color: palette.text_color, fontFamily: typography.headerFont }"
      >
        {{ design.hostName }}
      </p>

      <!-- Request Line (e.g. Together with their families, OR is pleased to invite you to) -->
      <p
        v-if="design?.requestLine"
        class="text-sm sm:text-base leading-relaxed whitespace-pre-line"
        :style="{ fontFamily: typography.subheaderFont }"
      >
        {{ design.requestLine }}
      </p>

      <!-- Primary Name / Celebrant / Couple (e.g. [Name] & [Name] or [Celebrant's Name]) -->
      <!-- If headline wasn't present, make this h2 so smoke test or headings pick it up -->
      <h2
        v-if="!design?.headline"
        class="wrap-break-word text-2xl sm:text-3xl font-bold leading-tight"
        :style="{ color: palette.text_color, fontFamily: typography.headerFont }"
      >
        {{ design?.primaryName || gatheringName }}
      </h2>
      <h3
        v-else-if="design?.primaryName"
        class="wrap-break-word text-2xl sm:text-3xl font-bold leading-tight"
        :style="{ color: palette.text_color, fontFamily: typography.headerFont }"
      >
        {{ design.primaryName }}
      </h3>

      <!-- Message Text -->
      <p
        v-if="message"
        class="text-sm sm:text-base leading-relaxed whitespace-pre-line max-w-md mx-auto"
      >
        {{ message }}
      </p>

      <!-- Subtle Divider -->
      <div
        class="mx-auto h-px w-full max-w-xs"
        :style="{ backgroundColor: `${palette.secondary}40` }"
      />

      <!-- Schedule Section -->
      <div class="space-y-2 py-1">
        <p
          v-if="dateText"
          class="font-bold text-base sm:text-lg"
          :style="{ color: palette.text_color }"
        >
          {{ dateText }}
        </p>

        <!-- Dual Schedule (Wedding / Baptismal: Ceremony + Reception) -->
        <template v-if="isDualSchedule">
          <div class="space-y-0.5 pt-1">
            <p
              class="font-bold text-sm sm:text-base"
              :style="{ color: palette.text_color }"
            >
              {{ design?.ceremonyTitle || 'Ceremony' }}
            </p>
            <p v-if="design?.ceremonyTime" class="text-xs sm:text-sm">
              {{ formatTime(design.ceremonyTime) || design.ceremonyTime }}
            </p>
            <p v-if="design?.ceremonyVenue || venue" class="text-xs sm:text-sm">
              {{ design?.ceremonyVenue || venue }}
            </p>
          </div>

          <div class="space-y-0.5 pt-2">
            <p
              class="font-bold text-sm sm:text-base"
              :style="{ color: palette.text_color }"
            >
              {{ design?.receptionTitle || 'Reception' }}
            </p>
            <p v-if="design?.receptionTime" class="text-xs sm:text-sm">
              {{ formatTime(design.receptionTime) || design.receptionTime }}
            </p>
            <p v-if="design?.receptionVenue" class="text-xs sm:text-sm">
              {{ design.receptionVenue }}
            </p>
          </div>
        </template>

        <!-- Single Schedule (Birthday, 18th Birthday, Anniversary, Corporate, General) -->
        <template v-else>
          <div class="space-y-0.5 pt-1">
            <p
              class="font-bold text-sm sm:text-base"
              :style="{ color: palette.text_color }"
            >
              {{ design?.celebrationTitle || 'Celebration' }}
            </p>
            <p v-if="design?.eventTime" class="text-xs sm:text-sm">
              {{ formatTime(design.eventTime) || design.eventTime }}
            </p>
            <p v-if="venue" class="text-xs sm:text-sm">
              {{ venue }}
            </p>
          </div>
        </template>
      </div>

      <!-- Subtle Divider -->
      <div
        class="mx-auto h-px w-full max-w-xs"
        :style="{ backgroundColor: `${palette.secondary}40` }"
      />

      <!-- RSVP Deadline -->
      <p
        v-if="design?.deadlineText"
        class="text-xs sm:text-sm leading-relaxed max-w-xs mx-auto"
      >
        {{ design.deadlineText }}
      </p>

      <!-- CTA Button -->
      <div v-if="showCta !== false" class="pt-2">
        <component
          :is="ctaHref ? 'a' : 'button'"
          :href="ctaHref"
          type="button"
          class="inline-flex items-center justify-center font-bold text-sm sm:text-base px-8 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer hover:opacity-90 active:scale-[0.98]"
          :style="{
            backgroundColor: palette.secondary,
            color: palette.secondary_text_color,
            fontFamily: typography.subheaderFont,
          }"
          @click="$emit('clickCta')"
        >
          {{ buttonLabel }}
        </component>
      </div>
    </div>
  </article>
</template>
