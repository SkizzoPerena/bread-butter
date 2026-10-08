<script lang="ts" setup>
import type { CustomSiteViewModel } from '~/utils/customSiteViewModel'
import {
  getDynamicStyle,
  getGoogleMapsUrl,
  resolvePalette,
} from '~/utils/websiteTheme'
import { formatDateWithWeekday } from '~/utils/invitationDisplay'
import {
  defaultAccommodations,
  getAccommodationImage,
} from '~/data/destinationHotels'

const props = defineProps<{
  site: CustomSiteViewModel
}>()

useWeddingFonts()

const paletteColors = computed(() => props.site.palette?.colors || resolvePalette().colors)
const typography = computed(() => props.site.typography)

const activeComponentId = ref<string>('about-us')
const isMobileMenuOpen = ref(false)

const footerEl = ref<HTMLElement | null>(null)
const footerHeight = ref(132)

const componentMinHeight = computed(() => `calc(100vh - ${footerHeight.value}px)`)

function updateFooterHeight() {
  if (footerEl.value) {
    const rect = footerEl.value.getBoundingClientRect()
    if (rect.height > 0) {
      footerHeight.value = Math.round(rect.height)
    }
  }
}

let footerResizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    updateFooterHeight()
  })
  if (typeof ResizeObserver !== 'undefined') {
    footerResizeObserver = new ResizeObserver(() => {
      updateFooterHeight()
    })
    if (footerEl.value) {
      footerResizeObserver.observe(footerEl.value as unknown as Element)
    }
  }
})

watch(footerEl, (newEl) => {
  if (newEl) {
    nextTick(() => {
      updateFooterHeight()
      footerResizeObserver?.observe(newEl as unknown as Element)
    })
  }
})

onBeforeUnmount(() => {
  footerResizeObserver?.disconnect()
})

const availableComponentsMap: Record<string, { name: string; icon: string }> = {
  rsvp: { name: 'RSVP', icon: 'i-lucide-mail' },
  schedule: { name: 'Schedule', icon: 'i-lucide-calendar' },
  'where-to-stay': { name: 'Where to Stay', icon: 'i-lucide-bed' },
  'wedding-party': { name: 'Wedding Party', icon: 'i-lucide-users' },
  travel: { name: 'Travel', icon: 'i-lucide-plane' },
  'q-and-a': { name: 'Q&A', icon: 'i-lucide-help-circle' },
}

const displayComponents = computed(() => {
  return (props.site.selectedComponents || []).filter((id) => id !== 'diy')
})

const headerNav = computed(() => {
  const aboutUsLink = { id: 'about-us', name: 'Welcome' }
  const dynamicLinks = (props.site.selectedComponents || [])
    .filter((id) => id !== 'diy' && availableComponentsMap[id])
    .map((id) => ({
      id,
      name: availableComponentsMap[id]!.name,
    }))

  const diyLinks = (props.site.diyComponents || []).map((diy) => ({
    id: `diy-${diy.id}`,
    name: diy.name || 'Custom',
  }))

  const allItems = [aboutUsLink, ...dynamicLinks, ...diyLinks]

  return { allItems }
})

function handleHeaderLinkClick(id: string) {
  isMobileMenuOpen.value = false
  if (props.site.singlePageSite) {
    const target = document.getElementById(`section-${id}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (id === 'about-us') {
      const topTarget = document.getElementById('viewer-scroll-top')
      topTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } else {
    activeComponentId.value = id
  }
}

function getSectionStyle(index: number) {
  return getDynamicStyle(
    index,
    paletteColors.value,
    props.site.invertColors,
    props.site.simplifiedColors
  )
}

function formatTime12h(timeStr?: string): string {
  if (!timeStr) return ''
  const [hoursStr, minutesStr] = timeStr.split(':')
  if (!hoursStr || !minutesStr) return timeStr
  let hours = parseInt(hoursStr, 10)
  if (isNaN(hours)) return timeStr
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  return `${hours}:${minutesStr} ${ampm}`
}

function formatScheduleTime(item: { isAllDay?: boolean; startTime?: string; endTime?: string }): string {
  if (item.isAllDay) return 'Whole Day Event'
  if (!item.startTime) return ''
  const start = formatTime12h(item.startTime)
  if (!item.endTime) return start
  const end = formatTime12h(item.endTime)
  return `${start} – ${end}`
}

function formatScheduleDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-')
    if (yearStr && monthStr && dayStr) {
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10) - 1
      const day = parseInt(dayStr, 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    const d = new Date(dateStr)
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
  } catch {
    return dateStr
  }
}

const effectiveViewerPartyMembers = computed(() => {
  return props.site.weddingPartyMembers || []
})

const maidOfHonorMembers = computed(() => {
  return effectiveViewerPartyMembers.value.filter((m) => {
    const r = (m.role || '').toLowerCase().trim()
    if (r.includes('bridesmaid')) return false
    return (
      r.includes('maid of honor') ||
      r.includes('matron of honor') ||
      r.includes('maid') ||
      r.includes('matron') ||
      (r.includes('honor') && !r.includes('best'))
    )
  })
})

const bridesmaidsMembers = computed(() => {
  return effectiveViewerPartyMembers.value.filter((m) => {
    const r = (m.role || '').toLowerCase().trim()
    if (r.includes('maid of honor') || r.includes('matron of honor')) return false
    return (
      r.includes('bridesmaid') ||
      r.includes('bridesmaids') ||
      (r.includes('bride') && !r.includes('maid') && !r.includes('matron'))
    )
  })
})

const bestManMembers = computed(() => {
  return effectiveViewerPartyMembers.value.filter((m) => {
    const r = (m.role || '').toLowerCase().trim()
    if (r.includes('groomsman') || r.includes('groomsmen')) return false
    return r.includes('best man') || r.includes('bestman')
  })
})

const groomsmenMembers = computed(() => {
  return effectiveViewerPartyMembers.value.filter((m) => {
    const r = (m.role || '').toLowerCase().trim()
    if (r.includes('best man') || r.includes('bestman')) return false
    return r.includes('groomsman') || r.includes('groomsmen') || r.includes('groom')
  })
})

const otherWeddingPartyMembers = computed(() => {
  const matchedNames = new Set([
    ...maidOfHonorMembers.value.map((m) => m.name),
    ...bridesmaidsMembers.value.map((m) => m.name),
    ...bestManMembers.value.map((m) => m.name),
    ...groomsmenMembers.value.map((m) => m.name),
  ])
  return effectiveViewerPartyMembers.value.filter((m) => !matchedNames.has(m.name))
})

const effectiveAccommodations = computed(() => {
  const accs = props.site.whereToStayAccommodations
  if (accs && accs.length > 0) {
    const filled = accs.filter(a => a && a.name && a.name.trim())
    if (filled.length > 0) return filled.slice(0, 4)
    return accs.slice(0, 4)
  }
  return defaultAccommodations
})

function getAccommodationGoogleUrl(item: { name: string; link?: string }, location?: string): string {
  if (item.link && item.link.trim()) {
    return item.link.trim()
  }
  const query = [item.name, location, 'hotel reviews'].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function getAreaHotelsGoogleReviewsUrl(
  location?: string,
  coordinates?: { lat?: number | null; lng?: number | null } | null
): string {
  if (coordinates && coordinates.lat != null && coordinates.lng != null && !isNaN(coordinates.lat) && !isNaN(coordinates.lng)) {
    return `https://www.google.com/maps/search/hotels+and+accommodations/@${coordinates.lat},${coordinates.lng},14z`
  }
  const loc = (location || '').trim() || 'wedding venue'
  return `https://www.google.com/maps/search/hotels+and+accommodations+near+${encodeURIComponent(loc)}`
}

function getVenueGoogleMapsUrl(
  location?: string,
  coordinates?: { lat?: number | null; lng?: number | null } | null
): string {
  if (coordinates && coordinates.lat != null && coordinates.lng != null && !isNaN(coordinates.lat) && !isNaN(coordinates.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
  }
  const loc = (location || '').trim() || 'wedding venue'
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`
}
</script>

<template>
  <div class="min-h-screen w-full flex flex-col md:flex-row transition-colors duration-500 relative" :style="{
    backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
    fontFamily: `'${typography.bodyFont}'`,
  }">
    <!-- Navbar matching Website Maker -->
    <UHeader :links="[]" class="absolute top-0 w-full z-50 border-none" :ui="{ container: 'justify-center' }" title=""
      :style="{
        backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      }">
      <template #left />
      <template #right />
      <template #default>
        <!-- Desktop Nav -->
        <div class="hidden md:flex w-full items-center justify-center gap-x-8">
          <UButton v-for="link in headerNav.allItems" :key="link.id" variant="link"
            class="font-semibold text-sm whitespace-nowrap justify-center transition-opacity hover:opacity-80" :class="{
              'underline font-bold': !site.singlePageSite && activeComponentId === link.id,
            }" :style="{
              color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
            }" @click="handleHeaderLinkClick(link.id)">
            {{ link.name }}
          </UButton>
        </div>

        <!-- Mobile Nav Controls (< md) -->
        <div class="flex md:hidden items-center justify-end w-full px-4">
          <UButton icon="i-lucide-menu" variant="ghost" aria-label="Toggle navigation menu" :style="{
            color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
          }" @click="isMobileMenuOpen = !isMobileMenuOpen" />
        </div>
      </template>
    </UHeader>

    <!-- Mobile Navigation Drawer / Slideover -->
    <USlideover v-model:open="isMobileMenuOpen" title="Navigation" :style="{
      backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
      color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
    }">
      <template #body>
        <div class="flex flex-col gap-3 p-6 pt-10">
          <div class="font-bold text-2xl text-center pb-4 border-b border-white/20" :style="{
            color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
            fontFamily: `'${typography.headerFont}'`,
          }">
            {{ site.siteTitle }}
          </div>
          <UButton v-for="item in headerNav.allItems" :key="item.id" variant="ghost"
            class="justify-start text-base py-3 px-4 rounded-lg font-medium" :class="{
              'font-bold bg-black/10': !site.singlePageSite && activeComponentId === item.id,
            }" :style="{
              color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
            }" @click="handleHeaderLinkClick(item.id)">
            {{ item.name }}
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- LEFT SIDE: Fixed in Format 2 Desktop -->
    <div v-if="site.format === 'format2'"
      class="hidden md:flex flex-col gap-8 text-center pt-24 pb-28 sm:pb-36 px-6 relative justify-end w-1/2 shrink-0 h-screen"
      :style="{
        backgroundImage: `url(${site.headerImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }">
      <div class="absolute inset-0 z-0" :style="{
        backgroundImage: `linear-gradient(to bottom, transparent 40%, ${site.invertColors ? paletteColors.secondary_text_color : paletteColors.secondary
          }80)`,
      }" />
      <div class="relative z-10">
        <h1 class="font-medium text-3xl md:text-5xl text-white transition-all duration-300"
          :style="{ fontFamily: `'${typography.headerFont}'` }">
          {{ site.siteTitle }}
        </h1>
      </div>
    </div>

    <!-- MAIN SCROLL AREA -->
    <UScrollArea class="flex-1 w-full h-full z-20 min-h-0 max-h-screen">
      <div id="viewer-scroll-top" class="flex flex-col min-h-full w-full">
        <!-- Hero Banner: Format 1, or Format 2 on mobile -->
        <div v-if="
          (site.format === 'format1' &&
            (site.singlePageSite || activeComponentId === 'about-us')) ||
          (site.format === 'format2' &&
            (site.singlePageSite || activeComponentId === 'about-us'))
        " class="flex flex-col gap-8 text-center pt-24 pb-28 sm:pb-36 px-6 relative justify-end w-full" :class="[
          site.format === 'format2' ? 'md:hidden h-[40vh]' : 'h-screen min-h-screen',
        ]" :style="{
          backgroundImage: `url(${site.headerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: site.format === 'format1' ? '100vh' : undefined,
          minHeight: site.format === 'format1' ? '100vh' : undefined,
        }">
          <div class="absolute inset-0 z-0" :style="{
            backgroundImage: `linear-gradient(to bottom, transparent 40%, ${site.invertColors ? paletteColors.secondary_text_color : paletteColors.secondary
              }80)`,
          }" />
          <div class="relative z-10">
            <div class="space-y-3">
              <h1 class="font-medium text-3xl md:text-5xl text-white transition-all duration-300"
                :style="{ fontFamily: `'${typography.headerFont}'` }">
                {{ site.siteTitle }}
              </h1>
            </div>
          </div>
        </div>

        <div class="w-full flex flex-col flex-1">
          <!-- Story / About Us Section -->
          <div v-if="
            (site.headingContent || site.siteDescription || site.paragraphContent) &&
            (site.singlePageSite || activeComponentId === 'about-us')
          " id="section-about-us"
            class="flex flex-col justify-center mx-10 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0"
            :style="{ minHeight: componentMinHeight }">
            <UContainer v-if="site.headingContent"
              class="font-bold italic text-5xl mb-6 pt-2 sm:pt-4 transition-all duration-300" :style="{
                color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
                fontFamily: `'${typography.subheaderFont}'`,
              }">
              {{ site.headingContent }}
            </UContainer>
            <div v-if="site.siteDescription || site.paragraphContent"
              class="prose max-w-none mx-auto text-center text-xl transition-all duration-300" :style="{
                color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
              }">
              {{ site.siteDescription || site.paragraphContent }}
            </div>
          </div>

          <!-- Dynamic Components -->
          <template v-for="(compId, index) in displayComponents" :key="compId">
            <!-- Q&A -->
            <div v-if="
              compId === 'q-and-a' &&
              site.tidbits.length > 0 &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-q-and-a"
              class="flex flex-col justify-center gap-10 px-6 text-center pt-28 sm:pt-36 pb-20 scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                color: getSectionStyle(index).heading,
                fontFamily: `'${typography.subheaderFont}'`,
              }">
                Q&amp;A
              </div>
              <div v-for="(tidbit, tidbitIndex) in site.tidbits" :key="tidbitIndex" class="flex flex-col gap-3">
                <h3 class="font-bold text-4xl" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ tidbit.heading }}
                </h3>
                <div class="prose max-w-none mx-auto text-center text-xl"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ tidbit.paragraph }}
                </div>
              </div>
            </div>

            <!-- Schedule -->
            <div v-if="
              compId === 'schedule' &&
              site.scheduleItems.length > 0 &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-schedule"
              class="flex flex-col justify-center gap-10 px-6 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                color: getSectionStyle(index).heading,
                fontFamily: `'${typography.subheaderFont}'`,
              }">
                Schedule
              </div>
              <div v-for="(item, itemIndex) in site.scheduleItems" :key="itemIndex" class="flex flex-col gap-3">
                <!-- Date & Time badge -->
                <div v-if="item.date || item.startTime || item.isAllDay"
                  class="flex flex-wrap items-center justify-center gap-3 text-sm font-medium tracking-wide uppercase opacity-85"
                  :style="{ color: getSectionStyle(index).heading }">
                  <span v-if="item.date" class="inline-flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar" class="w-4 h-4" />
                    {{ formatScheduleDate(item.date) }}
                  </span>
                  <span v-if="item.date && (item.startTime || item.isAllDay)" class="opacity-40">&bull;</span>
                  <span v-if="item.isAllDay"
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-current text-xs">
                    <UIcon name="i-lucide-sun" class="w-3.5 h-3.5" />
                    Whole Day Event
                  </span>
                  <span v-else-if="item.startTime" class="inline-flex items-center gap-1.5">
                    <UIcon name="i-lucide-clock" class="w-4 h-4" />
                    {{ formatScheduleTime(item) }}
                  </span>
                </div>

                <h3 class="font-bold text-4xl" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ item.title }}
                </h3>
                <div class="prose max-w-none mx-auto text-center text-xl"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ item.description }}
                </div>
                <div v-if="item.location" class="font-semibold italic mt-2 text-lg"
                  :style="{ color: getSectionStyle(index).heading }">
                  <UIcon name="i-lucide-map-pin" class="mr-1 inline-block align-middle" />
                  {{ item.location }}
                </div>
              </div>
            </div>

            <!-- RSVP -->
            <div v-if="compId === 'rsvp' && (site.singlePageSite || activeComponentId === compId)" id="section-rsvp"
              class="flex flex-col justify-center gap-10 px-6 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                color: getSectionStyle(index).heading,
                fontFamily: `'${typography.subheaderFont}'`,
              }">
                RSVP
              </div>
              <div class="flex flex-col items-center gap-5 text-sm" :style="{ color: getSectionStyle(index).text }">
                <div v-if="site.rsvpDeadlineDate" class="font-semibold uppercase tracking-widest text-xs opacity-80">
                  <UIcon name="i-lucide-calendar" class="w-4 h-4 inline-block align-text-bottom mr-1" />
                  RSVP by {{ formatDateWithWeekday(site.rsvpDeadlineDate) }}
                </div>
                <UButton size="lg" class="transition-all duration-300 hover:opacity-80 shadow-md border" :style="{
                  backgroundColor: getSectionStyle(index).text,
                  color: getSectionStyle(index).bg,
                  borderColor:
                    getSectionStyle(index).bg === 'transparent'
                      ? getSectionStyle(index - 1).text
                      : getSectionStyle(index - 1).bg,
                }">
                  RSVP Here
                </UButton>
              </div>
            </div>

            <!-- Where to Stay -->
            <div v-if="
              compId === 'where-to-stay' &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-where-to-stay"
              class="flex flex-col justify-center gap-8 px-6 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="space-y-2">
                <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  Where to Stay
                </div>
                <p v-if="site.whereToStayLocation"
                  class="text-sm sm:text-base opacity-75 inline-flex items-center gap-1.5 flex-wrap justify-center"
                  :style="{ color: getSectionStyle(index).text }">
                  <UIcon name="i-lucide-map-pin" class="w-4 h-4 shrink-0" />
                  <span>{{ site.whereToStayLocation }}</span>
                  <a v-if="site.whereToStayLatitude && site.whereToStayLongitude"
                    :href="getVenueGoogleMapsUrl(site.whereToStayLocation, { lat: site.whereToStayLatitude, lng: site.whereToStayLongitude })"
                    target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-current/20 hover:border-current/50 opacity-80 hover:opacity-100 transition-opacity ml-1"
                    title="View pin on Google Maps">
                    <span>{{ Number(site.whereToStayLatitude).toFixed(4) }}°, {{
                      Number(site.whereToStayLongitude).toFixed(4) }}°</span>
                    <UIcon name="i-lucide-external-link" class="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div v-if="site.whereToStayLocation"
                class="relative w-full h-80 max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg border"
                :style="{ borderColor: getSectionStyle(index).text }">
                <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"
                  :src="getGoogleMapsUrl(site.whereToStayLocation, { lat: site.whereToStayLatitude, lng: site.whereToStayLongitude })"
                  style="filter: grayscale(1) contrast(1)" />
                <div class="absolute inset-0 pointer-events-none opacity-60" :style="{
                  backgroundColor: getSectionStyle(index).text,
                  mixBlendMode: 'color',
                }" />
              </div>

              <!-- 4 Suggested Accommodations Buttons (Google Reviews) -->
              <div class="max-w-4xl mx-auto w-full pt-4 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left">
                  <div>
                    <h3 class="text-xl sm:text-2xl font-bold" :style="{
                      color: getSectionStyle(index).heading,
                      fontFamily: `'${typography.subheaderFont}'`,
                    }">
                      Recommended Accommodations
                    </h3>
                    <p class="text-xs sm:text-sm opacity-75" :style="{ color: getSectionStyle(index).text }">
                      Highly-rated stays near the area. Click any button to view Google Reviews.
                    </p>
                  </div>
                  <a :href="getAreaHotelsGoogleReviewsUrl(site.whereToStayLocation, { lat: site.whereToStayLatitude, lng: site.whereToStayLongitude })"
                    target="_blank" rel="noopener noreferrer"
                    class="text-xs font-semibold underline underline-offset-4 opacity-80 hover:opacity-100 inline-flex items-center gap-1 shrink-0"
                    :style="{ color: getSectionStyle(index).heading }">
                    Browse All Stays on Google
                    <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
                  </a>
                </div>

                <!-- 4 Accommodation UPageCard Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <UPageCard v-for="(hotel, slotIdx) in effectiveAccommodations.slice(0, 4)" :key="hotel.id || slotIdx"
                    :to="getAccommodationGoogleUrl(hotel, site.whereToStayLocation)" target="_blank"
                    rel="noopener noreferrer"
                    class="group overflow-hidden rounded-2xl border border-current/15 hover:border-current/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col backdrop-blur-md"
                    :style="{
                      backgroundColor: getSectionStyle(index).bg,
                      color: getSectionStyle(index).text,
                    }" :ui="{ container: 'p-0 flex flex-col h-full ring-0' }">
                    <!-- Venue Image Section -->
                    <div class="relative w-full h-44 sm:h-48 overflow-hidden bg-black/5">
                      <img :src="getAccommodationImage(hotel)" :alt="hotel.name || 'Venue Accommodation'"
                        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy" />
                      <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent"></div>

                      <!-- Star Rating Badge -->
                      <div v-if="hotel.rating"
                        class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-amber-600 shadow-md backdrop-blur-xs flex items-center gap-1">
                        <UIcon name="i-lucide-star" class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{{ hotel.rating }}</span>
                      </div>

                      <!-- Distance / Location Badge -->
                      <div
                        class="absolute bottom-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/65 text-white backdrop-blur-xs flex items-center gap-1">
                        <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 text-white/90" />
                        <span>{{ hotel.distance || 'Near venue' }}</span>
                      </div>
                    </div>

                    <!-- Venue Content Body -->
                    <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 text-left">
                      <div>
                        <h4 class="font-bold text-base sm:text-lg leading-snug group-hover:underline line-clamp-1"
                          :style="{
                            color: getSectionStyle(index).heading,
                            fontFamily: `'${typography.subheaderFont}'`,
                          }">
                          {{ hotel.name || `Accommodation Slot ${slotIdx + 1}` }}
                        </h4>
                        <p v-if="hotel.description" class="text-xs sm:text-sm opacity-80 line-clamp-2 mt-1.5"
                          :style="{ color: getSectionStyle(index).text }">
                          {{ hotel.description }}
                        </p>
                      </div>

                      <div
                        class="flex items-center justify-between pt-2.5 border-t border-current/10 text-xs font-semibold"
                        :style="{ color: getSectionStyle(index).heading }">
                        <span class="inline-flex items-center gap-1.5 opacity-85 group-hover:opacity-100">
                          View on Google Maps & Reviews
                        </span>
                        <UIcon name="i-lucide-external-link"
                          class="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </UPageCard>
                </div>
              </div>
            </div>

            <!-- Travel -->
            <div v-if="compId === 'travel' && (site.singlePageSite || activeComponentId === compId)" id="section-travel"
              class="flex flex-col justify-center gap-10 px-6 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                color: getSectionStyle(index).heading,
                fontFamily: `'${typography.subheaderFont}'`,
              }">
                Travel
              </div>
            </div>

            <!-- Wedding Party -->
            <div v-if="
              compId === 'wedding-party' &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-wedding-party"
              class="flex flex-col justify-center gap-10 px-6 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <!-- Title & Subtitle -->
              <div class="space-y-3 max-w-2xl mx-auto">
                <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  Wedding Party
                </div>
                <p v-if="site.weddingPartyIntro" class="text-base sm:text-lg leading-relaxed opacity-80"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ site.weddingPartyIntro }}
                </p>
              </div>

              <!-- 2 Columns: Maid of Honor & Bridesmaids on Left, Best Man & Groomsmen on Right -->
              <div class="max-w-2xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-14 pt-2">
                <!-- Left Column: Maid of Honor + Bridesmaids -->
                <div class="flex flex-col gap-8 text-center">
                  <!-- Maid of Honor -->
                  <div v-if="maidOfHonorMembers.length > 0" class="space-y-2">
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80" :style="{
                      color: getSectionStyle(index).heading,
                      fontFamily: `'${typography.subheaderFont}'`,
                    }">
                      Maid of Honor
                    </h3>
                    <div class="space-y-1.5">
                      <p v-for="member in maidOfHonorMembers" :key="member.id || member.name"
                        class="text-base sm:text-lg font-medium" :style="{
                          color: getSectionStyle(index).text,
                          fontFamily: `'${typography.bodyFont}'`,
                        }">
                        {{ member.name }}
                      </p>
                    </div>
                  </div>

                  <!-- Bridesmaids -->
                  <div v-if="bridesmaidsMembers.length > 0" class="space-y-2">
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80" :style="{
                      color: getSectionStyle(index).heading,
                      fontFamily: `'${typography.subheaderFont}'`,
                    }">
                      Bridesmaids
                    </h3>
                    <div class="space-y-1.5">
                      <p v-for="member in bridesmaidsMembers" :key="member.id || member.name"
                        class="text-base sm:text-lg font-medium" :style="{
                          color: getSectionStyle(index).text,
                          fontFamily: `'${typography.bodyFont}'`,
                        }">
                        {{ member.name }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Right Column: Best Man + Groomsmen -->
                <div class="flex flex-col gap-8 text-center">
                  <!-- Best Man -->
                  <div v-if="bestManMembers.length > 0" class="space-y-2">
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80" :style="{
                      color: getSectionStyle(index).heading,
                      fontFamily: `'${typography.subheaderFont}'`,
                    }">
                      Best Man
                    </h3>
                    <div class="space-y-1.5">
                      <p v-for="member in bestManMembers" :key="member.id || member.name"
                        class="text-base sm:text-lg font-medium" :style="{
                          color: getSectionStyle(index).text,
                          fontFamily: `'${typography.bodyFont}'`,
                        }">
                        {{ member.name }}
                      </p>
                    </div>
                  </div>

                  <!-- Groomsmen -->
                  <div v-if="groomsmenMembers.length > 0" class="space-y-2">
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80" :style="{
                      color: getSectionStyle(index).heading,
                      fontFamily: `'${typography.subheaderFont}'`,
                    }">
                      Groomsmen
                    </h3>
                    <div class="space-y-1.5">
                      <p v-for="member in groomsmenMembers" :key="member.id || member.name"
                        class="text-base sm:text-lg font-medium" :style="{
                          color: getSectionStyle(index).text,
                          fontFamily: `'${typography.bodyFont}'`,
                        }">
                        {{ member.name }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Other Entourage Members (if any exist) -->
              <div v-if="otherWeddingPartyMembers.length > 0"
                class="max-w-xl mx-auto w-full pt-4 space-y-6 text-center">
                <div class="space-y-2">
                  <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80" :style="{
                    color: getSectionStyle(index).heading,
                    fontFamily: `'${typography.subheaderFont}'`,
                  }">
                    Entourage
                  </h3>
                  <div class="space-y-1.5">
                    <p v-for="member in otherWeddingPartyMembers" :key="member.id || member.name"
                      class="text-base sm:text-lg font-medium" :style="{
                        color: getSectionStyle(index).text,
                        fontFamily: `'${typography.bodyFont}'`,
                      }">
                      {{ member.name }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- DIY Components -->
          <template v-for="(diy, diyIndex) in site.diyComponents" :key="`diy-${diy.id}`">
            <div v-if="site.singlePageSite || activeComponentId === `diy-${diy.id}`" :id="`section-diy-${diy.id}`"
              class="flex flex-col justify-center gap-10 px-6 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(displayComponents.length + diyIndex).bg,
              }">
              <h2 class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                color: getSectionStyle(displayComponents.length + diyIndex).heading,
                fontFamily: `'${typography.subheaderFont}'`,
              }">
                {{ diy.header }}
              </h2>
              <div class="prose max-w-none mx-auto text-center text-xl" :style="{
                color: getSectionStyle(displayComponents.length + diyIndex).text,
              }">
                {{ diy.description }}
              </div>
            </div>
          </template>

          <!-- Thank You / Ending Section -->
          <div v-if="site.singlePageSite || activeComponentId === 'about-us'"
            class="flex flex-col justify-center gap-6 px-6 pt-28 sm:pt-36 pb-20 text-center transition-colors duration-500"
            :style="{
              minHeight: componentMinHeight,
              backgroundColor: getSectionStyle(
                displayComponents.length + (site.diyComponents?.length || 0)
              ).bg,
            }">
            <h2 class="font-bold text-5xl pt-2 sm:pt-4" :style="{
              color: getSectionStyle(
                displayComponents.length + (site.diyComponents?.length || 0)
              ).heading,
              fontFamily: `'${typography.headerFont}'`,
            }">
              {{ site.endingTitle }}
            </h2>
            <p class="prose max-w-none mx-auto text-center text-2xl" :style="{
              color: getSectionStyle(
                displayComponents.length + (site.diyComponents?.length || 0)
              ).text,
            }">
              {{ site.endingMessage }}
            </p>
          </div>

          <!-- Footer Branding -->
          <div ref="footerEl"
            class="py-10 flex flex-col items-center justify-center gap-3 transition-colors duration-500 shrink-0"
            :style="{
              backgroundColor: site.invertColors ? paletteColors.primary : paletteColors.text_color,
              borderColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
            }">
            <p class="text-xs font-semibold uppercase tracking-widest opacity-60" :style="{
              color: site.invertColors ? paletteColors.text_color : paletteColors.primary,
            }">
              This website was made with
            </p>
            <a
              href="https://bread-plus-butter.com"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full flex justify-center cursor-pointer transition-opacity hover:opacity-100 focus:outline-none"
              aria-label="Bread + Butter"
            >
              <div class="h-6 w-full opacity-80 hover:opacity-100 transition-opacity mask-logo" :style="{
                backgroundColor: site.invertColors
                  ? paletteColors.text_color
                  : paletteColors.primary,
              }" role="img" aria-label="Bread + Butter" />
            </a>
          </div>
        </div>
      </div>
    </UScrollArea>
  </div>
</template>

<style scoped>
.mask-logo {
  -webkit-mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
  mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
}
</style>
