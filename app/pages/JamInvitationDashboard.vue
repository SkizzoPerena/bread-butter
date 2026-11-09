<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import type { GatheringRecord, JamInvitationDesign } from '~/types/seating'
import {
  colorPalettes,
  typographySets,
  resolvePalette,
  resolveTypography,
  type ColorPalette,
  type TypographySet,
} from '~/utils/websiteTheme'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'
import {
  INVITATION_TEMPLATES,
  getTemplateForEventType,
  getTemplateById,
  type InvitationTemplatePreset,
} from '~/utils/invitationTemplates'
import JamInvitationCard from '~/components/JamInvitationCard.vue'
import { getApiErrorMessage } from '~/types/auth'
import { currentOriginPath } from '~/utils/seatingQr'

definePageMeta({
  layout: 'jam-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Invitation Maker',
  bgClass: 'bg-blue-50',
  middleware: 'seating-enabled',
})

useWeddingFonts()

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { startPageTransition, finishPageTransition } = usePageTransition()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<any[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const isPublished = ref(false)

const isCopiedPasscode = ref(false)
const isCopiedOpenInvite = ref(false)
const isCopiedRsvpLink = ref(false)

// Steps matching InvitationMaker.vue
const currentStep = ref(0)
const steps = [
  { id: 'core-details', label: '1. Event Details', description: 'Template, names, headline, schedule, and venue' },
  { id: 'rsvp-deadline', label: '2. RSVP & Access', description: 'RSVP deadline, button label, passcode, and open invite link' },
  { id: 'banner-image', label: '3. Stationery & Banner', description: 'Upload a panoramic banner or your own invitation image' },
  { id: 'style-cohesion', label: '4. Colors & Fonts', description: 'Choose color palettes, typography, and accent colors' },
]
const currentStepData = computed(() => steps[currentStep.value])

// Preview Mode: Stationery vs Email Client
const previewMode = ref<'stationery' | 'email'>('stationery')

// Editor Form State
const rsvpData = reactive({
  templateId: 'wedding',
  headerLabel: 'WEDDING INVITATION',
  headline: '',
  hostName: '',
  requestLine: 'Together with their families,',
  primaryName: '',
  personalMessage: 'request the honor of your presence as they celebrate their marriage.',
  eventDate: '',
  eventTime: '18:00',
  eventVenue: '',
  scheduleType: 'dual' as 'single' | 'dual',
  ceremonyTitle: 'Ceremony',
  ceremonyTime: '2:00 PM',
  ceremonyVenue: '',
  receptionTitle: 'Reception',
  receptionTime: '5:00 PM',
  receptionVenue: '',
  celebrationTitle: 'Celebration',
  deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
  ctaText: 'Confirm Attendance',
  passcode: '',
  emailSubject: 'You are warmly invited to celebrate with us!',
})

// Design Mode & Theme
const designMode = ref<'MAKER' | 'IMAGE'>('MAKER')
const ownImageUrl = ref('')
const bannerImageUrl = ref('')
const customPaletteName = ref('Gilded Flora')
const customTypographyName = ref('Romantic Script')
const customAccentColor = ref('#D4AF37')

const fileInputRef = ref<HTMLInputElement | null>(null)
const bannerFileInputRef = ref<HTMLInputElement | null>(null)

// Effective Theme Resolvers
const effectivePalette = computed<ColorPalette>(() => {
  const base = resolvePalette(customPaletteName.value)
  if (customAccentColor.value && customAccentColor.value !== base.colors.secondary) {
    return {
      ...base,
      colors: {
        ...base.colors,
        secondary: customAccentColor.value,
      },
    }
  }
  return base
})

const effectiveTypography = computed<TypographySet>(() => {
  return resolveTypography(customTypographyName.value)
})

const publicInvitationUrl = computed(() => {
  if (!gathering.value?.publicToken) return ''
  return currentOriginPath(`/jam/${gathering.value.publicToken}`)
})

const openInviteUrl = computed(() => {
  const token = gathering.value?.openInvite?.token
  if (!token) return ''
  return currentOriginPath(`/jam/open/${token}`)
})

const guestRsvpSampleUrl = computed(() => {
  const sampleGuest = guests.value[0]
  if (sampleGuest?.attendanceToken) {
    return currentOriginPath(`/jam/rsvp/${sampleGuest.attendanceToken}`)
  }
  return publicInvitationUrl.value
})

const activeTemplatePreset = computed<InvitationTemplatePreset>(() => {
  return getTemplateForEventType(gathering.value?.eventType)
})

function applyTemplate(templateId: string, force = false) {
  const tmpl = getTemplateById(templateId)
  rsvpData.templateId = tmpl.id
  if (force || !rsvpData.headerLabel) rsvpData.headerLabel = tmpl.headerLabel
  if (force || !rsvpData.headline) rsvpData.headline = tmpl.headline
  if (force || !rsvpData.hostName) rsvpData.hostName = tmpl.defaultHostName || ''
  if (force || !rsvpData.requestLine) rsvpData.requestLine = tmpl.requestLine
  if (force || !rsvpData.personalMessage) rsvpData.personalMessage = tmpl.defaultMessage
  if (force || !rsvpData.scheduleType) rsvpData.scheduleType = tmpl.scheduleType
  if (force || !rsvpData.ceremonyTitle) rsvpData.ceremonyTitle = tmpl.ceremonyTitle || 'Ceremony'
  if (force || !rsvpData.ceremonyTime) rsvpData.ceremonyTime = tmpl.ceremonyTime || '2:00 PM'
  if (force || !rsvpData.ceremonyVenue) rsvpData.ceremonyVenue = tmpl.ceremonyVenue || rsvpData.eventVenue || ''
  if (force || !rsvpData.receptionTitle) rsvpData.receptionTitle = tmpl.receptionTitle || 'Reception'
  if (force || !rsvpData.receptionTime) rsvpData.receptionTime = tmpl.receptionTime || '5:00 PM'
  if (force || !rsvpData.receptionVenue) rsvpData.receptionVenue = tmpl.receptionVenue || rsvpData.eventVenue || ''
  if (force || !rsvpData.celebrationTitle) rsvpData.celebrationTitle = tmpl.celebrationTitle || 'Celebration'
  if (force || !rsvpData.deadlineText) rsvpData.deadlineText = tmpl.deadlineText
  if (force || !rsvpData.ctaText) rsvpData.ctaText = tmpl.ctaButtonText
  if (force) {
    toast.add({ title: `${tmpl.name} template applied`, color: 'success' })
  }
}

async function load() {
  if (!gatheringId.value) return
  isLoading.value = true
  try {
    const [gatheringData, guestsData] = await Promise.all([
      seating.getGathering(gatheringId.value),
      seating.listGuests(gatheringId.value),
    ])
    gathering.value = gatheringData
    guests.value = guestsData.guests

    // Template is constant depending on the event type
    const defaultTemplate = getTemplateForEventType(gatheringData.eventType)
    const d = gatheringData.invitationDesign

    rsvpData.templateId = defaultTemplate.id
    rsvpData.headerLabel = d?.headerLabel ?? defaultTemplate.headerLabel
    rsvpData.headline = d?.headline ?? defaultTemplate.headline
    rsvpData.hostName = d?.hostName ?? defaultTemplate.defaultHostName ?? ''
    rsvpData.requestLine = d?.requestLine ?? defaultTemplate.requestLine
    rsvpData.primaryName = d?.primaryName ?? gatheringData.name ?? ''
    rsvpData.personalMessage = gatheringData.invitationMessage || defaultTemplate.defaultMessage
    rsvpData.eventVenue = gatheringData.venue || ''
    rsvpData.eventDate = gatheringData.eventDate ? gatheringData.eventDate.slice(0, 10) : ''
    rsvpData.eventTime = d?.eventTime || defaultTemplate.eventTime || '18:00'
    rsvpData.scheduleType = d?.scheduleType || defaultTemplate.scheduleType
    rsvpData.ceremonyTitle = d?.ceremonyTitle || defaultTemplate.ceremonyTitle || 'Ceremony'
    rsvpData.ceremonyTime = d?.ceremonyTime || defaultTemplate.ceremonyTime || '2:00 PM'
    rsvpData.ceremonyVenue = d?.ceremonyVenue || gatheringData.venue || defaultTemplate.ceremonyVenue || ''
    rsvpData.receptionTitle = d?.receptionTitle || defaultTemplate.receptionTitle || 'Reception'
    rsvpData.receptionTime = d?.receptionTime || defaultTemplate.receptionTime || '5:00 PM'
    rsvpData.receptionVenue = d?.receptionVenue || gatheringData.venue || defaultTemplate.receptionVenue || ''
    rsvpData.celebrationTitle = d?.celebrationTitle || defaultTemplate.celebrationTitle || 'Celebration'
    rsvpData.deadlineText = d?.deadlineText || defaultTemplate.deadlineText
    rsvpData.ctaText = d?.ctaText || defaultTemplate.ctaButtonText
    rsvpData.passcode = gatheringData.passcode || ''
    rsvpData.emailSubject = gatheringData.invitationSubject || `You are warmly invited to ${gatheringData.name}!`

    if (d) {
      designMode.value = d.mode || 'MAKER'
      ownImageUrl.value = d.imageUrl || ''
      bannerImageUrl.value = d.bannerImageUrl || ''
      if (d.paletteName) customPaletteName.value = d.paletteName
      if (d.typographyName) customTypographyName.value = d.typographyName
      customAccentColor.value = d.accentColor || resolvePalette(customPaletteName.value).colors.secondary
    }

    isPublished.value = Boolean(
      d?.headline ||
      d?.imageUrl ||
      d?.primaryName ||
      gatheringData.invitationMessage
    )

    setActiveEvent({
      _id: gatheringData._id,
      name: gatheringData.name,
      title: gatheringData.name,
      location: gatheringData.venue,
      date: gatheringData.eventDate,
      eventDate: gatheringData.eventDate,
      status: gatheringData.status,
      maxGuests: gatheringData.maxGuests,
    } as any)
  } catch (error) {
    toast.add({ title: 'Could not load invitation', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isLoading.value = false
    finishPageTransition()
  }
}

onMounted(load)

watch(gatheringId, load)

// Upload banner image
async function handleBannerUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !gatheringId.value) return
  isSaving.value = true
  try {
    const updated = await seating.uploadInvitationImage(gatheringId.value, 'banner', file)
    gathering.value = updated
    bannerImageUrl.value = updated.invitationDesign?.bannerImageUrl || ''
    toast.add({ title: 'Panoramic banner uploaded', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not upload banner', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isSaving.value = false
    input.value = ''
  }
}

async function removeBanner() {
  if (!gatheringId.value) return
  isSaving.value = true
  try {
    const updated = await seating.removeInvitationImage(gatheringId.value, 'banner')
    gathering.value = updated
    bannerImageUrl.value = ''
    toast.add({ title: 'Banner removed', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not remove banner', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

// Upload custom stationery image
async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !gatheringId.value) return
  isSaving.value = true
  try {
    const updated = await seating.uploadInvitationImage(gatheringId.value, 'invitation', file)
    gathering.value = updated
    ownImageUrl.value = updated.invitationDesign?.imageUrl || ''
    designMode.value = 'IMAGE'
    toast.add({ title: 'Stationery image uploaded', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not upload image', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isSaving.value = false
    input.value = ''
  }
}

async function removeImage() {
  if (!gatheringId.value) return
  isSaving.value = true
  try {
    const updated = await seating.removeInvitationImage(gatheringId.value, 'invitation')
    gathering.value = updated
    ownImageUrl.value = ''
    designMode.value = 'MAKER'
    toast.add({ title: 'Custom image removed', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not remove image', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function choosePalette(name: string) {
  customPaletteName.value = name
  customAccentColor.value = resolvePalette(name).colors.secondary
}

// The palette's own accent is saved as none, so guests see the palette as it is.
function savedAccentColor(): string {
  const paletteAccent = resolvePalette(customPaletteName.value).colors.secondary
  return customAccentColor.value.toLowerCase() === paletteAccent.toLowerCase() ? '' : customAccentColor.value
}

async function saveInvitation() {
  if (!gatheringId.value) return
  isSaving.value = true
  try {
    const updated = await seating.saveInvitation(gatheringId.value, {
      passcode: rsvpData.passcode.trim() || undefined,
      invitationSubject: rsvpData.emailSubject.trim() || undefined,
      invitationMessage: rsvpData.personalMessage.trim() || undefined,
      venue: rsvpData.eventVenue.trim() || undefined,
      eventDate: rsvpData.eventDate.trim() || undefined,
      invitationDesign: {
        mode: designMode.value,
        imageUrl: ownImageUrl.value,
        bannerImageUrl: bannerImageUrl.value,
        paletteName: customPaletteName.value,
        typographyName: customTypographyName.value,
        accentColor: savedAccentColor(),
        templateId: activeTemplatePreset.value.id,
        // An empty field is sent as '' so the server clears it. Leaving it out would keep the old text in the email.
        headerLabel: rsvpData.headerLabel.trim(),
        headline: rsvpData.headline.trim(),
        hostName: rsvpData.hostName.trim(),
        requestLine: rsvpData.requestLine.trim(),
        primaryName: rsvpData.primaryName.trim(),
        scheduleType: rsvpData.scheduleType,
        ceremonyTitle: rsvpData.ceremonyTitle.trim(),
        ceremonyTime: rsvpData.ceremonyTime.trim(),
        ceremonyVenue: rsvpData.ceremonyVenue.trim(),
        receptionTitle: rsvpData.receptionTitle.trim(),
        receptionTime: rsvpData.receptionTime.trim(),
        receptionVenue: rsvpData.receptionVenue.trim(),
        celebrationTitle: rsvpData.celebrationTitle.trim(),
        eventTime: rsvpData.eventTime.trim(),
        deadlineText: rsvpData.deadlineText.trim(),
        ctaText: rsvpData.ctaText.trim(),
      },
    })
    gathering.value = updated
    toast.add({ title: 'Draft saved successfully', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not save draft', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function togglePublish() {
  if (isPublished.value) {
    isPublished.value = false
    return
  }
  isSaving.value = true
  try {
    await saveInvitation()
    isPublished.value = true
    toast.add({ title: '✨ Your invitation is live!', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not publish', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function copyPasscode() {
  if (!rsvpData.passcode) return
  try {
    await navigator.clipboard.writeText(rsvpData.passcode)
    isCopiedPasscode.value = true
    toast.add({ title: 'Passcode copied to clipboard', color: 'success' })
    setTimeout(() => {
      isCopiedPasscode.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy passcode', color: 'warning' })
  }
}

async function copyOpenInvite() {
  if (!openInviteUrl.value) return
  try {
    await navigator.clipboard.writeText(openInviteUrl.value)
    isCopiedOpenInvite.value = true
    toast.add({ title: 'Open invite link copied to clipboard', color: 'success' })
    setTimeout(() => {
      isCopiedOpenInvite.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy link', color: 'warning' })
  }
}

async function copyRsvpLink() {
  const target = openInviteUrl.value || publicInvitationUrl.value
  if (!target) return
  try {
    await navigator.clipboard.writeText(target)
    isCopiedRsvpLink.value = true
    toast.add({ title: 'Invitation link copied', color: 'success' })
    setTimeout(() => {
      isCopiedRsvpLink.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy link', color: 'warning' })
  }
}


// A link that reached the wrong people can only be stopped by replacing it.
async function replaceOpenInvite() {
  if (!gatheringId.value) return
  if (!window.confirm('Replace this link? The current link will stop working for anyone who has it.')) return
  try {
    gathering.value = await seating.setOpenInvite(gatheringId.value, { regenerate: true })
    toast.add({ title: 'Open invite link replaced', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not replace the link', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function updateOpenInvite(enabled: boolean) {
  if (!gatheringId.value) return
  try {
    gathering.value = await seating.setOpenInvite(gatheringId.value, { enabled })
    toast.add({ title: enabled ? 'Open invite enabled' : 'Open invite disabled', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not update open invite', description: getApiErrorMessage(error), color: 'error' })
  }
}
</script>

<template>
  <div>
    <!-- Navbar Actions Teleport -->
    <ClientOnly>
      <!-- Desktop Navbar Actions (Right Side) -->
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <!-- Cohesion Status Badge -->
          <div
            class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-800 border-blue-200"
          >
            <UIcon name="i-lucide-palette" class="w-3.5 h-3.5 text-blue-600" />
            <span>{{ designMode === 'IMAGE' ? 'Custom Stationery' : effectivePalette.name }}</span>
          </div>

          <div v-if="isPublished" class="text-xs md:text-sm font-medium text-blue-600">
            ✨ Your invitation is live!
          </div>

          <UButton
            v-if="isPublished && (openInviteUrl || publicInvitationUrl)"
            icon="i-lucide-copy"
            color="blue"
            variant="outline"
            size="sm"
            @click="copyRsvpLink"
          >
            Copy Link
          </UButton>

          <UButton
            v-if="isPublished && publicInvitationUrl"
            icon="i-lucide-external-link"
            color="blue"
            variant="soft"
            size="sm"
            :to="publicInvitationUrl"
            target="_blank"
          >
            View Invitation
          </UButton>

          <UButton
            v-if="!isPublished"
            icon="i-lucide-save"
            color="blue"
            variant="outline"
            size="sm"
            :loading="isSaving"
            @click="saveInvitation"
          >
            Save Draft
          </UButton>

          <UButton
            :icon="isPublished ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
            color="blue"
            size="sm"
            :loading="isSaving"
            @click="togglePublish"
          >
            {{ isPublished ? 'Edit Invitation' : 'Save & Publish' }}
          </UButton>
        </div>
      </Teleport>

      <!-- Mobile Navbar Actions (Left Toggle Button Menu) -->
      <Teleport to="#navbar-mobile-actions">
        <div class="space-y-2 w-full">
          <div v-if="isPublished" class="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200/80 rounded-xl p-2.5 text-center">
            ✨ Your invitation is live!
          </div>
          <UButton
            :icon="isPublished ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
            color="blue"
            size="md"
            block
            :loading="isSaving"
            class="w-full justify-center font-bold shadow-xs cursor-pointer"
            @click="togglePublish"
          >
            {{ isPublished ? 'Edit Invitation' : 'Save & Publish' }}
          </UButton>
          <UButton
            v-if="!isPublished"
            icon="i-lucide-save"
            color="blue"
            variant="outline"
            size="sm"
            block
            :loading="isSaving"
            class="w-full justify-center cursor-pointer"
            @click="saveInvitation"
          >
            Save Draft
          </UButton>
          <UButton
            v-if="isPublished && publicInvitationUrl"
            icon="i-lucide-external-link"
            color="blue"
            variant="soft"
            size="sm"
            block
            :to="publicInvitationUrl"
            target="_blank"
            class="w-full justify-center cursor-pointer"
          >
            View Live Invitation
          </UButton>
          <UButton
            v-if="isPublished && (openInviteUrl || publicInvitationUrl)"
            icon="i-lucide-copy"
            color="blue"
            variant="outline"
            size="sm"
            block
            class="w-full justify-center cursor-pointer"
            @click="copyRsvpLink"
          >
            Copy RSVP Link
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Main Content Container -->
    <UContainer class="py-6">
      <div v-if="isLoading" class="flex items-center justify-center py-20 text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-blue-600" />
        <span class="ml-2 text-sm font-medium">Loading invitation maker...</span>
      </div>

      <UPageGrid
        v-else
        class="items-start"
        :class="{ 'max-w-3xl mx-auto': isPublished }"
        :grid="{ cols: isPublished ? 1 : '1 md:3' }"
      >
        <!-- LEFT SIDE: Content Blocks & Theme Form (col-span-1) -->
        <UPageCard
          v-if="!isPublished"
          class="bread-container col-span-1 p-0 sm:p-0 overflow-hidden flex flex-col max-h-[calc(100vh-125px)] border border-blue-200/80 shadow-sm"
          :ui="{ container: 'p-0 sm:p-0 lg:p-0 flex flex-col w-full min-h-0 gap-0' }"
        >
          <!-- Static Header with Step Indicator -->
          <div class="px-6 pt-5 pb-4 shrink-0 border-b border-blue-100">
            <div class="relative flex justify-center items-center text-lg font-semibold mb-1 text-toast-900">
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
            <p class="text-center text-xs mx-2 text-stone-500">
              {{ currentStepData?.description }}
            </p>
          </div>

          <!-- Step Scroll Body -->
          <UScrollArea class="w-full shrink min-h-0 my-0 py-0">
            <div class="px-6 py-4">
              <!-- Step 1: Core Details & Templates -->
              <div v-if="currentStepData?.id === 'core-details'" class="flex flex-col gap-4">
                <!-- Constant Event Template Indicator -->
                <div class="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="size-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <UIcon :name="activeTemplatePreset.icon" class="w-4 h-4 text-blue-700" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-xs font-bold text-blue-950 truncate">{{ activeTemplatePreset.name }} Template</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-200/80 text-blue-900 font-semibold">{{ gathering?.eventType || activeTemplatePreset.name }}</span>
                      </div>
                      <p class="text-[11px] text-blue-700 truncate">
                        Template is fixed based on your event type
                      </p>
                    </div>
                  </div>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="blue"
                    icon="i-lucide-rotate-ccw"
                    @click="applyTemplate(activeTemplatePreset.id, true)"
                  >
                    Reset Defaults
                  </UButton>
                </div>

                <!-- Header Label -->
                <UFormField label="Header Tagline" help="Top uppercase label (e.g. WEDDING INVITATION, 18TH BIRTHDAY INVITATION)">
                  <UInput v-model="rsvpData.headerLabel" placeholder="e.g. WEDDING INVITATION" class="w-full uppercase text-xs" />
                </UFormField>

                <!-- Headline -->
                <UFormField label="Event Headline" help="E.g. A Night to Remember, A Blessed Celebration, Let's Celebrate!, You're Invited!">
                  <UInput v-model="rsvpData.headline" placeholder="e.g. You're Invited!" class="w-full font-bold" />
                </UFormField>

                <!-- Host / Company / Organization Name (prominent for Corporate Events) -->
                <UFormField
                  v-if="activeTemplatePreset.id === 'corporate-event' || rsvpData.hostName"
                  label="Company / Organization Name"
                  help="Host presenting the invitation (e.g. [Company / Organization Name])"
                >
                  <UInput v-model="rsvpData.hostName" placeholder="e.g. [Company / Organization Name]" class="w-full font-bold" />
                </UFormField>

                <!-- Introductory Request Line -->
                <UFormField label="Introductory Request Line" help="Opening invitation text">
                  <UTextarea v-model="rsvpData.requestLine" :rows="2" placeholder="e.g. Together with their families," class="w-full" />
                </UFormField>

                <!-- Primary Name(s) -->
                <UFormField label="Celebrant / Couple / Honoree Names" help="The primary focal name(s)">
                  <UInput v-model="rsvpData.primaryName" placeholder="e.g. Sarah & Michael or Chloe" size="lg" class="w-full font-bold" />
                </UFormField>

                <!-- Personal / Narrative Message -->
                <UFormField label="Invitation Message" help="Narrative invitation text">
                  <UTextarea v-model="rsvpData.personalMessage" :rows="3" placeholder="e.g. request the honor of your presence as they celebrate their marriage." class="w-full" />
                </UFormField>

                <!-- Event Date -->
                <UFormField label="Event Date">
                  <UInput type="date" v-model="rsvpData.eventDate" icon="i-lucide-calendar" class="w-full" />
                </UFormField>

                <!-- Schedule & Venue Arrangement -->
                <div class="space-y-3 pt-2 border-t border-stone-200">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Schedule & Location
                    </label>
                    <div class="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-100 text-xs">
                      <button
                        type="button"
                        class="px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors"
                        :class="rsvpData.scheduleType === 'single' ? 'bg-white shadow-2xs text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-800'"
                        @click="rsvpData.scheduleType = 'single'"
                      >
                        Single Location
                      </button>
                      <button
                        type="button"
                        class="px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors"
                        :class="rsvpData.scheduleType === 'dual' ? 'bg-white shadow-2xs text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-800'"
                        @click="rsvpData.scheduleType = 'dual'"
                      >
                        Ceremony + Reception
                      </button>
                    </div>
                  </div>

                  <!-- Dual Schedule (Ceremony & Reception) -->
                  <div v-if="rsvpData.scheduleType === 'dual'" class="space-y-3">
                    <div class="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
                      <div class="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                        <UIcon name="i-lucide-church" class="w-3.5 h-3.5 text-blue-600" />
                        <span>Ceremony Details</span>
                      </div>
                      <UFormField label="Ceremony Section Title">
                        <UInput v-model="rsvpData.ceremonyTitle" placeholder="Section Title (e.g. Ceremony)" class="w-full" />
                      </UFormField>
                      <div class="grid grid-cols-2 gap-2">
                        <UFormField label="Ceremony Time">
                          <UInput v-model="rsvpData.ceremonyTime" placeholder="e.g. 2:00 PM" icon="i-lucide-clock" class="w-full" />
                        </UFormField>
                        <UFormField label="Ceremony Venue">
                          <UInput v-model="rsvpData.ceremonyVenue" placeholder="Ceremony Venue / Church" icon="i-lucide-map-pin" class="w-full" />
                        </UFormField>
                      </div>
                    </div>

                    <div class="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
                      <div class="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                        <UIcon name="i-lucide-party-popper" class="w-3.5 h-3.5 text-blue-600" />
                        <span>Reception Details</span>
                      </div>
                      <UFormField label="Reception Section Title">
                        <UInput v-model="rsvpData.receptionTitle" placeholder="Section Title (e.g. Reception)" class="w-full" />
                      </UFormField>
                      <div class="grid grid-cols-2 gap-2">
                        <UFormField label="Reception Time">
                          <UInput v-model="rsvpData.receptionTime" placeholder="e.g. 5:00 PM" icon="i-lucide-clock" class="w-full" />
                        </UFormField>
                        <UFormField label="Reception Venue">
                          <UInput v-model="rsvpData.receptionVenue" placeholder="Reception Venue / Ballroom" icon="i-lucide-map-pin" class="w-full" />
                        </UFormField>
                      </div>
                    </div>
                  </div>

                  <!-- Single Schedule (Celebration) -->
                  <div v-else class="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
                    <div class="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                      <UIcon name="i-lucide-calendar-clock" class="w-3.5 h-3.5 text-blue-600" />
                      <span>Celebration Details</span>
                    </div>
                    <UFormField label="Celebration Section Title">
                      <UInput v-model="rsvpData.celebrationTitle" placeholder="Section Title (e.g. Celebration)" class="w-full" />
                    </UFormField>
                    <div class="grid grid-cols-2 gap-2">
                      <UFormField label="Event Time">
                        <UInput v-model="rsvpData.eventTime" placeholder="e.g. 6:00 PM" icon="i-lucide-clock" class="w-full" />
                      </UFormField>
                      <UFormField label="Venue / Location">
                        <UInput v-model="rsvpData.eventVenue" placeholder="Event Venue / Location" icon="i-lucide-map-pin" class="w-full" />
                      </UFormField>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 2: RSVP & Access -->
              <div v-else-if="currentStepData?.id === 'rsvp-deadline'" class="flex flex-col gap-4">
                <UFormField label="RSVP Button Label">
                  <UInput v-model="rsvpData.ctaText" placeholder="Confirm Attendance" class="w-full" />
                </UFormField>

                <UFormField label="RSVP Deadline Message">
                  <UTextarea v-model="rsvpData.deadlineText" placeholder="e.g., Kindly confirm your attendance by [RSVP Deadline]." class="w-full" />
                </UFormField>

                <!-- Passcode Protection -->
                <div class="rounded-xl p-4 border border-stone-200 bg-stone-50/70 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 font-semibold text-xs text-stone-800">
                      <UIcon name="i-lucide-key-round" class="w-4 h-4 text-blue-600" />
                      <span>Passcode Protection</span>
                    </div>
                    <UButton
                      v-if="rsvpData.passcode"
                      size="xs"
                      color="blue"
                      variant="ghost"
                      @click="copyPasscode"
                    >
                      {{ isCopiedPasscode ? 'Copied' : 'Copy' }}
                    </UButton>
                  </div>
                  <p class="text-[11px] text-stone-500 leading-relaxed">
                    Require guests to type a code before reading or replying to the invitation. Leave blank for public access.
                  </p>
                  <UInput v-model="rsvpData.passcode" placeholder="e.g. CELEBRATE2026" class="w-full font-mono font-bold" />
                </div>

                <!-- Open Invite Shareable Link -->
                <div class="rounded-xl p-4 border border-stone-200 bg-stone-50/70 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 font-semibold text-xs text-stone-800">
                      <UIcon name="i-lucide-link" class="w-4 h-4 text-blue-600" />
                      <span>Public Open Invite Link</span>
                    </div>
                    <UButton
                      v-if="gathering?.openInvite?.enabled"
                      size="xs"
                      color="blue"
                      variant="ghost"
                      @click="copyOpenInvite"
                    >
                      {{ isCopiedOpenInvite ? 'Copied' : 'Copy Link' }}
                    </UButton>
                  </div>
                  <p class="text-[11px] text-stone-500">
                    Allow anyone with the link to self-register as an attending guest up to plan capacity.
                  </p>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-xs font-medium text-stone-700">Open Registration:</span>
                    <USwitch
                      :model-value="Boolean(gathering?.openInvite?.enabled)"
                      color="blue"
                      aria-label="Open Registration"
                      @update:model-value="updateOpenInvite($event)"
                    />
                  </div>
                  <div v-if="gathering?.openInvite?.enabled && openInviteUrl" class="space-y-1.5 pt-1">
                    <p data-testid="open-invite-link" class="text-[11px] font-mono break-all text-stone-700">
                      {{ openInviteUrl }}
                    </p>
                    <UButton size="xs" color="neutral" variant="outline" @click="replaceOpenInvite">
                      Replace Link
                    </UButton>
                  </div>
                </div>
              </div>

              <!-- Step 3: Top Banner Image or Custom Stationery Upload -->
              <div v-else-if="currentStepData?.id === 'banner-image'" class="flex flex-col gap-4">
                <div class="space-y-2">
                  <label class="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Invitation Presentation Mode
                  </label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      class="p-3 rounded-xl border text-left cursor-pointer transition-all"
                      :class="designMode === 'MAKER'
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-white border-stone-200 hover:border-stone-300'"
                      @click="designMode = 'MAKER'"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold text-xs text-stone-900">Built-in Maker</span>
                        <span v-if="designMode === 'MAKER'" class="w-2 h-2 rounded-full bg-blue-600"></span>
                      </div>
                      <p class="text-[10.5px] text-stone-500">
                        Styled stationery templates and optional 1:5 banner.
                      </p>
                    </button>

                    <button
                      type="button"
                      class="p-3 rounded-xl border text-left cursor-pointer transition-all"
                      :class="designMode === 'IMAGE'
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-white border-stone-200 hover:border-stone-300'"
                      @click="designMode = 'IMAGE'"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold text-xs text-stone-900">Custom Image</span>
                        <span v-if="designMode === 'IMAGE'" class="w-2 h-2 rounded-full bg-blue-600"></span>
                      </div>
                      <p class="text-[10.5px] text-stone-500">
                        Upload your full bespoke stationery artwork.
                      </p>
                    </button>
                  </div>
                </div>

                <!-- Banner image upload section for Maker mode -->
                <div v-if="designMode === 'MAKER'" class="space-y-3 pt-1">
                  <input
                    ref="bannerFileInputRef"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="hidden"
                    @change="handleBannerUpload"
                  />

                  <div class="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>1:5 Header Banner Image (Optional)</span>
                    <span v-if="bannerImageUrl" class="text-blue-600 font-medium">Active</span>
                  </div>

                  <div v-if="bannerImageUrl" class="space-y-2">
                    <div class="rounded-xl overflow-hidden border border-stone-200 shadow-2xs">
                      <img :src="bannerImageUrl" alt="Banner" class="w-full aspect-5/1 object-cover" />
                    </div>
                    <div class="flex items-center gap-2">
                      <UButton size="xs" variant="outline" color="neutral" @click="bannerFileInputRef?.click()">
                        Replace Banner
                      </UButton>
                      <UButton size="xs" variant="ghost" color="error" @click="removeBanner">
                        Remove
                      </UButton>
                    </div>
                  </div>

                  <div
                    v-else
                    class="p-5 rounded-xl border-2 border-dashed border-stone-300 hover:border-blue-400 transition-colors text-center cursor-pointer space-y-1.5 bg-stone-50/50"
                    @click="bannerFileInputRef?.click()"
                  >
                    <UIcon name="i-lucide-upload" class="w-6 h-6 text-blue-600 mx-auto" />
                    <p class="text-xs font-semibold text-stone-800">Upload 1:5 Panoramic Banner</p>
                    <p class="text-[11px] text-stone-500">PNG, JPG or WEBP (Wide horizontal)</p>
                  </div>
                </div>

                <!-- Custom stationery image upload section for IMAGE mode -->
                <div v-else class="space-y-3 pt-1">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="hidden"
                    @change="handleImageUpload"
                  />

                  <div class="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>Full Invitation Graphic</span>
                    <span v-if="ownImageUrl" class="text-blue-600 font-medium">Active</span>
                  </div>

                  <div v-if="ownImageUrl" class="space-y-2">
                    <div class="rounded-xl overflow-hidden border border-stone-200 shadow-2xs max-h-56">
                      <img :src="ownImageUrl" alt="Stationery" class="w-full h-auto object-contain mx-auto" />
                    </div>
                    <div class="flex items-center gap-2">
                      <UButton size="xs" variant="outline" color="neutral" @click="fileInputRef?.click()">
                        Replace Image
                      </UButton>
                      <UButton size="xs" variant="ghost" color="error" @click="removeImage">
                        Remove
                      </UButton>
                    </div>
                  </div>

                  <div
                    v-else
                    class="p-6 rounded-xl border-2 border-dashed border-stone-300 hover:border-blue-400 transition-colors text-center cursor-pointer space-y-2 bg-stone-50/50"
                    @click="fileInputRef?.click()"
                  >
                    <UIcon name="i-lucide-image-up" class="w-7 h-7 text-blue-600 mx-auto" />
                    <p class="text-xs font-semibold text-stone-800">Upload Invitation Graphic</p>
                    <p class="text-[11px] text-stone-500">JPG or PNG of your complete invitation design</p>
                  </div>
                </div>
              </div>

              <!-- Step 4: Style & Cohesion -->
              <div v-else-if="currentStepData?.id === 'style-cohesion'" class="flex flex-col gap-4">
                <!-- Color Palettes Selector -->
                <div class="space-y-2">
                  <label class="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Color Palette
                  </label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      v-for="palette in colorPalettes"
                      :key="palette.name"
                      type="button"
                      class="p-2.5 rounded-xl border text-left cursor-pointer transition-all"
                      :class="customPaletteName === palette.name
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-stone-200 bg-white hover:border-stone-300'"
                      @click="choosePalette(palette.name)"
                    >
                      <span class="text-xs font-semibold text-stone-900 block truncate">{{ palette.name }}</span>
                      <div class="flex items-center gap-1 mt-1.5">
                        <div
                          v-for="(hex, key) in palette.colors"
                          :key="key"
                          class="size-3.5 rounded-full border border-black/10"
                          :style="{ backgroundColor: hex }"
                        />
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Typography Pairings Selector -->
                <div class="space-y-2 pt-2 border-t border-stone-200">
                  <label class="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Typography Pairing
                  </label>
                  <div class="grid grid-cols-1 gap-2">
                    <button
                      v-for="typo in typographySets"
                      :key="typo.name"
                      type="button"
                      class="p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between"
                      :class="customTypographyName === typo.name
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-stone-200 bg-white hover:border-stone-300'"
                      @click="customTypographyName = typo.name"
                    >
                      <div>
                        <span class="text-xs font-bold text-stone-900 block">{{ typo.name }}</span>
                        <span class="text-[11px] text-stone-500">{{ typo.headerFont }} + {{ typo.subheaderFont }}</span>
                      </div>
                      <span class="text-xl" :style="{ fontFamily: typo.headerFont }">Aa</span>
                    </button>
                  </div>
                </div>

                <!-- Custom Accent Color -->
                <div class="p-3.5 rounded-xl border border-stone-200 bg-white shadow-xs space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-stone-800">Accent Highlight Color</span>
                    <input
                      v-model="customAccentColor"
                      type="color"
                      class="size-6 rounded border cursor-pointer"
                    />
                  </div>
                  <p class="text-[11px] text-stone-500">
                    Used for RSVP button, dividers, and decorative stationery accents.
                  </p>
                </div>
              </div>
            </div>
          </UScrollArea>

          <!-- Step Navigation Footer -->
          <div class="px-6 py-4 shrink-0 border-t border-blue-100 bg-stone-50/50 flex items-center justify-between">
            <UButton
              v-if="currentStep > 0"
              variant="outline"
              color="neutral"
              size="sm"
              @click="currentStep--"
            >
              Previous
            </UButton>
            <div v-else />

            <div class="flex items-center gap-2">
              <UButton
                v-if="currentStep < steps.length - 1"
                icon="i-lucide-arrow-right"
                color="blue"
                size="sm"
                @click="currentStep++"
              >
                Next Step
              </UButton>
              <UButton
                v-else
                icon="i-lucide-check-circle"
                color="blue"
                size="sm"
                :loading="isSaving"
                @click="saveInvitation"
              >
                Save & Publish
              </UButton>
            </div>
          </div>
        </UPageCard>

        <!-- RIGHT SIDE: Live Preview (col-span-2) -->
        <div :class="isPublished ? 'col-span-full' : 'col-span-2'" class="flex flex-col gap-4">
          <!-- Preview Switcher -->
          <div class="flex items-center justify-end px-1">
            <div class="inline-flex p-1 rounded-xl bg-stone-100 border border-stone-200/80 shadow-xs">
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                :class="previewMode === 'stationery'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'"
                @click="previewMode = 'stationery'"
              >
                <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
                <span>Web Stationery</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                :class="previewMode === 'email'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'"
                @click="previewMode = 'email'"
              >
                <UIcon name="i-lucide-mail" class="w-3.5 h-3.5 text-blue-600" />
                <span>Email Client Preview</span>
              </button>
            </div>
          </div>

          <!-- 1. Luxury Stationery Invitation Card (Web View) -->
          <div
            v-if="previewMode === 'stationery'"
            class="w-full transition-all duration-300"
            :class="isPublished ? 'max-w-xl mx-auto my-4' : 'w-full'"
          >
            <JamInvitationCard
              :gathering-name="gathering?.name || 'Gathering'"
              :venue="rsvpData.eventVenue || gathering?.venue || ''"
              :event-date="rsvpData.eventDate"
              :message="rsvpData.personalMessage"
              :design="{
                mode: designMode,
                imageUrl: ownImageUrl,
                bannerImageUrl: bannerImageUrl,
                paletteName: customPaletteName,
                typographyName: customTypographyName,
                accentColor: customAccentColor,
                templateId: activeTemplatePreset.id,
                headerLabel: rsvpData.headerLabel,
                headline: rsvpData.headline,
                hostName: rsvpData.hostName,
                requestLine: rsvpData.requestLine,
                primaryName: rsvpData.primaryName,
                scheduleType: rsvpData.scheduleType,
                ceremonyTitle: rsvpData.ceremonyTitle,
                ceremonyTime: rsvpData.ceremonyTime,
                ceremonyVenue: rsvpData.ceremonyVenue,
                receptionTitle: rsvpData.receptionTitle,
                receptionTime: rsvpData.receptionTime,
                receptionVenue: rsvpData.receptionVenue,
                celebrationTitle: rsvpData.celebrationTitle,
                eventTime: rsvpData.eventTime,
                deadlineText: rsvpData.deadlineText,
                ctaText: rsvpData.ctaText,
              }"
              :cta-href="openInviteUrl || publicInvitationUrl || '#'"
              :show-cta="true"
            />
          </div>

          <!-- 2. Email Client Preview (Email View) -->
          <div
            v-else
            class="white-bread-container p-4 sm:p-6 rounded-2xl border border-bread-200/90 shadow-lg space-y-4 max-w-lg mx-auto w-full bg-white font-sans text-left"
          >
            <!-- Email Header Meta -->
            <div class="border-b border-bread-200/60 pb-3 space-y-1">
              <div class="flex items-center justify-between text-xs text-muted">
                <span>From: <strong>Bread & Butter Invites</strong> &lt;invitations@bread-plus-butter.com&gt;</span>
                <span class="text-[10px]">Just now</span>
              </div>
              <div class="text-xs text-toast-900">
                <span class="text-muted">Subject: </span>
                <strong>{{ rsvpData.emailSubject || 'You are warmly invited!' }}</strong>
              </div>
            </div>

            <!-- Email Body Content -->
            <div class="space-y-4 pt-2">
              <div
                v-if="bannerImageUrl"
                class="rounded-xl overflow-hidden border border-bread-200/60"
              >
                <img :src="bannerImageUrl" alt="Banner" class="w-full aspect-5/1 object-cover" />
              </div>

              <div class="space-y-2 text-center py-2">
                <p v-if="rsvpData.headerLabel" class="text-xs text-muted uppercase tracking-wider font-semibold">
                  {{ rsvpData.headerLabel }}
                </p>
                <h2 class="font-serif font-bold text-2xl text-toast-900">
                  {{ rsvpData.headline || rsvpData.primaryName || gathering?.name }}
                </h2>
                <p v-if="rsvpData.hostName" class="font-bold text-sm text-toast-800">
                  {{ rsvpData.hostName }}
                </p>
                <p v-if="rsvpData.requestLine" class="text-xs text-stone-600 whitespace-pre-line">
                  {{ rsvpData.requestLine }}
                </p>
                <p v-if="rsvpData.headline && rsvpData.primaryName" class="font-bold text-lg text-toast-900">
                  {{ rsvpData.primaryName }}
                </p>
                <p class="text-xs text-toast-700 font-semibold pt-1">
                  {{ formatDateWithWeekday(rsvpData.eventDate) || 'Event Date' }}
                </p>
                <div v-if="rsvpData.scheduleType === 'dual'" class="text-xs text-stone-600 space-y-1">
                  <p><strong>{{ rsvpData.ceremonyTitle }}:</strong> {{ rsvpData.ceremonyTime }} · {{ rsvpData.ceremonyVenue }}</p>
                  <p><strong>{{ rsvpData.receptionTitle }}:</strong> {{ rsvpData.receptionTime }} · {{ rsvpData.receptionVenue }}</p>
                </div>
                <div v-else class="text-xs text-stone-600">
                  <p>{{ formatTime(rsvpData.eventTime) || rsvpData.eventTime }} <span v-if="rsvpData.eventVenue">· {{ rsvpData.eventVenue }}</span></p>
                </div>
              </div>

              <div
                v-if="rsvpData.personalMessage"
                class="bg-toast-50/70 p-3.5 rounded-xl border border-bread-200/60 text-xs text-toast-800 leading-relaxed text-center"
              >
                {{ rsvpData.personalMessage }}
              </div>

              <div class="text-center pt-3 pb-2">
                <a
                  :href="guestRsvpSampleUrl || '#'"
                  target="_blank"
                  class="inline-block bg-toast-800 hover:bg-toast-900 text-white font-bold text-xs px-8 py-3 rounded-xl shadow-sm transition-all"
                >
                  {{ rsvpData.ctaText || 'Confirm Attendance' }}
                </a>
                <p v-if="rsvpData.deadlineText" class="text-[10.5px] text-muted mt-2">
                  {{ rsvpData.deadlineText }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </UPageGrid>
    </UContainer>
  </div>
</template>
