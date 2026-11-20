<script lang="ts" setup>
import type { CustomSiteViewModel } from '~/utils/customSiteViewModel'
import {
  getDynamicStyle,
  getGoogleMapsUrl,
  resolvePalette,
} from '~/utils/websiteTheme'
import { formatDateWithWeekday } from '~/utils/invitationDisplay'
import {
  getVenueShortName,
  formatCleanDistance,
  formatCleanRating,
  getDescriptionClampStyle,
} from '~/data/destinationHotels'
import { useDressCode } from '~/composables/useDressCode'
import { defaultGalleryRecord, useEventGallery } from '~/composables/useEventGallery'
import type { DressCodeRecord, UploadedDressCodeImage } from '~/types/dressCode'
import type { GalleryPhoto, GalleryRecord } from '~/types/gallery'
import { GuestRsvpError } from '~/types/rsvp'

const props = defineProps<{
  site: CustomSiteViewModel
}>()

useWeddingFonts()

const router = useRouter()
const route = useRoute()
const { getRsvpId, setRsvpId } = useGuestRsvpSession()
const { lookupRsvpForSite } = useGuestRsvp()
const { getSiteAccessToken } = useSiteAccessCookie()
const { getLocalDressCode } = useDressCode()
const { getLocalGallery } = useEventGallery()
// The public site response carries only the playlists the host chose to show.
const websitePlaylists = computed(() => props.site.playlists ?? [])
const isMissingRsvpModalOpen = ref(false)
const rsvpLookupEmail = ref('')
const rsvpLookupError = ref('')
const isLookingUpRsvp = ref(false)
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
    rsvpLookupError.value = ''
    isMissingRsvpModalOpen.value = true
  }
}

async function findRsvpByEmail() {
  const siteName = typeof route.params.siteName === 'string' ? route.params.siteName : ''
  rsvpLookupError.value = ''
  isLookingUpRsvp.value = true
  try {
    const rsvpId = await lookupRsvpForSite(
      siteName,
      rsvpLookupEmail.value,
      getSiteAccessToken(siteName),
    )
    setRsvpId(rsvpId)
    isMissingRsvpModalOpen.value = false
    await router.push(`/rsvp/${encodeURIComponent(rsvpId)}`)
  } catch (error) {
    rsvpLookupError.value = error instanceof GuestRsvpError && error.notFound
      ? "We couldn't find an invitation for that email. Use the address your invitation was sent to, or ask your host."
      : 'Something went wrong. Please wait a moment and try again.'
  } finally {
    isLookingUpRsvp.value = false
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
const isNavbarVisible = ref(false)
const scrollAreaRef = ref<{ $el?: HTMLElement } | null>(null)
let titleIntersectionObserver: IntersectionObserver | null = null

function getScrollContainers(): HTMLElement[] {
  if (typeof document === 'undefined') return []
  const containers: HTMLElement[] = []

  const root = document.getElementById('viewer-scroll-top')?.closest('[data-slot="root"]') as HTMLElement | null
  if (root && !containers.includes(root)) containers.push(root)

  const parent = document.getElementById('viewer-scroll-top')?.parentElement as HTMLElement | null
  if (parent && !containers.includes(parent)) containers.push(parent)

  const scrollAreaEl = (scrollAreaRef.value?.$el || (scrollAreaRef.value as unknown as HTMLElement)) as HTMLElement | undefined
  if (scrollAreaEl && scrollAreaEl.nodeType === 1 && !containers.includes(scrollAreaEl)) {
    containers.push(scrollAreaEl)
  }

  return containers
}

function checkNavbarVisibility() {
  if (typeof document === 'undefined') return

  // For non-mobile view, keep navbar visible throughout the whole page
  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    isNavbarVisible.value = true
    return
  }

  if (!props.site.singlePageSite && activeComponentId.value !== 'about-us') {
    isNavbarVisible.value = true
    return
  }

  // 1. Check title element position relative to viewport
  const titleEl = document.getElementById('viewer-hero-title')
  if (titleEl) {
    const rect = titleEl.getBoundingClientRect()
    if (rect.height > 0) {
      // Once the bottom of the title element has scrolled above 80px from top of viewport, show navbar
      isNavbarVisible.value = rect.bottom <= 80
      return
    }
  }

  // 2. Fallback: check any scroll container offset or window scroll
  const containers = getScrollContainers()
  const winScroll = typeof window !== 'undefined'
    ? (window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0)
    : 0
  const containerScrolls = containers.map((c) => c.scrollTop || 0)
  const maxScroll = Math.max(winScroll, ...containerScrolls)

  // Once scrolled past 120px, show navbar
  isNavbarVisible.value = maxScroll > 120
}

function setupTitleObserver() {
  if (typeof IntersectionObserver === 'undefined') return
  titleIntersectionObserver?.disconnect()

  const titleEl = document.getElementById('viewer-hero-title')
  if (!titleEl) return

  titleIntersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          isNavbarVisible.value = false
        } else if (entry.boundingClientRect.top < 120) {
          isNavbarVisible.value = true
        }
      }
    },
    { threshold: [0, 1] }
  )

  titleIntersectionObserver.observe(titleEl)
}

function handleScrollEvent() {
  checkNavbarVisibility()
}

onMounted(() => {
  nextTick(() => {
    updateFooterHeight()

    // 1. Capture scroll events at window and document level (catches all nested element scrolls)
    window.addEventListener('scroll', handleScrollEvent, { capture: true, passive: true })
    document.addEventListener('scroll', handleScrollEvent, { capture: true, passive: true })
    window.addEventListener('resize', handleScrollEvent, { passive: true })

    // 2. Direct listeners on scroll containers
    const containers = getScrollContainers()
    for (const c of containers) {
      c.addEventListener('scroll', handleScrollEvent, { passive: true })
    }

    // 3. Native IntersectionObserver on title
    setupTitleObserver()

    checkNavbarVisibility()
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

watch(activeComponentId, () => {
  nextTick(() => {
    setupTitleObserver()
    checkNavbarVisibility()
  })
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
  titleIntersectionObserver?.disconnect()
  window.removeEventListener('scroll', handleScrollEvent, { capture: true })
  document.removeEventListener('scroll', handleScrollEvent, { capture: true })
  window.removeEventListener('resize', handleScrollEvent)

  const containers = getScrollContainers()
  for (const c of containers) {
    c.removeEventListener('scroll', handleScrollEvent)
  }
})

const availableComponentsMap: Record<string, { name: string; icon: string }> = {
  rsvp: { name: 'RSVP', icon: 'i-lucide-mail' },
  'dress-code': { name: 'Colors & Dress Code', icon: 'i-lucide-shirt' },
  gallery: { name: 'Gallery', icon: 'i-lucide-images' },
  schedule: { name: 'Schedule', icon: 'i-lucide-calendar' },
  'where-to-stay': { name: 'Where to Stay', icon: 'i-lucide-bed' },
  'wedding-party': { name: 'Wedding Party', icon: 'i-lucide-users' },
  travel: { name: 'Travel', icon: 'i-lucide-plane' },
  'q-and-a': { name: 'Q&A', icon: 'i-lucide-help-circle' },
  gifts: { name: 'Gifts', icon: 'i-lucide-gift' },
  playlist: { name: 'Playlists', icon: 'i-lucide-music' },
}

const displayComponents = computed(() => {
  return (props.site.selectedComponents || []).filter((id) => id !== 'rsvp')
})

const headerNav = computed(() => {
  const aboutUsLink = { id: 'about-us', name: 'Welcome' }
  const middleLinks: Array<{ id: string; name: string }> = []

  const selected = props.site.selectedComponents || []
  for (const id of selected) {
    if (id === 'rsvp' || id === 'diy') continue
    if (availableComponentsMap[id]) {
      middleLinks.push({
        id,
        name: availableComponentsMap[id]!.name,
      })
    }
  }

  const rsvpLink = { id: 'rsvp', name: 'RSVP' }

  const allItems = [aboutUsLink, ...middleLinks, rsvpLink]

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

const weddingPartyColumns = computed(() => [
  {
    key: 'bride-side',
    groups: [
      { role: 'Maid of Honor', members: maidOfHonorMembers.value },
      { role: 'Bridesmaids', members: bridesmaidsMembers.value },
    ].filter((g) => g.members.length > 0),
  },
  {
    key: 'groom-side',
    groups: [
      { role: 'Best Man', members: bestManMembers.value },
      { role: 'Groomsmen', members: groomsmenMembers.value },
    ].filter((g) => g.members.length > 0),
  },
])

const effectiveAccommodations = computed(() => {
  const accs = props.site.whereToStayAccommodations
  if (accs && accs.length > 0) {
    const filled = accs.filter(a => a && a.name && a.name.trim())
    if (filled.length > 0) return filled.slice(0, 4)
    return accs.slice(0, 4)
  }
  return []
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
  <div class="min-h-screen w-full flex flex-col md:flex-row transition-colors duration-500 relative paper-textured-bg" :style="{
    backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
    fontFamily: `'${typography.bodyFont}'`,
  }">
    <!-- Navbar matching Website Maker -->
    <header class="fixed top-0 left-0 right-0 w-full z-50 border-none transition-all duration-300 ease-in-out h-14 sm:h-16 flex items-center px-4"
      :class="isNavbarVisible
        ? 'translate-y-0 opacity-100 shadow-md pointer-events-auto'
        : '-translate-y-full opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:shadow-md md:pointer-events-auto'"
      :style="{
        backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      }">
      <!-- Desktop Nav (md and up) -->
      <nav class="hidden md:flex w-full items-center justify-center gap-x-8">
        <UButton v-for="link in headerNav.allItems" :key="link.id" variant="link"
          class="font-semibold text-sm whitespace-nowrap justify-center transition-opacity hover:opacity-80" :class="{
            'underline font-bold': !site.singlePageSite && activeComponentId === link.id,
          }" :style="{
            color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
          }" @click="handleHeaderLinkClick(link.id)">
          {{ link.name }}
        </UButton>
      </nav>

      <!-- Mobile Nav (< md) -->
      <div class="flex md:hidden items-center justify-between w-full relative h-full">
        <!-- Expanding menu button on the left -->
        <div class="flex items-center shrink-0 z-10">
          <UButton icon="i-lucide-menu" variant="ghost" size="md" aria-label="Toggle navigation menu" :style="{
            color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
          }" @click="isMobileMenuOpen = !isMobileMenuOpen" />
        </div>

        <!-- Event title in the middle -->
        <div class="absolute inset-x-12 inset-y-0 flex items-center justify-center text-center pointer-events-none">
          <span class="text-xs sm:text-[13px] font-semibold truncate px-1" :style="{
            color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
            fontFamily: `'${typography.headerFont}'`,
          }">
            {{ site.siteTitle }}
          </span>
        </div>

        <!-- Spacer balancing the left button -->
        <div class="size-8 shrink-0 pointer-events-none" aria-hidden="true" />
      </div>
    </header>

    <!-- Mobile Navigation Drawer / Slideover -->
    <USlideover
      v-model:open="isMobileMenuOpen"
      side="left"
      :ui="{
        content: 'paper-textured-bg !shadow-2xl ring-0 border-0',
      }"
      :style="{
        backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
      }"
    >
      <template #content="{ close }">
        <div
          class="h-full w-full flex flex-col paper-textured-bg transition-colors duration-500 overflow-y-auto"
          :style="{
            backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
            color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
            fontFamily: `'${typography.bodyFont}'`,
          }"
        >
          <!-- Header / Close -->
          <div class="flex items-center justify-between p-6 pb-4 border-b border-current/15">
            <div
              class="font-bold text-lg sm:text-xl truncate pr-2"
              :style="{
                color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
                fontFamily: `'${typography.headerFont}'`,
              }"
            >
              {{ site.siteTitle }}
            </div>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              aria-label="Close menu"
              class="hover:opacity-75 shrink-0"
              :style="{
                color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
              }"
              @click="close"
            />
          </div>

          <!-- Navigation Links -->
          <div class="flex flex-col gap-2 p-6">
            <UButton
              v-for="item in headerNav.allItems"
              :key="item.id"
              variant="ghost"
              class="justify-start text-base py-3 px-4 rounded-lg font-medium transition-all"
              :class="{
                'font-bold bg-current/10': !site.singlePageSite && activeComponentId === item.id,
              }"
              :style="{
                color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
                fontFamily: `'${typography.bodyFont}'`,
              }"
              @click="handleHeaderLinkClick(item.id); close()"
            >
              {{ item.name }}
            </UButton>
          </div>
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
        <h1 id="viewer-hero-title-f2" class="font-medium text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-white transition-all duration-300"
          :style="{ fontFamily: `'${typography.headerFont}'` }">
          {{ site.siteTitle }}
        </h1>
      </div>
    </div>

    <!-- MAIN SCROLL AREA -->
    <UScrollArea ref="scrollAreaRef" class="flex-1 w-full h-full z-20 min-h-0 max-h-screen">
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
              <h1 id="viewer-hero-title" class="font-medium text-2xl sm:text-3xl md:text-5xl text-white transition-all duration-300"
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
            class="viewer-section"
            :style="{
              minHeight: componentMinHeight,
              backgroundColor: site.invertColors ? paletteColors.text_color : paletteColors.primary,
            }">
            <div class="viewer-section-header">
              <UContainer v-if="site.headingContent"
                class="viewer-section-title italic" :style="{
                  color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                {{ site.headingContent }}
              </UContainer>
              <div v-if="site.headingContent" class="viewer-divider" aria-hidden="true">
                <div class="viewer-divider-line" :style="{ backgroundColor: site.invertColors ? paletteColors.primary : paletteColors.text_color }" />
                <div class="viewer-divider-diamond" :style="{ backgroundColor: site.invertColors ? paletteColors.primary : paletteColors.text_color }" />
                <div class="viewer-divider-line" :style="{ backgroundColor: site.invertColors ? paletteColors.primary : paletteColors.text_color }" />
              </div>
              <div v-if="site.siteDescription || site.paragraphContent"
                class="viewer-section-prose" :style="{
                  color: site.invertColors ? paletteColors.primary : paletteColors.text_color,
                }">
                {{ site.siteDescription || site.paragraphContent }}
              </div>
            </div>
          </div>

          <!-- Dynamic Components -->
          <template v-for="(compId, index) in displayComponents" :key="compId">
            <!-- Colors & Dress Code -->
            <div v-if="
              compId === 'dress-code' &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-dress-code"
              class="viewer-section"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">

              <!-- Title & Formality -->
              <div class="viewer-section-header">
                <div class="viewer-section-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  Colors &amp; Dress Code
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
                <div v-if="effectiveDressCode?.formality"
                  class="viewer-pill"
                  :style="{ color: getSectionStyle(index).heading }">
                  <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
                  <span>{{ effectiveDressCode.formality }}</span>
                </div>
              </div>

              <!-- Section 1: Color Palette (Image, Editor, or Both) -->
              <div class="max-w-5xl mx-auto w-full space-y-3.5">
                <div class="flex items-center justify-between text-xs uppercase tracking-wider font-semibold opacity-80"
                  :style="{ color: getSectionStyle(index).heading }">
                  <span class="inline-flex items-center gap-1.5">
                    <UIcon name="i-lucide-swatch-book" class="size-4" />
                    Color Palette
                  </span>
                  <span>{{ (effectiveDressCode?.paletteType === 'image' && effectiveDressCode?.paletteImage) ? 'Pre-made Graphic' : (effectiveDressCode?.presetPaletteName || 'Curated Colors') }}</span>
                </div>

                <!-- Option: Both Image & Swatches in a Single Row -->
                <div v-if="effectiveDressCode?.paletteType === 'both' && effectiveDressCode?.paletteImage"
                  class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
                  <!-- Col-span-2: Color Palette Image -->
                  <div class="sm:col-span-2 h-full">
                    <div class="relative h-full min-h-64 sm:min-h-72 rounded-2xl overflow-hidden border border-current/20 shadow-xs cursor-pointer group flex items-center justify-center p-3 backdrop-blur-md"
                      :style="{
                        backgroundColor: getSectionStyle(index).text + '0D',
                        borderColor: getSectionStyle(index).text + '25',
                      }"
                      @click="selectedDressCodeLightboxImage = { id: 'palette-image-preview', name: 'Color Palette', size: 0, dataUrl: effectiveDressCode.paletteImage, tag: 'Color Swatches', uploadedAt: '' }; isDressCodeLightboxOpen = true">
                      <img :src="effectiveDressCode.paletteImage" alt="Color Palette Graphic"
                        class="w-full h-full max-h-72 object-contain rounded-xl" />
                      <div class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium backdrop-blur-2xs">
                        <UIcon name="i-lucide-zoom-in" class="size-4" />
                        <span>Click to view full palette graphic</span>
                      </div>
                    </div>
                  </div>

                  <!-- Col-span-1: Color Breakdown (Vertical) -->
                  <div class="sm:col-span-1 flex flex-col justify-between gap-2.5 h-full">
                    <div v-for="(hex, key) in (effectiveDressCode?.colors || { primary: '#FDFBF7', secondary: '#D4AF37', accent: '#9CA986', neutral: '#3A4A29' })"
                      :key="key"
                      class="p-2.5 sm:p-3 rounded-xl border border-black/10 shadow-xs flex items-center justify-between transition-transform hover:-translate-y-0.5 cursor-pointer flex-1 min-h-12"
                      :style="{ backgroundColor: hex }"
                      @click="copyHexToClipboard(hex)">
                      <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-white w-max">
                        {{ key }}
                      </span>
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 text-black">
                          {{ hex }}
                        </span>
                        <UIcon name="i-lucide-copy" class="size-3 text-black/60" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Option: Pre-made Palette Image Only -->
                <div v-else-if="effectiveDressCode?.paletteType === 'image' && effectiveDressCode?.paletteImage"
                  class="w-full">
                  <div class="relative rounded-2xl overflow-hidden border border-current/20 shadow-xs cursor-pointer group flex items-center justify-center p-3 backdrop-blur-md"
                    :style="{
                      backgroundColor: getSectionStyle(index).text + '0D',
                      borderColor: getSectionStyle(index).text + '25',
                    }"
                    @click="selectedDressCodeLightboxImage = { id: 'palette-image-preview', name: 'Color Palette', size: 0, dataUrl: effectiveDressCode.paletteImage, tag: 'Color Swatches', uploadedAt: '' }; isDressCodeLightboxOpen = true">
                    <img :src="effectiveDressCode.paletteImage" alt="Color Palette Graphic"
                      class="w-full max-h-72 object-contain rounded-xl" />
                    <div class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium backdrop-blur-2xs">
                      <UIcon name="i-lucide-zoom-in" class="size-4" />
                      <span>Click to view full palette graphic</span>
                    </div>
                  </div>
                </div>

                <!-- Option: 4 Color Swatches (Editor Mode or Fallback) -->
                <div v-else class="space-y-2">
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

              <!-- Section 2: Attire Guidelines (Gentlemen & Ladies) & Guest Guidance / Colors to Avoid -->
              <div class="max-w-5xl mx-auto w-full divide-y divide-current/20 text-left"
                :style="{ color: getSectionStyle(index).text }">
                <!-- Row 1: Gentlemen & Ladies Attire -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 pb-6">
                  <!-- Gentlemen -->
                  <div class="flex flex-col justify-between space-y-2">
                    <div class="flex items-center gap-2.5" :style="{ color: getSectionStyle(index).heading }">
                      <div class="size-8 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
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
                  <div class="flex flex-col justify-between space-y-2">
                    <div class="flex items-center gap-2.5" :style="{ color: getSectionStyle(index).heading }">
                      <div class="size-8 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
                        <UIcon name="i-lucide-heart" class="size-4 text-current" />
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

                <!-- Row 2: Guest Guidance & Colors to Avoid -->
                <div v-if="effectiveDressCode?.guestNotes || effectiveDressCode?.avoidColors"
                  class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 pt-6">
                  <!-- Guest Notes -->
                  <div v-if="effectiveDressCode?.guestNotes"
                    class="flex flex-col justify-between space-y-2"
                    :class="{ 'sm:col-span-2': !effectiveDressCode?.avoidColors }">
                    <div class="flex items-center gap-2.5" :style="{ color: getSectionStyle(index).heading }">
                      <div class="size-8 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
                        <UIcon name="i-lucide-info" class="size-4 opacity-90" />
                      </div>
                      <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider"
                        :style="{ fontFamily: `'${typography.subheaderFont}'` }">
                        Guest Guidance
                      </h3>
                    </div>
                    <p class="text-xs sm:text-sm leading-relaxed opacity-90">
                      {{ effectiveDressCode.guestNotes }}
                    </p>
                  </div>

                  <!-- Colors to Avoid -->
                  <div v-if="effectiveDressCode?.avoidColors"
                    class="flex flex-col justify-between space-y-2"
                    :class="{ 'sm:col-span-2': !effectiveDressCode?.guestNotes }">
                    <div class="flex items-center gap-2.5" :style="{ color: getSectionStyle(index).heading }">
                      <div class="size-8 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
                        <UIcon name="i-lucide-ban" class="size-4" />
                      </div>
                      <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider"
                        :style="{ fontFamily: `'${typography.subheaderFont}'` }">
                        Colors to Avoid
                      </h3>
                    </div>
                    <p class="text-xs sm:text-sm leading-relaxed opacity-90">
                      {{ effectiveDressCode.avoidColors }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Section 4: Moodboard Inspiration Gallery -->
              <div v-if="effectiveDressCode?.images && effectiveDressCode.images.length > 0"
                class="max-w-5xl mx-auto w-full space-y-4 pt-4">
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

                <div class="grid gap-3.5"
                  :class="{
                    'grid-cols-1': (effectiveDressCode?.images?.length || 0) === 1,
                    'grid-cols-1 sm:grid-cols-2': (effectiveDressCode?.images?.length || 0) === 2,
                    'grid-cols-1 sm:grid-cols-3': (effectiveDressCode?.images?.length || 0) === 3,
                    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4': (effectiveDressCode?.images?.length || 0) >= 4,
                  }">
                  <div v-for="img in effectiveDressCode.images" :key="img.id"
                    class="group relative rounded-xl overflow-hidden bg-black/5 border border-current/20 shadow-sm cursor-pointer"
                    :class="(effectiveDressCode?.images?.length || 0) === 1 ? 'aspect-video sm:aspect-21/9 max-h-112' : 'aspect-4/5'"
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
              class="viewer-section"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <!-- Header -->
              <div class="viewer-section-header max-w-3xl">
                <div class="viewer-section-title !pt-1" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ effectiveGallery.title || 'Captured Moments' }}
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
                <p v-if="effectiveGallery.subtitle" class="viewer-section-desc max-w-xl mx-auto"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ effectiveGallery.subtitle }}
                </p>
              </div>

              <!-- Layout 1: Modern Grid -->
              <div v-if="effectiveGallery.layout === 'grid'"
                class="grid gap-4 sm:gap-6 max-w-5xl mx-auto w-full"
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
                class="gap-4 sm:gap-6 max-w-5xl mx-auto w-full text-left"
                :class="{
                  'columns-1 sm:columns-2': effectiveGallery.columns === 2,
                  'columns-1 sm:columns-2 lg:columns-3': effectiveGallery.columns === 3,
                  'columns-2 sm:columns-3 lg:columns-4': effectiveGallery.columns === 4,
                }">
                <div v-for="photo in effectiveGallery.photos" :key="photo.id"
                  class="inline-block w-full break-inside-avoid mb-4 sm:mb-6 group relative rounded-2xl overflow-hidden bg-black/5 border border-black/10 shadow-xs cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 transform-gpu"
                  style="-webkit-column-break-inside: avoid; break-inside: avoid; transform: translateZ(0);"
                  @click="selectedGalleryLightboxPhoto = photo; isGalleryLightboxOpen = true">
                  <img :src="photo.url" :alt="photo.caption || 'Event moment'"
                    class="block w-full h-auto object-cover transition-transform duration-500 group-hover:scale-103" loading="lazy" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                    <p v-if="photo.caption" class="text-xs sm:text-sm font-medium">{{ photo.caption }}</p>
                  </div>
                </div>
              </div>

              <!-- Layout 3: Hero Spotlight -->
              <div v-else-if="effectiveGallery.layout === 'collage'"
                class="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 text-left">
                <div v-if="effectiveGallery.photos[0]"
                  class="lg:col-span-2 group relative aspect-4/3 lg:aspect-auto lg:h-full min-h-80 rounded-2xl overflow-hidden bg-black/5 border border-black/10 shadow-md cursor-pointer transition-all hover:shadow-2xl"
                  @click="selectedGalleryLightboxPhoto = effectiveGallery.photos[0]; isGalleryLightboxOpen = true">
                  <img :src="effectiveGallery.photos[0].url" :alt="effectiveGallery.photos[0].caption || 'Hero photo'"
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                    <p v-if="effectiveGallery.photos[0].caption" class="text-base sm:text-lg md:text-xl font-bold font-serif">{{ effectiveGallery.photos[0].caption }}</p>
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
                class="max-w-5xl mx-auto w-full flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scrollbar-thin">
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
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto w-full pt-2">
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
              class="viewer-section"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="viewer-section-header">
                <div class="viewer-section-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ site.qaTitle || 'Q&A' }}
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
                <p v-if="site.qaDescription?.trim()"
                  class="viewer-section-desc"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ site.qaDescription }}
                </p>
              </div>
              <div v-for="(tidbit, tidbitIndex) in site.tidbits" :key="tidbitIndex" class="flex flex-col gap-3">
                <h3 class="viewer-item-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ tidbit.heading }}
                </h3>
                <div class="viewer-section-prose"
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
              class="viewer-section"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="viewer-section-header">
                <div class="viewer-section-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ site.scheduleTitle || 'Schedule' }}
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
                <p v-if="site.scheduleDescription?.trim()"
                  class="viewer-section-desc"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ site.scheduleDescription }}
                </p>
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

                <h3 class="viewer-item-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ item.title }}
                </h3>
                <div class="viewer-section-prose"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ item.description }}
                </div>
                <div v-if="item.location" class="font-semibold italic mt-1 sm:mt-2 text-sm sm:text-base"
                  :style="{ color: getSectionStyle(index).heading }">
                  <UIcon name="i-lucide-map-pin" class="mr-1 inline-block align-middle" />
                  {{ item.location }}
                </div>
              </div>
            </div>

            <!-- Gifts -->
            <CustomSiteGiftsSection
              v-if="compId === 'gifts' && (site.singlePageSite || activeComponentId === compId)"
              :registry="site.giftRegistry"
              :colors="getSectionStyle(index)"
              :heading-font="typography.subheaderFont"
              :min-height="componentMinHeight"
              :title="site.giftsTitle"
              :description="site.giftsDescription"
            />

            <!-- Where to Stay -->
            <div v-if="
              compId === 'where-to-stay' &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-where-to-stay"
              class="viewer-section !gap-8"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="viewer-section-header">
                <div class="viewer-section-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  Where to Stay
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
                <div v-if="site.whereToStayLocation"
                  class="viewer-pill"
                  :style="{ color: getSectionStyle(index).heading }">
                  <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5" />
                  <span>{{ getVenueShortName(site.whereToStayLocation) }}</span>
                </div>
              </div>

              <div v-if="site.whereToStayLocation"
                class="relative w-full h-80 max-w-5xl mx-auto rounded-xl overflow-hidden shadow-lg border"
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
              <div v-if="effectiveAccommodations.length > 0" class="max-w-5xl mx-auto w-full pt-4 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left">
                  <div>
                    <h3 class="text-lg sm:text-xl md:text-2xl font-bold" :style="{
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

                <!-- 4 Accommodation Grid: Separated by vertical lines, stationary containers -->
                <div class="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-current/20"
                  :style="{ color: getSectionStyle(index).text }">
                  <div v-for="(hotel, slotIdx) in effectiveAccommodations.slice(0, 4)" :key="hotel.id || slotIdx"
                    class="flex-1 min-w-0 flex flex-col justify-between p-4 sm:p-5 text-left">
                    <div class="space-y-2.5 flex-1 pb-1">
                      <!-- Topmost: Whole Name of the Venue -->
                      <h4 class="font-bold text-base sm:text-lg leading-snug break-words"
                        :style="{
                          color: getSectionStyle(index).heading,
                          fontFamily: `'${typography.subheaderFont}'`,
                        }">
                        {{ hotel.name || 'Accommodation' }}
                      </h4>

                      <!-- Row 2: Distance Metric & Star Rating (In line) -->
                      <div class="flex items-center justify-between gap-2 pt-0.5 text-xs">
                        <div v-if="formatCleanDistance(hotel.distance)"
                          class="inline-flex items-center gap-1.5 font-medium opacity-85"
                          :style="{ color: getSectionStyle(index).text }">
                          <UIcon name="i-lucide-route" class="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{{ formatCleanDistance(hotel.distance) }}</span>
                        </div>
                        <div v-else class="text-transparent select-none">-</div>

                        <div v-if="formatCleanRating(hotel.rating)"
                          class="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <UIcon name="i-lucide-star" class="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{{ formatCleanRating(hotel.rating) }}</span>
                        </div>
                      </div>

                      <!-- Description (Dynamically adapts to available space if another container's header extends) -->
                      <p v-if="hotel.description"
                        class="text-[11px] sm:text-xs opacity-75 leading-relaxed pt-1"
                        :style="[
                          { color: getSectionStyle(index).text },
                          getDescriptionClampStyle(hotel, effectiveAccommodations.slice(0, 4))
                        ]">
                        {{ hotel.description }}
                      </p>
                    </div>

                    <!-- Footer link pinned to bottom with sizeable padding above divider -->
                    <div class="pt-3.5 mt-4 border-t border-current/15">
                      <a :href="getAccommodationGoogleUrl(hotel, site.whereToStayLocation)"
                        target="_blank" rel="noopener noreferrer"
                        class="group/btn inline-flex items-center justify-between w-full text-xs font-semibold py-1 transition-all duration-200 cursor-pointer"
                        :style="{ color: getSectionStyle(index).heading }">
                        <span class="inline-flex items-center gap-1.5 opacity-80 group-hover/btn:opacity-100 group-hover/btn:underline">
                          Google Reviews & Map
                        </span>
                        <UIcon name="i-lucide-external-link"
                          class="w-4 h-4 opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-transform duration-200" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Travel -->
            <div v-if="compId === 'travel' && (site.singlePageSite || activeComponentId === compId)" id="section-travel"
              class="viewer-section"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <div class="viewer-section-header">
                <div class="viewer-section-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  Travel
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
              </div>
            </div>

            <!-- Wedding Party -->
            <div v-if="
              compId === 'wedding-party' &&
              (site.singlePageSite || activeComponentId === compId)
            " id="section-wedding-party"
              class="viewer-section"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }">
              <!-- Title & Subtitle -->
              <div class="viewer-section-header">
                <div class="viewer-section-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  Wedding Party
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
                <p v-if="site.weddingPartyIntro" class="viewer-section-desc"
                  :style="{ color: getSectionStyle(index).text }">
                  {{ site.weddingPartyIntro }}
                </p>
              </div>

              <!-- 2 Columns: Maid of Honor & Bridesmaids on Left, Best Man & Groomsmen on Right -->
              <div class="max-w-5xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-14 pt-2">
                <div v-for="column in weddingPartyColumns" :key="column.key" class="flex flex-col gap-8 text-center">
                  <div v-for="group in column.groups" :key="group.role" class="space-y-2">
                    <h3 class="viewer-role-title" :style="{
                      color: getSectionStyle(index).heading,
                      fontFamily: `'${typography.subheaderFont}'`,
                    }">
                      {{ group.role }}
                    </h3>
                    <div class="space-y-1.5">
                      <p v-for="member in group.members" :key="member.id || member.name"
                        class="viewer-member-name" :style="{
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
                <div class="viewer-section-header">
                  <h3 class="viewer-role-title" :style="{
                    color: getSectionStyle(index).heading,
                    fontFamily: `'${typography.subheaderFont}'`,
                  }">
                    Entourage
                  </h3>
                  <div class="space-y-1.5">
                    <p v-for="member in otherWeddingPartyMembers" :key="member.id || member.name"
                      class="viewer-member-name" :style="{
                        color: getSectionStyle(index).text,
                        fontFamily: `'${typography.bodyFont}'`,
                      }">
                      {{ member.name }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Playlists Section -->
            <div
              v-if="compId === 'playlist' && (site.singlePageSite || activeComponentId === compId)"
              id="section-playlist"
              class="viewer-section"
              :style="{
                minHeight: componentMinHeight,
                backgroundColor: getSectionStyle(index).bg,
              }"
            >
              <div class="viewer-section-header">
                <div class="viewer-section-title" :style="{
                  color: getSectionStyle(index).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }">
                  {{ site.playlistTitle || 'Soundtrack & Playlists' }}
                </div>
                <div class="viewer-divider" aria-hidden="true">
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                  <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(index).heading }" />
                </div>
                <p v-if="site.playlistDescription?.trim()" class="viewer-section-desc" :style="{ color: getSectionStyle(index).text }">
                  {{ site.playlistDescription }}
                </p>
              </div>

              <!-- Playlists Content: Gift Registry container style (less opacity containers) -->
              <div v-if="websitePlaylists.length > 0" class="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div v-for="playlist in websitePlaylists" :key="playlist._id"
                  class="viewer-glass-card-interactive p-5 flex flex-col gap-3 min-w-0"
                  :style="{
                    backgroundColor: getSectionStyle(index).text + '0D',
                    borderColor: getSectionStyle(index).text + '25',
                    color: getSectionStyle(index).text,
                  }">
                  <div class="min-w-0">
                    <h3 class="font-serif text-base sm:text-lg md:text-xl font-bold truncate" :style="{ color: getSectionStyle(index).heading }">
                      {{ playlist.label }}
                    </h3>
                    <p v-if="playlist.description?.trim()" class="text-xs sm:text-sm mt-1 whitespace-pre-wrap leading-relaxed opacity-85" :style="{ color: getSectionStyle(index).text }">
                      {{ playlist.description }}
                    </p>
                  </div>
                  <div class="w-full min-w-0 overflow-hidden rounded-xl">
                    <SpotifyPlaylistEmbed :playlist-url="playlist.spotifyURL" compact />
                  </div>
                </div>
              </div>

              <!-- Fallback / Empty state in CustomSiteViewer -->
              <div v-else class="viewer-empty-card"
                :style="{
                  backgroundColor: getSectionStyle(index).text + '0D',
                  borderColor: getSectionStyle(index).text + '25',
                  color: getSectionStyle(index).text,
                }">
                <UIcon name="i-lucide-music" class="size-8 mx-auto mb-2 opacity-60" :style="{ color: getSectionStyle(index).heading }" />
                <p class="text-sm font-medium" :style="{ color: getSectionStyle(index).heading }">
                  Playlist details will be shared soon.
                </p>
              </div>
            </div>
          </template>

          <!-- RSVP (Fixed component: always last before closing greeting and footer) -->
          <div v-if="site.singlePageSite || activeComponentId === 'rsvp'" id="section-rsvp"
            class="viewer-section"
            :style="{
              minHeight: componentMinHeight,
              backgroundColor: getSectionStyle(displayComponents.length).bg,
            }">
            <div class="viewer-section-header">
              <div class="viewer-section-title" :style="{
                color: getSectionStyle(displayComponents.length).heading,
                fontFamily: `'${typography.subheaderFont}'`,
              }">
                RSVP
              </div>
              <div class="viewer-divider" aria-hidden="true">
                <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(displayComponents.length).heading }" />
                <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(displayComponents.length).heading }" />
                <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(displayComponents.length).heading }" />
              </div>
            </div>
            <div class="flex flex-col items-center gap-5 text-sm" :style="{ color: getSectionStyle(displayComponents.length).text }">
              <div v-if="site.rsvpDeadlineDate" class="font-semibold uppercase tracking-widest text-xs opacity-80">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 inline-block align-text-bottom mr-1" />
                RSVP by {{ formatDateWithWeekday(site.rsvpDeadlineDate) }}
              </div>
              <UButton
                size="lg"
                class="transition-all duration-300 hover:opacity-80 shadow-md border cursor-pointer"
                :style="{
                  backgroundColor: getSectionStyle(displayComponents.length).text,
                  color: getSectionStyle(displayComponents.length).bg,
                  borderColor:
                    getSectionStyle(displayComponents.length).bg === 'transparent'
                      ? getSectionStyle(displayComponents.length - 1).text
                      : getSectionStyle(displayComponents.length - 1).bg,
                }"
                @click="handleRsvpButtonClick"
              >
                RSVP Here
              </UButton>
            </div>
          </div>

          <!-- Thank You / Ending Section -->
          <div v-if="site.singlePageSite || activeComponentId === 'about-us'"
            class="viewer-section !gap-6"
            :style="{
              minHeight: componentMinHeight,
              backgroundColor: getSectionStyle(
                displayComponents.length + 1
              ).bg,
            }">
            <div class="viewer-section-header">
              <h2 class="viewer-section-title" :style="{
                color: getSectionStyle(
                  displayComponents.length + 1
                ).heading,
                fontFamily: `'${typography.headerFont}'`,
              }">
                {{ site.endingTitle }}
              </h2>
              <div class="viewer-divider" aria-hidden="true">
                <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(displayComponents.length + 1).heading }" />
                <div class="viewer-divider-diamond" :style="{ backgroundColor: getSectionStyle(displayComponents.length + 1).heading }" />
                <div class="viewer-divider-line" :style="{ backgroundColor: getSectionStyle(displayComponents.length + 1).heading }" />
              </div>
            </div>
            <p class="viewer-section-prose !text-base sm:!text-lg md:!text-xl" :style="{
              color: getSectionStyle(
                displayComponents.length + 1
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

    <!-- Modal: find a guest's RSVP by email when they did not arrive from their invitation -->
    <UModal
      v-model:open="isMissingRsvpModalOpen"
      title="Find your RSVP"
    >
      <template #body>
        <form class="py-2 space-y-4" @submit.prevent="findRsvpByEmail">
          <p class="text-sm text-stone-600 text-center">
            Enter the email address your invitation was sent to.
          </p>
          <UFormField label="Email" name="rsvpLookupEmail" :error="rsvpLookupError || undefined">
            <UInput
              v-model="rsvpLookupEmail"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="sm"
              @click="isMissingRsvpModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              size="sm"
              :loading="isLookingUpRsvp"
            >
              Find my RSVP
            </UButton>
          </div>
        </form>
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

.viewer-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2.5rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 7rem;
  padding-bottom: 5rem;
  text-align: center;
  scroll-margin-top: 0;
  transition-property: color, background-color, border-color;
  transition-duration: 500ms;
  background-image: url('/images/paper-texture.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-blend-mode: multiply;
}

@media (min-width: 640px) {
  .viewer-section {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
    padding-top: 9rem;
  }
}

@media (min-width: 768px) {
  .viewer-section {
    background-image: url('/images/paper-texture-horizontal.webp');
  }
}

@media (min-width: 1024px) {
  .viewer-section {
    padding-left: 4rem;
    padding-right: 4rem;
  }
}

.viewer-section-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 42rem;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

.viewer-section-title {
  font-weight: 700;
  font-size: 1.5rem;
  line-height: 2rem;
  padding-top: 0.5rem;
  transition-property: all;
  transition-duration: 300ms;
}

@media (min-width: 640px) {
  .viewer-section-title {
    font-size: 1.875rem;
    line-height: 2.25rem;
    padding-top: 1rem;
  }
}

@media (min-width: 768px) {
  .viewer-section-title {
    font-size: 3rem;
    line-height: 1;
  }
}

.viewer-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}

.viewer-divider-line {
  width: 3rem;
  height: 1px;
  opacity: 0.4;
}

@media (min-width: 640px) {
  .viewer-divider-line {
    width: 5rem;
  }
}

.viewer-divider-diamond {
  width: 0.375rem;
  height: 0.375rem;
  transform: rotate(45deg);
  opacity: 0.7;
}

.viewer-section-desc {
  font-size: 0.875rem;
  line-height: 1.625;
  opacity: 0.8;
}

@media (min-width: 640px) {
  .viewer-section-desc {
    font-size: 1rem;
    line-height: 1.5rem;
  }
}

@media (min-width: 768px) {
  .viewer-section-desc {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
}

.viewer-section-prose {
  max-width: none;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition-property: all;
  transition-duration: 300ms;
}

@media (min-width: 640px) {
  .viewer-section-prose {
    font-size: 1rem;
    line-height: 1.5rem;
  }
}

@media (min-width: 768px) {
  .viewer-section-prose {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
}

.viewer-item-title {
  font-weight: 700;
  font-size: 1.125rem;
  line-height: 1.75rem;
}

@media (min-width: 640px) {
  .viewer-item-title {
    font-size: 1.25rem;
    line-height: 1.75rem;
  }
}

@media (min-width: 768px) {
  .viewer-item-title {
    font-size: 1.5rem;
    line-height: 2rem;
  }
}

.viewer-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  border-radius: 9999px;
  border-width: 1px;
  border-color: color-mix(in srgb, currentColor 20%, transparent);
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.9;
  backdrop-filter: blur(4px);
}

@media (min-width: 640px) {
  .viewer-pill {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}

.viewer-glass-card {
  border-radius: 1rem;
  border-width: 1px;
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.viewer-glass-card-interactive {
  border-radius: 1rem;
  border-width: 1px;
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition-property: all;
  transition-duration: 300ms;
}

.viewer-glass-card-interactive:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.viewer-empty-card {
  max-width: 28rem;
  margin-left: auto;
  margin-right: auto;
  padding: 2.5rem 1.5rem;
  border-radius: 1rem;
  border-width: 1px;
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.viewer-role-title {
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.8;
}

@media (min-width: 640px) {
  .viewer-role-title {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}

.viewer-member-name {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
}

@media (min-width: 640px) {
  .viewer-member-name {
    font-size: 1rem;
    line-height: 1.5rem;
  }
}
</style>
