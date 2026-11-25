<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue'
import type { InvitationRecord } from '~/types/invitation'
import type { CustomSiteRecord } from '~/types/customSite'
import type { ColorPalette, TypographySet } from '~/utils/websiteTheme'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'
import { resolveCustomSiteTheme } from '~/utils/websiteTheme'

const props = defineProps<{
  invitation: InvitationRecord
  customSite?: CustomSiteRecord | null
}>()

useWeddingFonts()

const { fetchCustomSitesByEvent } = useCustomSite()
const siteRecord = ref<CustomSiteRecord | null>(props.customSite || null)
const cachedInvitation = ref<any>(null)

const eventId = computed(() => {
  const ev = props.invitation?.event
  if (typeof ev === 'string' && ev.trim()) return ev.trim()
  if (typeof ev === 'object' && ev !== null && '_id' in (ev as any)) {
    return String((ev as any)._id)
  }
  return ''
})

function loadLocalEstablishedInvitation() {
  if (typeof window === 'undefined') return
  try {
    const id = eventId.value
    if (id) {
      const raw = localStorage.getItem(`bpb_invitation_established_${id}`)
      if (raw) {
        cachedInvitation.value = JSON.parse(raw)
        return
      }
    }
    const latestRaw = localStorage.getItem('bpb_invitation_established_latest')
    if (latestRaw) {
      const parsed = JSON.parse(latestRaw)
      if (!id || parsed.eventId === id) {
        cachedInvitation.value = parsed
      }
    }
  } catch {
    // ignore
  }
}

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
  loadLocalEstablishedInvitation()
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
    loadLocalEstablishedInvitation()
  }
)

const theme = computed(() => resolveCustomSiteTheme(siteRecord.value))

const palette = computed<ColorPalette>(() => {
  if (cachedInvitation.value?.palette) {
    return cachedInvitation.value.palette
  }
  const base = theme.value.palette
  if (theme.value.invertColors) {
    return {
      name: `${base.name} (Inverted)`,
      colors: {
        primary: base.colors.text_color,
        text_color: base.colors.primary,
        secondary: base.colors.secondary_text_color,
        secondary_text_color: base.colors.secondary
      }
    }
  }
  return base
})

const typography = computed<TypographySet>(() => {
  if (cachedInvitation.value?.typography) {
    return cachedInvitation.value.typography
  }
  return theme.value.typography
})

const bannerImageUrl = computed(() => {
  return props.invitation?.bannerImageUrl || cachedInvitation.value?.bannerImageUrl || ''
})

const requestLine = computed(() => {
  return props.invitation?.requestLine || cachedInvitation.value?.requestLine || 'Together with their families'
})

const eventLabel = computed(() => {
  return props.invitation?.eventLabel || cachedInvitation.value?.eventLabel || 'Alex & Jordan are getting married!'
})

const eventVenue = computed(() => {
  return props.invitation?.eventVenue || cachedInvitation.value?.eventVenue || ''
})

const eventTime = computed(() => {
  return props.invitation?.eventTime || cachedInvitation.value?.eventTime || ''
})

const eventDateInput = computed(() => {
  return props.invitation?.eventDate || cachedInvitation.value?.eventDate || ''
})
</script>

<template>
  <div
    class="relative rounded-2xl transition-all duration-300 shadow-xl overflow-hidden text-center"
    :class="bannerImageUrl ? '' : 'p-8 sm:p-12'"
    :style="{
      backgroundColor: palette.colors.primary,
      borderColor: palette.colors.secondary,
      borderWidth: '2px',
      borderStyle: 'solid'
    }"
  >
    <!-- Top Banner Image Component (Flush Top & Sides, 1:5 Horizontal Banner) -->
    <div
      v-if="bannerImageUrl"
      class="w-full overflow-hidden border-b"
      :style="{ borderColor: `${palette.colors.secondary}40` }"
    >
      <img
        :src="bannerImageUrl"
        alt="Invitation Banner"
        class="w-full aspect-5/1 object-cover object-center block"
      />
    </div>

    <!-- Inner Content Area -->
    <div
      class="relative"
      :class="bannerImageUrl ? 'p-6 sm:p-10' : ''"
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
          {{ requestLine }}
        </p>

        <h1
          class="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight"
          :style="{
            color: palette.colors.text_color,
            fontFamily: typography.headerFont
          }"
        >
          {{ eventLabel }}
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
            v-if="eventTime"
            class="text-sm sm:text-base font-normal"
            :style="{
              color: palette.colors.secondary_text_color,
              fontFamily: typography.bodyFont
            }"
          >
            {{ formatTime(eventTime) }}
          </div>

          <div
            v-if="eventVenue"
            class="flex items-center text-sm sm:text-base font-medium pt-2"
            :style="{
              color: palette.colors.text_color,
              fontFamily: typography.subheaderFont
            }"
          >
            <UIcon name="i-lucide-map-pin" class="w-4 h-4 mr-1.5 opacity-70" />
            {{ eventVenue }}
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
    </div>
    </div>
  </div>
</template>
