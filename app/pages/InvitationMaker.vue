<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toCanvas } from 'html-to-image'
import type { EventRecord } from '~/types/event'
import type { CustomSiteRecord } from '~/types/customSite'
import {
  colorPalettes,
  typographySets,
  resolveCustomSiteTheme,
  type ColorPalette,
  type TypographySet,
} from '~/utils/websiteTheme'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'
import { getApiErrorMessage } from '~/types/auth'
import {
  seedInvitationDefaultsFromEvent,
  applyInvitationToEditor,
  buildInvitationPayload,
  validateInvitationForSave,
  toDateInputValue,
} from '~/utils/invitationForm'
import type { InvitationEmailData } from '~/utils/invitationEmailTemplate'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  title: 'Invitation Maker',
  bgClass: 'bg-violet-50'
})

useWeddingFonts()

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { startPageTransition, finishPageTransition } = usePageTransition()

const { activeEventId } = useActiveEvent()
const { fetchEvent, getCachedEvent } = useEvents()
const { fetchCustomSitesByEvent } = useCustomSite()
const { fetchInvitationByEvent, createInvitation, updateInvitation } = useInvitation()

const eventId = computed(() => {
  const value = route.query.eventId
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return activeEventId.value || ''
})

const isPublished = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const existingInvitationId = ref<string | null>(null)
const customSiteRecord = ref<CustomSiteRecord | null>(null)
const eventRecord = ref<EventRecord | null>(null)

// Style Sync State: Automatically link to Website Maker by default
const isSyncedWithWebsite = ref(true)

// Manual Overrides (Active when user disables sync)
const customPaletteName = ref('Gilded Flora')
const customColors = reactive({
  primary: '#FDFBF7',
  secondary: '#D4AF37',
  text_color: '#9CA986',
  secondary_text_color: '#3A4A29'
})
const customTypographyName = ref('Romantic Script')
const customFonts = reactive({
  headerFont: 'Parisienne',
  subheaderFont: 'Cormorant Garamond',
  bodyFont: 'Montserrat'
})

// Dynamically resolve Website Maker's established theme
const websiteTheme = computed(() => resolveCustomSiteTheme(customSiteRecord.value))
const websitePalette = computed(() => websiteTheme.value.palette)
const websiteTypography = computed(() => websiteTheme.value.typography)

// Effective palette used for the live invitation
const effectivePalette = computed<ColorPalette>(() => {
  if (isSyncedWithWebsite.value) {
    return websitePalette.value
  }
  if (customPaletteName.value === 'Custom') {
    return {
      name: 'Custom',
      colors: { ...customColors }
    }
  }
  const preset = colorPalettes.find((p) => p.name === customPaletteName.value)
  return preset || websitePalette.value
})

// Effective typography used for the live invitation
const effectiveTypography = computed<TypographySet>(() => {
  if (isSyncedWithWebsite.value) {
    return websiteTypography.value
  }
  if (customTypographyName.value === 'Custom') {
    return {
      name: `${customFonts.headerFont} / ${customFonts.subheaderFont} / ${customFonts.bodyFont}`,
      headerFont: customFonts.headerFont,
      subheaderFont: customFonts.subheaderFont,
      bodyFont: customFonts.bodyFont
    }
  }
  const preset = typographySets.find((t) => t.name === customTypographyName.value)
  return preset || websiteTypography.value
})

// Custom Website URL (Destination for "RSVP Here" button)
const websiteSlug = computed(() => {
  if (customSiteRecord.value?.siteName?.trim()) {
    return customSiteRecord.value.siteName.trim()
  }
  if (customSiteRecord.value?.title?.trim()) {
    return customSiteRecord.value.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
  }
  return ''
})

// Base domain for external links and email invitations
const appOrigin = computed(() => 'https://bread-plus-butter.com')

// Full absolute URL for emails and external links
const absoluteWebsiteUrl = computed(() => {
  if (websiteSlug.value) {
    return `${appOrigin.value}/sites/${encodeURIComponent(websiteSlug.value)}`
  }
  return ''
})

const websiteUrl = computed(() => {
  if (websiteSlug.value) {
    return `/sites/${encodeURIComponent(websiteSlug.value)}`
  }
  return ''
})


function handleRsvpButtonClick() {
  const target = websiteUrl.value || absoluteWebsiteUrl.value
  if (target) {
    window.open(target, '_blank')
  } else {
    toast.add({
      title: 'No Website Created Yet',
      description: 'Create and publish your custom website in Website Maker to link your RSVP directly.',
      color: 'info'
    })
  }
}

// Invitation Content Form Data
const rsvpData = reactive({
  requestLine: 'Together with their families',
  eventLabel: 'Alex & Jordan are getting married!',
  eventDate: '',
  eventTime: '',
  eventVenue: '',
  deadlineText: 'Please let us know if you can make it so we can accommodate you.',
  deadlineDate: '',
  bannerImageUrl: ''
})

// Banner Image State
const bannerImageSource = ref<'website' | 'custom' | 'none'>('website')
const customBannerDataUrl = ref<string>('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const websiteBannerUrl = computed(() => {
  return customSiteRecord.value?.headerImageURL?.trim() || ''
})

const effectiveBannerImageUrl = computed(() => {
  if (bannerImageSource.value === 'none') return ''
  if (bannerImageSource.value === 'custom') return customBannerDataUrl.value || rsvpData.bannerImageUrl || ''
  return websiteBannerUrl.value || customBannerDataUrl.value || rsvpData.bannerImageUrl || ''
})

watch(effectiveBannerImageUrl, (newUrl) => {
  rsvpData.bannerImageUrl = newUrl
}, { immediate: true })

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    toast.add({
      title: 'File Too Large',
      description: 'Please upload an image smaller than 10MB.',
      color: 'error'
    })
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (result) {
      customBannerDataUrl.value = result
      bannerImageSource.value = 'custom'
      rsvpData.bannerImageUrl = result
      toast.add({
        title: 'Banner Image Uploaded!',
        description: 'Your 1:5 horizontal banner has been added to the invitation.',
        color: 'success',
        icon: 'i-lucide-check'
      })
    }
  }
  reader.readAsDataURL(file)
}

function clearCustomBanner() {
  customBannerDataUrl.value = ''
  rsvpData.bannerImageUrl = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  if (websiteBannerUrl.value) {
    bannerImageSource.value = 'website'
  } else {
    bannerImageSource.value = 'none'
  }
}

// Preview Mode Switcher (Web Stationery vs Resend Email Client)
const previewMode = ref<'stationery' | 'email'>('stationery')

const invitationEmailPayload = computed<InvitationEmailData>(() => ({
  requestLine: rsvpData.requestLine,
  eventLabel: rsvpData.eventLabel,
  eventDate: rsvpData.eventDate,
  eventTime: rsvpData.eventTime,
  eventVenue: rsvpData.eventVenue,
  deadlineText: rsvpData.deadlineText,
  deadlineDate: rsvpData.deadlineDate,
  websiteUrl: absoluteWebsiteUrl.value,
  guestName: 'Valued Guest',
  bannerImageUrl: effectiveBannerImageUrl.value
}))

// Stationery Card Node for HTML-to-Image Generation
const stationeryCardRef = ref<HTMLElement | null>(null)

function syncEstablishedInvitationToStorage() {
  if (typeof window === 'undefined') return
  const currentEventId = eventId.value
  const data = {
    eventId: currentEventId,
    palette: effectivePalette.value,
    typography: effectiveTypography.value,
    websiteSlug: websiteSlug.value,
    bannerImageUrl: effectiveBannerImageUrl.value,
    bannerImageSource: bannerImageSource.value,
    requestLine: rsvpData.requestLine,
    eventLabel: rsvpData.eventLabel,
    eventDate: rsvpData.eventDate,
    eventTime: rsvpData.eventTime,
    eventVenue: rsvpData.eventVenue,
    deadlineText: rsvpData.deadlineText,
    deadlineDate: rsvpData.deadlineDate,
    savedAt: new Date().toISOString()
  }
  try {
    if (currentEventId) {
      localStorage.setItem(`bpb_invitation_established_${currentEventId}`, JSON.stringify(data))
    }
    localStorage.setItem('bpb_invitation_established_latest', JSON.stringify(data))
  } catch (err) {
    console.warn('Could not cache established invitation:', err)
  }
}

async function captureStationeryCardToStorage(): Promise<string | null> {
  if (!stationeryCardRef.value) return null
  try {
    await nextTick()
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready
      } catch {}
    }
    const images = Array.from(stationeryCardRef.value.querySelectorAll('img'))
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
        return new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
          if ('decode' in img) {
            img.decode().then(resolve).catch(resolve)
          }
          setTimeout(resolve, 800)
        })
      })
    )

    const canvas = await toCanvas(stationeryCardRef.value, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#f7f4ef',
    })
    const dataUrl = canvas.toDataURL('image/jpeg', 0.90)
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      try {
        localStorage.setItem('bpb_invitation_card_latest', dataUrl)
        if (eventId.value) {
          localStorage.setItem(`bpb_invitation_card_${eventId.value}`, dataUrl)
        }
      } catch (err) {
        console.warn('Could not cache stationery card image:', err)
      }
      return dataUrl
    }
  } catch (err) {
    console.warn('Could not capture stationery card:', err)
  }
  return null
}

watch(
  [rsvpData, effectivePalette, effectiveTypography, effectiveBannerImageUrl, websiteSlug],
  () => {
    syncEstablishedInvitationToStorage()
  },
  { deep: true }
)

// Steps Navigation
const currentStep = ref(0)
interface StepDef {
  id: string
  icon: string
  label: string
  description: string
}

const invitationSteps = computed<StepDef[]>(() => [
  {
    id: 'core-details',
    icon: 'i-lucide-info',
    label: '1. Event Details',
    description: 'Provide the introductory line, event headline, date, and venue.'
  },
  {
    id: 'rsvp-deadline',
    icon: 'i-lucide-calendar-clock',
    label: '2. RSVP & Deadline',
    description: 'Set your response deadline and configure your custom website RSVP link.'
  },
  {
    id: 'banner-image',
    icon: 'i-lucide-image',
    label: '3. Header Banner',
    description: 'Add an optional 1:5 horizontal panoramic banner image to the top of your invitation.'
  },
  {
    id: 'style-cohesion',
    icon: 'i-lucide-palette',
    label: '4. Style & Cohesion',
    description: 'Link your invitation design with your website colors and typography.'
  }
])

const currentStepData = computed(() => invitationSteps.value[currentStep.value])

// Initial Data Fetch & Auto-Seeding
onMounted(async () => {
  const currentEventId = eventId.value
  if (!currentEventId) {
    isLoading.value = false
    finishPageTransition()
    return
  }

  try {
    isLoading.value = true
    const [fetchedEventDetail, customSites, fetchedInvitation] = await Promise.all([
      fetchEvent(currentEventId).catch(() => null),
      fetchCustomSitesByEvent(currentEventId).catch(() => []),
      fetchInvitationByEvent(currentEventId).catch(() => null)
    ])

    if (fetchedEventDetail) {
      const event = (fetchedEventDetail as any)?.event ?? fetchedEventDetail
      eventRecord.value = event
    } else {
      eventRecord.value = getCachedEvent(currentEventId)
    }

    if (customSites && customSites.length > 0) {
      customSiteRecord.value = customSites[0] ?? null
    }

    if (fetchedInvitation) {
      existingInvitationId.value = fetchedInvitation._id
      applyInvitationToEditor(fetchedInvitation, { rsvpData, blocks: { value: [] } })
      if (rsvpData.bannerImageUrl) {
        customBannerDataUrl.value = rsvpData.bannerImageUrl
        bannerImageSource.value = 'custom'
      }
      isPublished.value = true
    } else {
      // Auto-seed from event and custom site
      if (eventRecord.value) {
        seedInvitationDefaultsFromEvent(eventRecord.value, rsvpData)
      }
      if (customSiteRecord.value) {
        if (!rsvpData.eventLabel && customSiteRecord.value.title) {
          rsvpData.eventLabel = customSiteRecord.value.title
        }
        if (customSiteRecord.value.whereToStay?.location && !rsvpData.eventVenue) {
          rsvpData.eventVenue = customSiteRecord.value.whereToStay.location
        }
        if (customSiteRecord.value.rsvpDeadlineDate && !rsvpData.deadlineDate) {
          rsvpData.deadlineDate = toDateInputValue(customSiteRecord.value.rsvpDeadlineDate)
        }
      }
    }

    // Initialize custom controls with active website theme defaults
    if (websitePalette.value) {
      customPaletteName.value = websitePalette.value.name
      Object.assign(customColors, websitePalette.value.colors)
    }
    if (websiteTypography.value) {
      customTypographyName.value = websiteTypography.value.name
      customFonts.headerFont = websiteTypography.value.headerFont
      customFonts.subheaderFont = websiteTypography.value.subheaderFont
      customFonts.bodyFont = websiteTypography.value.bodyFont
    }

    // Restore any local cache preferences if available
    if (typeof window !== 'undefined' && currentEventId) {
      try {
        const rawCached = localStorage.getItem(`bpb_invitation_established_${currentEventId}`)
        if (rawCached) {
          const cached = JSON.parse(rawCached)
          if (!rsvpData.bannerImageUrl && cached.bannerImageUrl) {
            rsvpData.bannerImageUrl = cached.bannerImageUrl
            if (cached.bannerImageSource === 'custom') {
              customBannerDataUrl.value = cached.bannerImageUrl
              bannerImageSource.value = 'custom'
            }
          }
          if (cached.palette?.name && cached.palette.name !== 'Custom') {
            isSyncedWithWebsite.value = false
            customPaletteName.value = cached.palette.name
          } else if (cached.palette?.colors) {
            isSyncedWithWebsite.value = false
            customPaletteName.value = 'Custom'
            Object.assign(customColors, cached.palette.colors)
          }
          if (cached.typography?.name && cached.typography.name !== 'Custom') {
            isSyncedWithWebsite.value = false
            customTypographyName.value = cached.typography.name
          } else if (cached.typography) {
            isSyncedWithWebsite.value = false
            customTypographyName.value = 'Custom'
            if (cached.typography.headerFont) customFonts.headerFont = cached.typography.headerFont
            if (cached.typography.subheaderFont) customFonts.subheaderFont = cached.typography.subheaderFont
            if (cached.typography.bodyFont) customFonts.bodyFont = cached.typography.bodyFont
          }
        }
      } catch (err) {
        console.warn('Could not restore cached invitation state:', err)
      }
    }

    syncEstablishedInvitationToStorage()
  } catch (error) {
    console.error('Error loading invitation details:', error)
  } finally {
    isLoading.value = false
    finishPageTransition()
  }
})

// Save / Publish
async function saveInvitation() {
  const currentEventId = eventId.value
  if (!currentEventId) {
    toast.add({
      title: 'Missing event',
      description: 'Please select an event before saving.',
      color: 'error'
    })
    return
  }

  const validationError = validateInvitationForSave(rsvpData, currentEventId)
  if (validationError) {
    toast.add({
      title: 'Incomplete Invitation',
      description: validationError,
      color: 'warning'
    })
    if (!rsvpData.eventLabel?.trim() || !rsvpData.eventDate?.trim() || !rsvpData.eventVenue?.trim()) {
      currentStep.value = 0
    } else if (!rsvpData.deadlineDate?.trim()) {
      currentStep.value = 1
    }
    return
  }

  isSaving.value = true
  try {
    const payload = buildInvitationPayload({
      eventId: currentEventId,
      rsvpData: {
        ...rsvpData,
        bannerImageUrl: effectiveBannerImageUrl.value
      },
      blocks: []
    })

    if (existingInvitationId.value) {
      const updated = await updateInvitation(existingInvitationId.value, {
        event: currentEventId,
        requestLine: payload.requestLine,
        eventLabel: payload.eventLabel,
        eventDate: payload.eventDate,
        eventTime: payload.eventTime,
        eventVenue: payload.eventVenue,
        blocks: payload.blocks,
        deadlineText: payload.deadlineText,
        deadlineDate: payload.deadlineDate,
        bannerImageUrl: payload.bannerImageUrl
      })
      existingInvitationId.value = updated._id
    } else {
      const created = await createInvitation(payload)
      existingInvitationId.value = created._id
    }

    syncEstablishedInvitationToStorage()
    captureStationeryCardToStorage().catch(() => null)

    isPublished.value = true
    toast.add({
      title: 'Invitation saved!',
      description: 'Your invitation has been saved and is ready for your guests.',
      color: 'success'
    })

  } catch (err: any) {
    const errorMsg = getApiErrorMessage(err, 'Could not save your invitation.')
    toast.add({
      title: 'Failed to save',
      description: errorMsg,
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

function togglePublish() {
  if (!isPublished.value) {
    saveInvitation()
  } else {
    isPublished.value = false
  }
}

function openWebsiteMaker() {
  if (eventId.value) {
    startPageTransition({ path: '/website-maker', query: { eventId: eventId.value } })
  } else {
    startPageTransition('/website-maker')
  }
}

function selectPresetPalette(palette: ColorPalette) {
  customPaletteName.value = palette.name
  Object.assign(customColors, palette.colors)
}

function onAccentColorInput(colorHex: string) {
  if (!colorHex || !colorHex.trim()) return
  customColors.secondary = colorHex.trim()
  customPaletteName.value = 'Custom'
  isSyncedWithWebsite.value = false
}

function selectPresetTypography(typography: TypographySet) {
  customTypographyName.value = typography.name
  customFonts.headerFont = typography.headerFont
  customFonts.subheaderFont = typography.subheaderFont
  customFonts.bodyFont = typography.bodyFont
}

function reSyncWebsiteTheme() {
  isSyncedWithWebsite.value = true
  if (websitePalette.value) {
    customPaletteName.value = websitePalette.value.name
    Object.assign(customColors, websitePalette.value.colors)
  }
  if (websiteTypography.value) {
    customTypographyName.value = websiteTypography.value.name
    customFonts.headerFont = websiteTypography.value.headerFont
    customFonts.subheaderFont = websiteTypography.value.subheaderFont
    customFonts.bodyFont = websiteTypography.value.bodyFont
  }
  toast.add({
    title: 'Style Synced with Website',
    description: `Matching ${websitePalette.value.name} and ${websiteTypography.value.headerFont}.`,
    color: 'success'
  })
}

function copyWebsiteRsvpLink() {
  if (websiteUrl.value && typeof window !== 'undefined') {
    const fullUrl = `${window.location.origin}${websiteUrl.value}`
    navigator.clipboard.writeText(fullUrl)
    toast.add({
      title: 'Link Copied',
      description: 'Wedding website RSVP link copied to clipboard.',
      color: 'success'
    })
  } else {
    toast.add({
      title: 'No Website Published',
      description: 'Create and publish your custom website first in Website Maker.',
      color: 'warning'
    })
  }
}
</script>

<template>
  <div>
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
          <!-- Cohesion Status Badge -->
          <div
            class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            :class="isSyncedWithWebsite
              ? 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'"
          >
            <UIcon :name="isSyncedWithWebsite ? 'i-lucide-link' : 'i-lucide-sliders'" class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>{{ isSyncedWithWebsite ? 'Synced with Website' : 'Custom Style' }}</span>
          </div>

          <div v-if="isPublished" class="text-sm md:text-base font-medium text-violet-600 dark:text-violet-400">
            ✨ Your invitation is live!
          </div>

          <UButton
            v-if="isPublished && websiteUrl"
            icon="i-lucide-copy"
            color="violet"
            variant="outline"
            size="sm"
            @click="copyWebsiteRsvpLink"
          >
            Copy RSVP Link
          </UButton>

          <UButton
            v-if="isPublished && websiteUrl"
            icon="i-lucide-external-link"
            color="violet"
            variant="soft"
            size="sm"
            :to="websiteUrl"
            target="_blank"
          >
            Visit Website
          </UButton>

          <UButton
            v-if="!isPublished"
            icon="i-lucide-save"
            color="violet"
            variant="outline"
            :loading="isSaving"
            @click="saveInvitation"
          >
            Save Draft
          </UButton>

          <UButton
            :icon="isPublished ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
            color="violet"
            :loading="isSaving"
            @click="togglePublish"
          >
            {{ isPublished ? 'Edit Invitation' : 'Save & Publish' }}
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Main Content Container -->
    <UContainer>
      <div class="mb-6"></div>

      <UPageGrid
        class="items-start"
        :class="{ 'max-w-3xl mx-auto': isPublished }"
        :grid="{ cols: isPublished ? 1 : '1 md:3' }"
      >
        <!-- LEFT SIDE: Content Blocks & Theme Form -->
        <UPageCard
          v-if="!isPublished"
          class="bread-container col-span-1 p-0 sm:p-0 overflow-hidden flex flex-col max-h-[calc(100vh-125px)] border border-violet-200/80 dark:border-violet-900/60 shadow-sm"
          :ui="{ container: 'p-0 sm:p-0 lg:p-0 flex flex-col w-full min-h-0 gap-0' }"
        >
          <!-- Static Header -->
          <div class="px-6 pt-5 pb-4 shrink-0 border-b border-violet-100 dark:border-violet-900/40">
            <div class="relative flex justify-center items-center text-lg font-semibold mb-1">
              <UButton
                v-if="currentStep > 0"
                icon="i-lucide-arrow-left"
                color="neutral"
                variant="ghost"
                size="sm"
                class="absolute left-0"
                aria-label="Previous Step"
                @click="currentStep--"
              />
              <span>{{ currentStepData?.label }}</span>
            </div>
            <p class="text-center text-xs mx-2 text-stone-500 dark:text-stone-400">
              {{ currentStepData?.description }}
            </p>
          </div>

          <!-- Step Body -->
          <UScrollArea class="w-full shrink min-h-0 my-0 py-0">
            <div class="px-6 py-4">
              <!-- Step 1: Core Details -->
              <div v-if="currentStepData?.id === 'core-details'" class="flex flex-col gap-4">
                <UFormField label="Introductory Line">
                  <UInput v-model="rsvpData.requestLine" placeholder="e.g., Together with their families" class="w-full" />
                </UFormField>
                <UFormField label="Event Headline">
                  <UInput v-model="rsvpData.eventLabel" placeholder="e.g., Alex & Jordan are getting married!" size="lg" class="w-full" />
                </UFormField>
                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Event Date">
                    <UInput type="date" v-model="rsvpData.eventDate" icon="i-lucide-calendar" class="w-full" />
                  </UFormField>
                  <UFormField label="Event Time">
                    <UInput type="time" v-model="rsvpData.eventTime" icon="i-lucide-clock" class="w-full" />
                  </UFormField>
                </div>
                <UFormField label="Venue">
                  <UInput v-model="rsvpData.eventVenue" placeholder="e.g., The Grand Hotel, Cityville" icon="i-lucide-map-pin" class="w-full" />
                </UFormField>
              </div>

              <!-- Step 2: RSVP & Deadline -->
              <div v-else-if="currentStepData?.id === 'rsvp-deadline'" class="flex flex-col gap-5">
                <UFormField label="Deadline Message">
                  <UTextarea v-model="rsvpData.deadlineText" placeholder="e.g., Please let us know if you can make it so we can accommodate you." class="w-full" />
                </UFormField>
                <UFormField label="RSVP Deadline Date">
                  <UInput
                    type="date"
                    v-model="rsvpData.deadlineDate"
                    icon="i-lucide-calendar"
                    class="w-full"
                  />
                </UFormField>

                <!-- Website Destination Info Card -->
                <div class="rounded-xl p-4 border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50 space-y-3">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-globe" class="w-4 h-4 text-primary-500" />
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      Destination Website
                    </h4>
                  </div>
                  <p class="text-xs text-stone-500 dark:text-stone-400">
                    Your invitation features a prominent <strong>"RSVP Here"</strong> button that directs guests straight to your website RSVP.
                  </p>

                  <div v-if="websiteUrl" class="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800 text-xs">
                    <div class="truncate text-stone-600 dark:text-stone-300">
                      <span class="text-stone-400">Target URL: </span>
                      <strong class="font-mono text-[11px]">{{ websiteUrl }}</strong>
                    </div>
                    <UButton
                      :to="websiteUrl"
                      target="_blank"
                      variant="ghost"
                      color="neutral"
                      size="xs"
                      icon="i-lucide-external-link"
                    >
                      Visit
                    </UButton>
                  </div>
                  <div v-else class="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                    <span>No custom website detected yet.</span>
                    <UButton
                      variant="soft"
                      color="warning"
                      size="xs"
                      icon="i-lucide-plus"
                      @click="openWebsiteMaker"
                    >
                      Create Website
                    </UButton>
                  </div>
                </div>
              </div>

              <!-- Step 3: Top Banner Image Component -->
              <div v-else-if="currentStepData?.id === 'banner-image'" class="flex flex-col gap-5">
                <!-- Source Selection -->
                <div class="space-y-2">
                  <label class="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    Header Banner Source
                  </label>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <!-- Option 1: Website Banner -->
                    <button
                      type="button"
                      class="flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative"
                      :class="bannerImageSource === 'website'
                        ? 'bg-violet-50/80 border-violet-400 dark:bg-violet-950/40 dark:border-violet-700 ring-2 ring-violet-500/20'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300'"
                      @click="bannerImageSource = 'website'"
                    >
                      <div class="flex items-center justify-between w-full mb-1">
                        <div class="flex items-center gap-1.5 font-semibold text-xs text-stone-900 dark:text-stone-100">
                          <UIcon name="i-lucide-globe" class="w-4 h-4 text-violet-500" />
                          <span>Website Banner</span>
                        </div>
                        <span v-if="bannerImageSource === 'website'" class="w-2 h-2 rounded-full bg-violet-600"></span>
                      </div>
                      <p class="text-[11px] text-stone-500 dark:text-stone-400">
                        Use the header image from your website builder.
                      </p>
                    </button>

                    <!-- Option 2: Custom Upload -->
                    <button
                      type="button"
                      class="flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative"
                      :class="bannerImageSource === 'custom'
                        ? 'bg-violet-50/80 border-violet-400 dark:bg-violet-950/40 dark:border-violet-700 ring-2 ring-violet-500/20'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300'"
                      @click="bannerImageSource = 'custom'"
                    >
                      <div class="flex items-center justify-between w-full mb-1">
                        <div class="flex items-center gap-1.5 font-semibold text-xs text-stone-900 dark:text-stone-100">
                          <UIcon name="i-lucide-upload-cloud" class="w-4 h-4 text-violet-500" />
                          <span>Custom Upload</span>
                        </div>
                        <span v-if="bannerImageSource === 'custom'" class="w-2 h-2 rounded-full bg-violet-600"></span>
                      </div>
                      <p class="text-[11px] text-stone-500 dark:text-stone-400">
                        Upload a distinct panoramic photo for this invitation.
                      </p>
                    </button>
                  </div>
                </div>

                <!-- Aspect Ratio Advisory Card -->
                <div class="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div class="flex items-center gap-2 font-semibold">
                    <UIcon name="i-lucide-proportions" class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Advisory: 1:5 Aspect Ratio (Horizontal Banner)</span>
                  </div>
                  <p class="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    The invitation banner is styled as a wide panoramic strip with an aspect ratio of <strong>1:5</strong> (e.g. 1500 × 300px or 1000 × 200px). Wide horizontal photos work best to avoid top/bottom cropping.
                  </p>
                </div>

                <!-- Source Content: Website Banner -->
                <div v-if="bannerImageSource === 'website'" class="space-y-3">
                  <div v-if="websiteBannerUrl" class="space-y-2">
                    <div class="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                      <span class="font-medium">Linked Website Banner:</span>
                      <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Active</span>
                    </div>
                    <div class="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-xs bg-stone-100 dark:bg-stone-900">
                      <img
                        :src="websiteBannerUrl"
                        alt="Website Header"
                        class="w-full aspect-5/1 object-cover object-center block"
                      />
                    </div>
                    <p class="text-[11px] text-stone-500">
                      Automatically pulls the main header image from your custom website.
                    </p>
                  </div>
                  <div v-else class="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/40 text-center space-y-2">
                    <UIcon name="i-lucide-image-off" class="w-7 h-7 text-stone-400 mx-auto" />
                    <p class="text-xs text-stone-600 dark:text-stone-400 font-medium">
                      No header image found on your custom website.
                    </p>
                    <p class="text-[11px] text-stone-500">
                      You can upload a custom banner image right here instead.
                    </p>
                    <UButton
                      size="xs"
                      variant="soft"
                      color="violet"
                      icon="i-lucide-upload"
                      @click="bannerImageSource = 'custom'"
                    >
                      Switch to Custom Upload
                    </UButton>
                  </div>
                </div>

                <!-- Source Content: Custom Upload -->
                <div v-if="bannerImageSource === 'custom'" class="space-y-3">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    class="hidden"
                    @change="handleFileUpload"
                  />

                  <!-- Uploaded Preview -->
                  <div v-if="customBannerDataUrl" class="space-y-2.5">
                    <div class="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                      <span class="font-medium">Custom Banner Preview:</span>
                      <span class="text-[11px] text-violet-600 dark:text-violet-400 font-medium">1:5 Ratio</span>
                    </div>

                    <div class="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-xs bg-stone-100 dark:bg-stone-900">
                      <img
                        :src="customBannerDataUrl"
                        alt="Custom Banner"
                        class="w-full aspect-5/1 object-cover object-center block"
                      />
                    </div>

                    <div class="flex items-center gap-2">
                      <UButton
                        size="xs"
                        variant="outline"
                        color="neutral"
                        icon="i-lucide-refresh-cw"
                        @click="fileInputRef?.click()"
                      >
                        Replace Image
                      </UButton>
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="error"
                        icon="i-lucide-trash-2"
                        @click="clearCustomBanner"
                      >
                        Remove Image
                      </UButton>
                    </div>
                  </div>

                  <!-- Dropzone when no image uploaded yet -->
                  <div
                    v-else
                    class="p-6 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-violet-400 dark:hover:border-violet-600 transition-colors text-center cursor-pointer space-y-2 bg-stone-50/50 dark:bg-stone-900/30"
                    @click="fileInputRef?.click()"
                  >
                    <div class="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                      <UIcon name="i-lucide-upload" class="w-5 h-5" />
                    </div>
                    <div>
                      <p class="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Click to upload your 1:5 banner image
                      </p>
                      <p class="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        PNG, JPG, or WEBP (Max 10MB)
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Disable / Enable Banner Option -->
                <div class="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span class="text-stone-500">Don't want an image on the invitation?</span>
                  <button
                    type="button"
                    class="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    @click="bannerImageSource = bannerImageSource === 'none' ? (websiteBannerUrl ? 'website' : 'custom') : 'none'"
                  >
                    {{ bannerImageSource === 'none' ? 'Enable Banner Image' : 'Disable Banner Image' }}
                  </button>
                </div>
              </div>

              <!-- Step 4: Style & Cohesion (Website Link & Theme) -->
              <div v-else-if="currentStepData?.id === 'style-cohesion'" class="flex flex-col gap-5">
                <!-- Sync Toggle Card -->
                <div
                  class="rounded-xl p-4 border transition-all"
                  :class="isSyncedWithWebsite
                    ? 'bg-violet-50/70 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800/60'
                    : 'bg-white border-stone-200 dark:bg-stone-900/50 dark:border-stone-800'"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5">
                      <div
                        class="p-2 rounded-lg"
                        :class="isSyncedWithWebsite ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300' : 'bg-stone-200/70 text-stone-600 dark:bg-stone-800 dark:text-stone-300'"
                      >
                        <UIcon :name="isSyncedWithWebsite ? 'i-lucide-sparkles' : 'i-lucide-sliders'" class="w-5 h-5" />
                      </div>
                      <div>
                        <h4 class="text-sm font-semibold text-stone-900 dark:text-white">
                          {{ isSyncedWithWebsite ? 'Synced with Website Maker' : 'Independent Invitation Style' }}
                        </h4>
                        <p class="text-xs text-stone-500 dark:text-stone-400">
                          {{ isSyncedWithWebsite ? 'Matching the website colors and typography' : 'Customizing styling specifically for this invitation' }}
                        </p>
                      </div>
                    </div>
                    <USwitch v-model="isSyncedWithWebsite" color="violet" />
                  </div>

                  <!-- Website Theme Info Pill -->
                  <div v-if="isSyncedWithWebsite" class="mt-4 pt-3 border-t border-violet-200/60 dark:border-violet-800/40 space-y-3">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-stone-600 dark:text-stone-400">Active Website Palette:</span>
                      <span class="font-semibold text-stone-900 dark:text-stone-100">{{ websitePalette.name }}</span>
                    </div>

                    <!-- Color Swatches Display -->
                    <div class="flex items-center gap-2">
                      <div
                        v-for="(hex, key) in websitePalette.colors"
                        :key="key"
                        class="flex-1 h-6 rounded-md border border-black/10 dark:border-white/10 relative group"
                        :style="{ backgroundColor: hex }"
                        :title="`${key}: ${hex}`"
                      />
                    </div>

                    <div class="flex items-center justify-between text-xs pt-1">
                      <span class="text-stone-600 dark:text-stone-400">Active Fonts:</span>
                      <span class="font-semibold text-stone-900 dark:text-stone-100 truncate max-w-45">
                        {{ websiteTypography.headerFont }} + {{ websiteTypography.subheaderFont }}
                      </span>
                    </div>

                    <div class="pt-2">
                      <UButton
                        icon="i-lucide-external-link"
                        variant="soft"
                        color="violet"
                        size="xs"
                        block
                        @click="openWebsiteMaker"
                      >
                        Adjust Master Theme in Website Maker
                      </UButton>
                    </div>
                  </div>

                  <div v-else class="mt-3 pt-2">
                    <UButton
                      icon="i-lucide-rotate-ccw"
                      variant="soft"
                      color="violet"
                      size="xs"
                      block
                      @click="reSyncWebsiteTheme"
                    >
                      Re-link with Website Maker Style
                    </UButton>
                  </div>
                </div>

                <!-- Dedicated Invitation Accent Color Section -->
                <div class="p-3.5 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-white dark:bg-stone-900 shadow-xs space-y-2.5">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5">
                      <label class="relative cursor-pointer shrink-0">
                        <span
                          class="block w-7 h-7 rounded-lg border border-black/15 shadow-xs transition-transform hover:scale-105"
                          :style="{ backgroundColor: effectivePalette.colors.secondary }"
                        />
                        <input
                          type="color"
                          :value="effectivePalette.colors.secondary"
                          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          @input="e => onAccentColorInput((e.target as HTMLInputElement).value)"
                        />
                      </label>
                      <div>
                        <h4 class="text-xs font-bold text-stone-900 dark:text-white">Invitation Accent Color</h4>
                        <p class="text-[10px] text-stone-500 dark:text-stone-400">
                          {{ isSyncedWithWebsite ? 'Retrieved from Website Maker' : 'Customized Accent Color' }}
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        :value="effectivePalette.colors.secondary"
                        maxlength="7"
                        class="w-20 px-2 py-1 text-xs font-mono uppercase bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500 text-center font-semibold"
                        @change="e => onAccentColorInput((e.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>

                  <p class="text-[11px] text-stone-600 dark:text-stone-400 leading-normal">
                    This accent color styles the <strong>"RSVP Here"</strong> button, stationery borders, star divider, and the response deadline badge.
                  </p>
                </div>

                <!-- Custom Styling Overrides (when not synced) -->
                <div v-if="!isSyncedWithWebsite" class="space-y-4">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Color Palette Presets
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        v-for="palette in colorPalettes"
                        :key="palette.name"
                        type="button"
                        class="p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col gap-1.5"
                        :class="customPaletteName === palette.name
                          ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/40 dark:bg-violet-950/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'"
                        @click="selectPresetPalette(palette)"
                      >
                        <span class="font-medium text-stone-900 dark:text-stone-100 truncate">{{ palette.name }}</span>
                        <div class="flex items-center gap-1">
                          <span
                            v-for="(color, cKey) in palette.colors"
                            :key="cKey"
                            class="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                            :style="{ backgroundColor: color }"
                          />
                        </div>
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2 pt-2">
                    <label class="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Typography Presets
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        v-for="typo in typographySets"
                        :key="typo.name"
                        type="button"
                        class="p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col gap-1"
                        :class="customTypographyName === typo.name
                          ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/40 dark:bg-violet-950/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'"
                        @click="selectPresetTypography(typo)"
                      >
                        <span class="font-medium text-stone-900 dark:text-stone-100 truncate">{{ typo.name }}</span>
                        <span class="text-[11px] text-stone-500 dark:text-stone-400 truncate" :style="{ fontFamily: typo.headerFont }">
                          {{ typo.headerFont }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UScrollArea>

          <!-- Static Footer -->
          <div class="pb-5 px-6 pt-4 shrink-0 border-t border-violet-100 dark:border-violet-900/40">
            <div class="flex justify-between items-center gap-3">
              <UButton
                v-if="currentStep > 0"
                variant="ghost"
                color="neutral"
                @click="currentStep--"
              >
                Back
              </UButton>
              <div class="ml-auto flex items-center gap-2">
                <UButton
                  v-if="currentStep < invitationSteps.length - 1"
                  icon="i-lucide-arrow-right"
                  color="violet"
                  @click="currentStep++"
                >
                  Next Step
                </UButton>
                <UButton
                  v-else
                  icon="i-lucide-check-circle"
                  color="violet"
                  :loading="isSaving"
                  @click="saveInvitation"
                >
                  Save & Publish
                </UButton>
              </div>
            </div>
          </div>
        </UPageCard>

        <!-- RIGHT SIDE: Live Preview Styled with Website Cohesion -->
        <div :class="isPublished ? 'col-span-full' : 'col-span-2'" class="flex flex-col gap-4">
          <!-- Preview Mode Switcher (Aligned to Right) -->
          <div class="flex items-center justify-end px-1">
            <!-- Segmented Control: Web vs Email -->
            <div class="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 shadow-xs">
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                :class="previewMode === 'stationery'
                  ? 'bg-white dark:bg-stone-900 text-violet-700 dark:text-violet-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'"
                @click="previewMode = 'stationery'"
              >
                <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
                <span>Web Stationery</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                :class="previewMode === 'email'
                  ? 'bg-white dark:bg-stone-900 text-violet-700 dark:text-violet-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'"
                @click="previewMode = 'email'"
              >
                <UIcon name="i-lucide-mail" class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>Email Client (Resend)</span>
              </button>
            </div>
          </div>

          <!-- 1. Luxury Stationery Invitation Card (Web View) -->
          <div
            v-if="previewMode === 'stationery'"
            ref="stationeryCardRef"
            class="relative rounded-2xl transition-all duration-300 shadow-xl overflow-hidden"
            :class="[
              isPublished ? 'max-w-2xl mx-auto w-full my-4' : 'w-full',
              effectiveBannerImageUrl ? '' : 'p-8 sm:p-12'
            ]"
            :style="{
              backgroundColor: effectivePalette.colors.primary,
              borderColor: effectivePalette.colors.secondary,
              borderWidth: '2px',
              borderStyle: 'solid'
            }"
          >
            <!-- Top Banner Image Component (Flush Top & Sides, 1:5 Horizontal Banner) -->
            <div
              v-if="effectiveBannerImageUrl"
              class="w-full overflow-hidden border-b"
              :style="{ borderColor: `${effectivePalette.colors.secondary}40` }"
            >
              <img
                :src="effectiveBannerImageUrl"
                alt="Invitation Header Banner"
                class="w-full aspect-5/1 object-cover object-center block"
              />
            </div>

            <!-- Card Content Wrapper -->
            <div
              class="relative"
              :class="effectiveBannerImageUrl ? 'p-6 sm:p-10' : ''"
            >
              <!-- Inner Stationery Double Border Frame -->
              <div
                class="absolute inset-3 sm:inset-4 rounded-xl pointer-events-none"
                :style="{
                  borderColor: `${effectivePalette.colors.secondary}45`,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }"
              />

              <!-- Invitation Card Content -->
              <div class="relative z-10 flex flex-col gap-7 text-center py-4 px-2 sm:px-6">
                <!-- 1. Header Area (Fixed Fields) -->
              <div class="space-y-4">
                <p
                  class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em]"
                  :style="{
                    color: effectivePalette.colors.secondary_text_color,
                    fontFamily: effectiveTypography.subheaderFont
                  }"
                >
                  {{ rsvpData.requestLine || 'Together with their families' }}
                </p>

                <h1
                  class="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight"
                  :style="{
                    color: effectivePalette.colors.text_color,
                    fontFamily: effectiveTypography.headerFont
                  }"
                >
                  {{ rsvpData.eventLabel || 'Alex & Jordan are getting married!' }}
                </h1>

                <!-- Date, Time, and Venue -->
                <div class="mt-6 flex flex-col items-center gap-1">
                  <div
                    class="text-base sm:text-lg font-semibold uppercase tracking-wider"
                    :style="{
                      color: effectivePalette.colors.text_color,
                      fontFamily: effectiveTypography.subheaderFont
                    }"
                  >
                    {{ formatDateWithWeekday(rsvpData.eventDate) || 'Saturday, October 24, 2026' }}
                  </div>

                  <div
                    v-if="rsvpData.eventTime"
                    class="text-sm sm:text-base font-normal"
                    :style="{
                      color: effectivePalette.colors.secondary_text_color,
                      fontFamily: effectiveTypography.bodyFont
                    }"
                  >
                    {{ formatTime(rsvpData.eventTime) || '4:00 PM' }}
                  </div>

                  <div
                    class="flex items-center text-sm sm:text-base font-medium pt-2"
                    :style="{
                      color: effectivePalette.colors.text_color,
                      fontFamily: effectiveTypography.subheaderFont
                    }"
                  >
                    <UIcon name="i-lucide-map-pin" class="w-4 h-4 mr-1.5 opacity-70" />
                    {{ rsvpData.eventVenue || 'The Grand Promenade, Cityville' }}
                  </div>
                </div>
              </div>

              <!-- Decorative Divider -->
              <div class="flex items-center justify-center my-1">
                <div
                  class="w-16 h-[1.5px]"
                  :style="{ backgroundColor: `${effectivePalette.colors.secondary}70` }"
                />
                <span
                  class="mx-3 text-xs"
                  :style="{ color: effectivePalette.colors.secondary }"
                >
                  ✦
                </span>
                <div
                  class="w-16 h-[1.5px]"
                  :style="{ backgroundColor: `${effectivePalette.colors.secondary}70` }"
                />
              </div>

              <!-- 2. Prominent "RSVP Here" CTA Button -->
              <div class="my-3 flex flex-col items-center justify-center gap-2">
                <a
                  v-if="websiteUrl"
                  :href="websiteUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group relative inline-flex items-center justify-center gap-2.5 px-9 py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  :style="{
                    backgroundColor: effectivePalette.colors.secondary,
                    color: effectivePalette.colors.secondary_text_color,
                    fontFamily: effectiveTypography.subheaderFont
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
                    backgroundColor: effectivePalette.colors.secondary,
                    color: effectivePalette.colors.secondary_text_color,
                    fontFamily: effectiveTypography.subheaderFont
                  }"
                  @click="handleRsvpButtonClick"
                >
                  <span>RSVP Here</span>
                  <UIcon name="i-lucide-arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <p
                  class="text-[11px] text-stone-500 dark:text-stone-400 mt-1"
                  :style="{ fontFamily: effectiveTypography.bodyFont }"
                >
                  {{ websiteUrl ? 'Directs guests to your website RSVP' : 'Will direct guests to your website RSVP once created' }}
                </p>
              </div>

              <!-- 3. Footer Area (RSVP Deadline) -->
              <div
                class="mt-2 pt-5 border-t"
                :style="{ borderColor: `${effectivePalette.colors.secondary}40` }"
              >
                <div
                  class="prose max-w-md mx-auto text-center text-xs sm:text-sm"
                  :style="{
                    color: effectivePalette.colors.secondary_text_color,
                    fontFamily: effectiveTypography.bodyFont
                  }"
                  v-html="rsvpData.deadlineText"
                />

                <div
                  v-if="rsvpData.deadlineDate"
                  class="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full font-medium text-xs sm:text-sm border transition-transform shadow-xs"
                  :style="{
                    backgroundColor: `${effectivePalette.colors.secondary}20`,
                    color: effectivePalette.colors.secondary_text_color,
                    borderColor: `${effectivePalette.colors.secondary}60`,
                    fontFamily: effectiveTypography.subheaderFont
                  }"
                >
                  <UIcon name="i-lucide-calendar" class="w-4 h-4 shrink-0" />
                  <span>RSVP Deadline: {{ formatDateWithWeekday(rsvpData.deadlineDate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

          <!-- 2. Email Client Preview (Resend View) -->
          <InvitationEmailPreview
            v-else
            :invitation="invitationEmailPayload"
            :palette="effectivePalette"
            :typography="effectiveTypography"
            :website-url="absoluteWebsiteUrl"
          />
        </div>
      </UPageGrid>
    </UContainer>
  </div>
</template>