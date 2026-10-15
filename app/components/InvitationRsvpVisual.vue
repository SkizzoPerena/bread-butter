<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue'
import type { InvitationRecord } from '~/types/invitation'
import type { CustomSiteRecord } from '~/types/customSite'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'
import { resolveCustomSiteTheme } from '~/utils/websiteTheme'

const props = defineProps<{
  invitation: InvitationRecord
  customSite?: CustomSiteRecord | null
}>()

useWeddingFonts()

const { fetchCustomSitesByEvent } = useCustomSite()
const siteRecord = ref<CustomSiteRecord | null>(props.customSite || null)

const eventId = computed(() => {
  const ev = props.invitation?.event
  if (typeof ev === 'string' && ev.trim()) return ev.trim()
  if (typeof ev === 'object' && ev !== null && '_id' in (ev as any)) {
    return String((ev as any)._id)
  }
  return ''
})

async function loadCustomSite() {
  if (props.customSite) {
    siteRecord.value = props.customSite
    return
  }
  if (!siteRecord.value && eventId.value) {
    try {
      const sites = await fetchCustomSitesByEvent(eventId.value)
      if (sites && sites.length > 0) {
        siteRecord.value = sites[0] ?? null
      }
    } catch {
      // Fallback gracefully to default theme
    }
  }
}

onMounted(() => {
  loadCustomSite()
})

watch(
  () => props.customSite,
  (val) => {
    if (val) {
      siteRecord.value = val
    }
  }
)

watch(
  eventId,
  () => {
    if (!props.customSite) {
      loadCustomSite()
    }
  }
)

const theme = computed(() => resolveCustomSiteTheme(siteRecord.value))
const palette = computed(() => theme.value.palette)
const typography = computed(() => theme.value.typography)

// Custom Website Destination (RSVP Section)
const websiteSlug = computed(() => {
  if (siteRecord.value?.siteName?.trim()) {
    return siteRecord.value.siteName.trim()
  }
  if (siteRecord.value?.title?.trim()) {
    return siteRecord.value.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
  }
  return ''
})

const websiteUrl = computed(() => {
  if (websiteSlug.value) {
    return `/sites/${encodeURIComponent(websiteSlug.value)}#rsvp`
  }
  return ''
})

function handleRsvpClick() {
  if (websiteUrl.value) {
    window.open(websiteUrl.value, '_blank')
  } else if (typeof document !== 'undefined') {
    const formElement = document.getElementById('rsvp-question-form') || document.querySelector('form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' })
    }
  }
}

const eventDateInput = computed(() => {
  const iso = props.invitation?.eventDate
  if (!iso) {
    return ''
  }
  return iso.split('T')[0] ?? iso
})

const deadlineDateInput = computed(() => {
  const iso = props.invitation?.deadlineDate
  if (!iso) {
    return ''
  }
  return iso.split('T')[0] ?? iso
})
</script>

<template>
  <div
    class="relative rounded-2xl transition-all duration-300 shadow-xl overflow-hidden text-center"
    :class="invitation.bannerImageUrl ? '' : 'p-8 sm:p-12'"
    :style="{
      backgroundColor: palette.colors.primary,
      borderColor: palette.colors.secondary,
      borderWidth: '2px',
      borderStyle: 'solid'
    }"
  >
    <!-- Top Banner Image Component (Flush Top & Sides, 1:5 Horizontal Banner) -->
    <div
      v-if="invitation.bannerImageUrl"
      class="w-full overflow-hidden border-b"
      :style="{ borderColor: `${palette.colors.secondary}40` }"
    >
      <img
        :src="invitation.bannerImageUrl"
        alt="Invitation Banner"
        class="w-full aspect-[5/1] object-cover object-center block"
      />
    </div>

    <!-- Inner Content Area -->
    <div
      class="relative"
      :class="invitation.bannerImageUrl ? 'p-6 sm:p-10' : ''"
    >
      <!-- Inner Stationery Double Border Frame -->
      <div
        class="absolute inset-3 sm:inset-4 rounded-xl pointer-events-none"
        :style="{
          borderColor: `${palette.colors.secondary}45`,
          borderWidth: '1px',
          borderStyle: 'solid'
        }"
      />

      <div class="relative z-10 flex flex-col gap-7 py-4 px-2 sm:px-6">
        <!-- 1. Introductory Line & Headline & Venue -->
      <div class="space-y-4">
        <p
          class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em]"
          :style="{
            color: palette.colors.secondary_text_color,
            fontFamily: typography.subheaderFont
          }"
        >
          {{ invitation.requestLine || 'Together with their families' }}
        </p>

        <h1
          class="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight"
          :style="{
            color: palette.colors.text_color,
            fontFamily: typography.headerFont
          }"
        >
          {{ invitation.eventLabel || 'Alex & Jordan are getting married!' }}
        </h1>

        <!-- Date, Time, and Venue -->
        <div class="mt-6 flex flex-col items-center gap-1">
          <div
            class="text-base sm:text-lg font-semibold uppercase tracking-wider"
            :style="{
              color: palette.colors.text_color,
              fontFamily: typography.subheaderFont
            }"
          >
            {{ formatDateWithWeekday(eventDateInput) || 'Saturday, October 24, 2026' }}
          </div>

          <div
            v-if="invitation.eventTime"
            class="text-sm sm:text-base font-normal"
            :style="{
              color: palette.colors.secondary_text_color,
              fontFamily: typography.bodyFont
            }"
          >
            {{ formatTime(invitation.eventTime) }}
          </div>

          <div
            v-if="invitation.eventVenue"
            class="flex items-center text-sm sm:text-base font-medium pt-2"
            :style="{
              color: palette.colors.text_color,
              fontFamily: typography.subheaderFont
            }"
          >
            <UIcon name="i-lucide-map-pin" class="w-4 h-4 mr-1.5 opacity-70" />
            {{ invitation.eventVenue }}
          </div>
        </div>
      </div>

      <!-- Decorative Divider -->
      <div class="flex items-center justify-center my-1">
        <div
          class="w-16 h-[1.5px]"
          :style="{ backgroundColor: `${palette.colors.secondary}70` }"
        />
        <span
          class="mx-3 text-xs"
          :style="{ color: palette.colors.secondary }"
        >
          ✦
        </span>
        <div
          class="w-16 h-[1.5px]"
          :style="{ backgroundColor: `${palette.colors.secondary}70` }"
        />
      </div>

      <!-- 2. Prominent "RSVP Here" CTA Button (Replacing schedules) -->
      <div class="my-3 flex flex-col items-center justify-center gap-2">
        <a
          v-if="websiteUrl"
          :href="websiteUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="group relative inline-flex items-center justify-center gap-2.5 px-9 py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          :style="{
            backgroundColor: palette.colors.secondary,
            color: palette.colors.secondary_text_color,
            fontFamily: typography.subheaderFont
          }"
        >
          <span>RSVP Here</span>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>

        <button
          v-else
          type="button"
          class="group relative inline-flex items-center justify-center gap-2.5 px-9 py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          :style="{
            backgroundColor: palette.colors.secondary,
            color: palette.colors.secondary_text_color,
            fontFamily: typography.subheaderFont
          }"
          @click="handleRsvpClick"
        >
          <span>RSVP Here</span>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <!-- 3. Footer Area (RSVP Deadline) -->
      <div
        class="mt-2 pt-5 border-t"
        :style="{ borderColor: `${palette.colors.secondary}40` }"
      >
        <div
          v-if="invitation.deadlineText"
          class="prose max-w-md mx-auto text-center text-xs sm:text-sm"
          :style="{
            color: palette.colors.secondary_text_color,
            fontFamily: typography.bodyFont
          }"
          v-html="invitation.deadlineText"
        />

        <div
          v-if="deadlineDateInput"
          class="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full font-medium text-xs sm:text-sm border transition-transform shadow-xs"
          :style="{
            backgroundColor: `${palette.colors.secondary}20`,
            color: palette.colors.secondary_text_color,
            borderColor: `${palette.colors.secondary}60`,
            fontFamily: typography.subheaderFont
          }"
        >
          <UIcon name="i-lucide-calendar" class="w-4 h-4 shrink-0" />
          <span>RSVP Deadline: {{ formatDateWithWeekday(deadlineDateInput) }}</span>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
