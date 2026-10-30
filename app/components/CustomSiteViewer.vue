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
import { useDressCode } from '~/composables/useDressCode'
import { defaultGalleryRecord, useEventGallery } from '~/composables/useEventGallery'
import type { DressCodeRecord, UploadedDressCodeImage } from '~/types/dressCode'
import type { GalleryPhoto, GalleryRecord } from '~/types/gallery'

const props = defineProps<{
  site: CustomSiteViewModel
}>()

useWeddingFonts()

const router = useRouter()
const { getRsvpId } = useGuestRsvpSession()
const { getLocalDressCode } = useDressCode()
const { getLocalGallery } = useEventGallery()
const isMissingRsvpModalOpen = ref(false)
const selectedDressCodeLightboxImage = ref<UploadedDressCodeImage | null>(null)
const isDressCodeLightboxOpen = ref(false)
const selectedGalleryLightboxPhoto = ref<GalleryPhoto | null>(null)
const isGalleryLightboxOpen = ref(false)

const effectiveGallery = computed<GalleryRecord>(() => {
  if (props.site.gallery) {
    return props.site.gallery
  }
  if (typeof window !== 'undefined' && props.site.event) {
    const local = getLocalGallery(props.site.event)
    if (local) return local
  }
  return defaultGalleryRecord
})

const effectiveDressCode = computed<DressCodeRecord | null>(() => {
  if (props.site.dressCode) {
    return props.site.dressCode
  }
  if (typeof window !== 'undefined' && props.site.event) {
    const dc = getLocalDressCode(props.site.event)
    if (dc) {
      return dc
    }
  }
  return null
})

function copyHexToClipboard(hex: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(hex)
  }
}

function handleRsvpButtonClick() {
  const rsvpId = getRsvpId()
  if (rsvpId) {
    router.push(`/rsvp/${encodeURIComponent(rsvpId)}`)
  } else {
    isMissingRsvpModalOpen.value = true
  }
}

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
  'dress-code': { name: 'Color & Dress Code', icon: 'i-lucide-shirt' },
  gallery: { name: 'Gallery', icon: 'i-lucide-images' },
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
  const loc = (location || '').trim() || 'the venue'
  return `https://www.google.com/maps/search/hotels+and+accommodations+near+${encodeURIComponent(loc)}`
}

function getVenueGoogleMapsUrl(
  location?: string,
  coordinates?: { lat?: number | null; lng?: number | null } | null
): string {
  if (coordinates && coordinates.lat != null && coordinates.lng != null && !isNaN(coordinates.lat) && !isNaN(coordinates.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
  }
  const loc = (location || '').trim() || 'the venue'
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
            <!-- Color & Dress Code -->
            <div v-if="
              compId === 'dress-code' &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-dress-code"
              class="flex flex-col justify-center gap-10 px-6 sm:px-10 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">

              <!-- Title & Formality -->
              <div class="space-y-3 max-w-2xl mx-auto">
                <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  Color &amp; Dress Code
                </div>
                <div v-if="effectiveDressCode?.formality"
                  class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-current/20 text-xs sm:text-sm font-semibold tracking-wider uppercase opacity-90 backdrop-blur-xs"
                  :style="{ color: getSectionStyle(index).heading }">
                  <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
                  <span>{{ effectiveDressCode.formality }}</span>
                </div>
              </div>

              <!-- Section 1: Color Palette (Image, Editor, or Both) -->
              <div class="max-w-2xl mx-auto w-full space-y-3.5">
                <div class="flex items-center justify-between text-xs uppercase tracking-wider font-semibold opacity-80"
                  :style="{ color: getSectionStyle(index).heading }">
                  <span class="inline-flex items-center gap-1.5">
                    <UIcon name="i-lucide-swatch-book" class="size-4" />
                    Color Palette
                  </span>
                  <span>{{ (effectiveDressCode?.paletteType === 'image' && effectiveDressCode?.paletteImage) ? 'Pre-made Graphic' : (effectiveDressCode?.presetPaletteName || 'Curated Colors') }}</span>
                </div>

                <!-- Option 1: Pre-made Palette Image -->
                <div v-if="(effectiveDressCode?.paletteType === 'image' || effectiveDressCode?.paletteType === 'both') && effectiveDressCode?.paletteImage"
                  class="w-full">
                  <div class="relative rounded-2xl overflow-hidden border border-black/15 shadow-sm bg-white cursor-pointer group flex items-center justify-center p-2.5 backdrop-blur-xs"
                    @click="selectedDressCodeLightboxImage = { id: 'palette-image-preview', name: 'Color Palette', size: 0, dataUrl: effectiveDressCode.paletteImage, tag: 'Color Swatches', uploadedAt: '' }; isDressCodeLightboxOpen = true">
                    <img :src="effectiveDressCode.paletteImage" alt="Color Palette Graphic"
                      class="w-full max-h-72 object-contain rounded-xl" />
                    <div class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium backdrop-blur-2xs">
                      <UIcon name="i-lucide-zoom-in" class="size-4" />
                      <span>Click to view full palette graphic</span>
                    </div>
                  </div>
                </div>

                <!-- Option 2: 4 Color Swatches -->
                <div v-if="effectiveDressCode?.paletteType === 'editor' || effectiveDressCode?.paletteType === 'both' || !effectiveDressCode?.paletteImage"
                  class="space-y-2">
                  <div v-if="effectiveDressCode?.paletteType === 'both' && effectiveDressCode?.paletteImage"
                    class="text-[11px] font-bold uppercase tracking-wider text-left opacity-75"
                    :style="{ color: getSectionStyle(index).heading }">
                    Color Swatch Breakdown
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div v-for="(hex, key) in (effectiveDressCode?.colors || { primary: '#FDFBF7', secondary: '#D4AF37', accent: '#9CA986', neutral: '#3A4A29' })"
                      :key="key"
                      class="p-3 rounded-xl border border-black/10 shadow-xs flex flex-col justify-between h-22 sm:h-24 transition-transform hover:-translate-y-0.5 cursor-pointer"
                      :style="{ backgroundColor: hex }"
                      @click="copyHexToClipboard(hex)">
                      <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-white w-max">
                        {{ key }}
                      </span>
                      <div class="flex items-center justify-between">
                        <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 text-black">
                          {{ hex }}
                        </span>
                        <UIcon name="i-lucide-copy" class="size-3 text-black/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 2: Attire Guidelines (Gentlemen & Ladies) -->
              <div class="max-w-2xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <!-- Gentlemen -->
                <div class="p-4 sm:p-5 rounded-2xl border border-current/15 backdrop-blur-md shadow-xs flex flex-col justify-between"
                  :style="{ backgroundColor: 'rgba(255, 255, 255, 0.45)', color: getSectionStyle(index).text }">
                  <div class="flex items-center gap-2 mb-2" :style="{ color: getSectionStyle(index).heading }">
                    <div class="size-8 rounded-lg bg-black/5 flex items-center justify-center">
                      <UIcon name="i-lucide-user" class="size-4" />
                    </div>
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider"
                      :style="{ fontFamily: `'${typography.subheaderFont}'` }">
                      Gentlemen / Men's Attire
                    </h3>
                  </div>
                  <p class="text-xs sm:text-sm leading-relaxed opacity-90">
                    {{ effectiveDressCode?.menAttire || 'Dark suit, tuxedo, or formal Barong Tagalog with dress trousers and polished shoes.' }}
                  </p>
                </div>

                <!-- Ladies -->
                <div class="p-4 sm:p-5 rounded-2xl border border-current/15 backdrop-blur-md shadow-xs flex flex-col justify-between"
                  :style="{ backgroundColor: 'rgba(255, 255, 255, 0.45)', color: getSectionStyle(index).text }">
                  <div class="flex items-center gap-2 mb-2" :style="{ color: getSectionStyle(index).heading }">
                    <div class="size-8 rounded-lg bg-black/5 flex items-center justify-center">
                      <UIcon name="i-lucide-heart" class="size-4 text-rose-500" />
                    </div>
                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider"
                      :style="{ fontFamily: `'${typography.subheaderFont}'` }">
                      Ladies / Women's Attire
                    </h3>
                  </div>
                  <p class="text-xs sm:text-sm leading-relaxed opacity-90">
                    {{ effectiveDressCode?.womenAttire || 'Floor-length evening gown, midi cocktail dress, or chic formal attire complementing the palette.' }}
                  </p>
                </div>
              </div>

              <!-- Section 3: Guest Notes & Colors to Avoid -->
              <div class="max-w-2xl mx-auto w-full space-y-3 text-left">
                <!-- Guest Notes -->
                <div v-if="effectiveDressCode?.guestNotes"
                  class="p-4 rounded-xl border border-current/15 backdrop-blur-md shadow-xs"
                  :style="{ backgroundColor: 'rgba(255, 255, 255, 0.45)', color: getSectionStyle(index).text }">
                  <div class="flex items-start gap-2.5">
                    <UIcon name="i-lucide-info" class="size-4 shrink-0 mt-0.5 opacity-80" />
                    <div class="text-xs sm:text-sm leading-relaxed">
                      <span class="font-bold block mb-0.5" :style="{ color: getSectionStyle(index).heading }">Guest Guidance:</span>
                      <span class="opacity-90">{{ effectiveDressCode.guestNotes }}</span>
                    </div>
                  </div>
                </div>

                <!-- Colors to Avoid -->
                <div v-if="effectiveDressCode?.avoidColors"
                  class="p-3.5 rounded-xl border border-red-300 bg-red-50/80 text-red-950 flex items-start gap-2.5 shadow-xs">
                  <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 shrink-0 mt-0.5" />
                  <div class="text-xs sm:text-sm leading-relaxed">
                    <span class="font-bold text-red-900">Colors to Avoid: </span>
                    <span class="text-red-800">{{ effectiveDressCode.avoidColors }}</span>
                  </div>
                </div>
              </div>

              <!-- Section 4: Moodboard Inspiration Gallery -->
              <div v-if="effectiveDressCode?.images && effectiveDressCode.images.length > 0"
                class="max-w-4xl mx-auto w-full space-y-4 pt-4">
                <div class="flex items-center justify-between text-left">
                  <div>
                    <h3 class="text-base sm:text-lg font-bold"
                      :style="{ color: getSectionStyle(index).heading, fontFamily: `'${typography.subheaderFont}'` }">
                      Attire Inspiration &amp; Moodboard
                    </h3>
                    <p class="text-xs opacity-75" :style="{ color: getSectionStyle(index).text }">
                      Visual lookbook celebrating our event style.
                    </p>
                  </div>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full border border-current/20 opacity-80"
                    :style="{ color: getSectionStyle(index).heading }">
                    {{ effectiveDressCode.images.length }} photo{{ effectiveDressCode.images.length > 1 ? 's' : '' }}
                  </span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  <div v-for="img in effectiveDressCode.images" :key="img.id"
                    class="group relative aspect-4/5 rounded-xl overflow-hidden bg-black/5 border border-black/10 shadow-sm cursor-pointer"
                    @click="selectedDressCodeLightboxImage = img; isDressCodeLightboxOpen = true">
                    <img :src="img.dataUrl" :alt="img.name"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div class="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 text-left">
                      <span class="text-[10px] font-bold text-white uppercase tracking-wider">
                        {{ img.tag }}
                      </span>
                      <span class="text-[10px] text-white/80 truncate">
                        {{ img.name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Photo Gallery Component -->
            <div v-if="
              compId === 'gallery' &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-gallery"
              class="flex flex-col justify-center gap-10 px-6 sm:px-10 lg:px-16 pt-28 sm:pt-36 pb-20 scroll-mt-0 transition-colors duration-500 text-center"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <!-- Header -->
              <div class="space-y-3 max-w-3xl mx-auto">
                <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-current/20 text-xs sm:text-sm font-semibold tracking-wider uppercase opacity-90 backdrop-blur-xs"
                  :style="{ color: getSectionStyle(index).heading }">
                  <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
                  <span>Moments</span>
                </div>
                <div class="font-bold text-4xl sm:text-5xl pt-1" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ effectiveGallery.title || 'Captured Moments' }}
                </div>
                <p v-if="effectiveGallery.subtitle" class="text-sm sm:text-base opacity-80 max-w-xl mx-auto leading-relaxed"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ effectiveGallery.subtitle }}
                </p>
              </div>

              <!-- Layout 1: Modern Grid -->
              <div v-if="effectiveGallery.layout === 'grid'"
                class="grid gap-4 sm:gap-6 max-w-6xl mx-auto w-full"
                :class="{
                  'grid-cols-1 sm:grid-cols-2': effectiveGallery.columns === 2,
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': effectiveGallery.columns === 3,
                  'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4': effectiveGallery.columns === 4,
                }">
                <div v-for="photo in effectiveGallery.photos" :key="photo.id"
                  class="group relative aspect-4/3 rounded-2xl overflow-hidden bg-black/5 border border-black/10 shadow-xs cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  @click="selectedGalleryLightboxPhoto = photo; isGalleryLightboxOpen = true">
                  <img :src="photo.url" :alt="photo.caption || 'Event moment'"
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white text-left">
                    <p v-if="photo.caption" class="text-xs sm:text-sm font-medium line-clamp-2">{{ photo.caption }}</p>
                    <span class="text-[10px] text-white/70 inline-flex items-center gap-1 mt-0.5">
                      <UIcon name="i-lucide-zoom-in" class="size-3" /> Click to expand
                    </span>
                  </div>
                </div>
              </div>

              <!-- Layout 2: Editorial Masonry -->
              <div v-else-if="effectiveGallery.layout === 'masonry'"
                class="gap-4 sm:gap-6 max-w-6xl mx-auto w-full space-y-4 sm:space-y-6 text-left"
                :class="{
                  'columns-1 sm:columns-2': effectiveGallery.columns === 2,
                  'columns-1 sm:columns-2 lg:columns-3': effectiveGallery.columns === 3,
                  'columns-2 sm:columns-3 lg:columns-4': effectiveGallery.columns === 4,
                }">
                <div v-for="photo in effectiveGallery.photos" :key="photo.id"
                  class="break-inside-avoid mb-4 sm:mb-6 group relative rounded-2xl overflow-hidden bg-black/5 border border-black/10 shadow-xs cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  @click="selectedGalleryLightboxPhoto = photo; isGalleryLightboxOpen = true">
                  <img :src="photo.url" :alt="photo.caption || 'Event moment'"
                    class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-103" loading="lazy" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                    <p v-if="photo.caption" class="text-xs sm:text-sm font-medium">{{ photo.caption }}</p>
                  </div>
                </div>
              </div>

              <!-- Layout 3: Hero Spotlight -->
              <div v-else-if="effectiveGallery.layout === 'collage'"
                class="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 text-left">
                <div v-if="effectiveGallery.photos[0]"
                  class="lg:col-span-2 group relative aspect-4/3 lg:aspect-auto lg:h-full min-h-80 rounded-2xl overflow-hidden bg-black/5 border border-black/10 shadow-md cursor-pointer transition-all hover:shadow-2xl"
                  @click="selectedGalleryLightboxPhoto = effectiveGallery.photos[0]; isGalleryLightboxOpen = true">
                  <img :src="effectiveGallery.photos[0].url" :alt="effectiveGallery.photos[0].caption || 'Hero photo'"
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                    <p v-if="effectiveGallery.photos[0].caption" class="text-lg sm:text-xl font-bold font-serif">{{ effectiveGallery.photos[0].caption }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <div v-for="photo in effectiveGallery.photos.slice(1, 5)" :key="photo.id"
                    class="group relative aspect-4/3 rounded-xl overflow-hidden bg-black/5 border border-black/10 shadow-xs cursor-pointer transition-all hover:shadow-md"
                    @click="selectedGalleryLightboxPhoto = photo; isGalleryLightboxOpen = true">
                    <img :src="photo.url" :alt="photo.caption || 'Thumbnail photo'"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div class="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                      <p v-if="photo.caption" class="text-xs font-medium truncate">{{ photo.caption }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Layout 4: Filmstrip Carousel -->
              <div v-else-if="effectiveGallery.layout === 'filmstrip'"
                class="max-w-6xl mx-auto w-full flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scrollbar-thin">
                <div v-for="photo in effectiveGallery.photos" :key="photo.id"
                  class="snap-start shrink-0 w-64 sm:w-72 aspect-3/4 group relative rounded-2xl overflow-hidden bg-black/5 border border-black/10 shadow-xs cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 text-left"
                  @click="selectedGalleryLightboxPhoto = photo; isGalleryLightboxOpen = true">
                  <img :src="photo.url" :alt="photo.caption || 'Filmstrip photo'"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                    <p v-if="photo.caption" class="text-xs sm:text-sm font-medium leading-snug">{{ photo.caption }}</p>
                  </div>
                </div>
              </div>

              <!-- Layout 5: Polaroid Keepsakes -->
              <div v-else-if="effectiveGallery.layout === 'polaroid'"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto w-full pt-2">
                <div v-for="(photo, pIdx) in effectiveGallery.photos" :key="photo.id"
                  class="bg-white p-3 sm:p-4 pb-6 rounded-sm shadow-md border border-black/10 transform hover:-translate-y-2 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  :class="pIdx % 3 === 0 ? '-rotate-1 hover:rotate-0' : (pIdx % 3 === 1 ? 'rotate-1 hover:rotate-0' : '-rotate-0.5 hover:rotate-0')"
                  @click="selectedGalleryLightboxPhoto = photo; isGalleryLightboxOpen = true">
                  <div class="aspect-square w-full overflow-hidden bg-stone-100 relative mb-3">
                    <img :src="photo.url" :alt="photo.caption || 'Polaroid moment'"
                      class="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" loading="lazy" />
                  </div>
                  <div class="text-center px-1">
                    <p class="font-serif italic text-xs sm:text-sm text-stone-800 line-clamp-1">
                      {{ photo.caption || photo.name || 'Cherished Memory' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
                <UButton
                  size="lg"
                  class="transition-all duration-300 hover:opacity-80 shadow-md border cursor-pointer"
                  :style="{
                    backgroundColor: getSectionStyle(index).text,
                    color: getSectionStyle(index).bg,
                    borderColor:
                      getSectionStyle(index).bg === 'transparent'
                        ? getSectionStyle(index - 1).text
                        : getSectionStyle(index - 1).bg,
                  }"
                  @click="handleRsvpButtonClick"
                >
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

    <!-- Modal: Personal Invitation Required Fallback -->
    <UModal
      v-model:open="isMissingRsvpModalOpen"
      title="Personal Invitation Required"
    >
      <template #body>
        <div class="py-2 text-center space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <UIcon name="i-lucide-mail" class="w-6 h-6" />
          </div>
          <div class="space-y-1">
            <h4 class="text-base font-semibold text-stone-900 dark:text-stone-100">
              Personalized RSVP Access
            </h4>
            <p class="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
              Your RSVP form is uniquely tied to your personal invitation. Please click the invitation image in the email sent to you to access your personal RSVP form.
            </p>
          </div>
          <div class="pt-2 flex justify-center">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              @click="isMissingRsvpModalOpen = false"
            >
              Understood
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Dress Code Moodboard Lightbox Modal -->
    <UModal v-model:open="isDressCodeLightboxOpen">
      <template #content>
        <div v-if="selectedDressCodeLightboxImage" class="p-4 sm:p-6 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-stone-200">
            <div>
              <h3 class="text-sm font-bold text-stone-900 truncate max-w-sm">
                {{ selectedDressCodeLightboxImage.name }}
              </h3>
              <span class="text-[11px] font-medium text-rose-600">
                {{ selectedDressCodeLightboxImage.tag }}
              </span>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isDressCodeLightboxOpen = false" />
          </div>
          <div class="w-full max-h-[70vh] overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
            <img :src="selectedDressCodeLightboxImage.dataUrl" :alt="selectedDressCodeLightboxImage.name"
              class="max-h-[65vh] w-auto object-contain rounded-lg" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Gallery Lightbox Modal -->
    <UModal v-model:open="isGalleryLightboxOpen">
      <template #content>
        <div v-if="selectedGalleryLightboxPhoto" class="p-4 sm:p-6 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-stone-200">
            <div>
              <h3 class="text-sm font-bold text-stone-900 truncate max-w-sm">
                {{ selectedGalleryLightboxPhoto.caption || selectedGalleryLightboxPhoto.name || 'Photo Showcase' }}
              </h3>
              <span class="text-[11px] font-medium text-rose-600">
                Photo Gallery Lightbox
              </span>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isGalleryLightboxOpen = false" />
          </div>
          <div class="w-full max-h-[75vh] overflow-hidden rounded-xl bg-stone-900 flex items-center justify-center">
            <img :src="selectedGalleryLightboxPhoto.url" :alt="selectedGalleryLightboxPhoto.caption || 'Full photo'"
              class="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>


<style scoped>
.mask-logo {
  -webkit-mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
  mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
}
</style>
