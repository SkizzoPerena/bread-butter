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
import { getApiErrorMessage } from '~/types/auth'
import { currentOriginPath } from '~/utils/seatingQr'

definePageMeta({
  layout: 'jam-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Invitation Maker',
  bgClass: 'bg-violet-50',
  middleware: 'seating-enabled',
})

useWeddingFonts()

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { setActiveEvent } = useActiveEvent()
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
  { id: 'core-details', label: '1. Event Details', description: 'Names, headline, date, time, and venue' },
  { id: 'rsvp-deadline', label: '2. RSVP & Access', description: 'RSVP deadline, passcode, and open invite link' },
  { id: 'banner-image', label: '3. Stationery & Banner', description: 'Upload a panoramic banner or your own invitation image' },
  { id: 'style-cohesion', label: '4. Colors & Fonts', description: 'Choose color palettes, typography, and accent colors' },
]
const currentStepData = computed(() => steps[currentStep.value])

// Preview Mode: Stationery vs Email Client
const previewMode = ref<'stationery' | 'email'>('stationery')

// Editor Form State
const rsvpData = reactive({
  requestLine: 'Together with their families',
  headline: '',
  eventDate: '',
  eventTime: '18:00',
  eventVenue: '',
  deadlineText: 'Kindly reply by the deadline so we can prepare your table and seat.',
  passcode: '',
  emailSubject: 'You are warmly invited to celebrate with us!',
  personalMessage: '',
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

    // Populate editor fields
    rsvpData.headline = gatheringData.invitationDesign?.headline || gatheringData.name || ''
    rsvpData.requestLine = gatheringData.invitationDesign?.requestLine || 'Together with their families'
    rsvpData.eventVenue = gatheringData.venue || ''
    rsvpData.eventDate = gatheringData.eventDate ? gatheringData.eventDate.slice(0, 10) : ''
    rsvpData.eventTime = gatheringData.invitationDesign?.eventTime || '18:00'
    rsvpData.deadlineText = gatheringData.invitationDesign?.deadlineText || 'Kindly reply by the deadline so we can prepare your table and seat.'
    rsvpData.passcode = gatheringData.passcode || ''
    rsvpData.emailSubject = gatheringData.invitationSubject || `You are warmly invited to ${gatheringData.name}!`
    rsvpData.personalMessage = gatheringData.invitationMessage || ''

    if (gatheringData.invitationDesign) {
      const d = gatheringData.invitationDesign
      designMode.value = d.mode || 'MAKER'
      ownImageUrl.value = d.imageUrl || ''
      bannerImageUrl.value = d.bannerImageUrl || ''
      if (d.paletteName) customPaletteName.value = d.paletteName
      if (d.typographyName) customTypographyName.value = d.typographyName
      customAccentColor.value = d.accentColor || resolvePalette(customPaletteName.value).colors.secondary
    }

    isPublished.value = Boolean(
      gatheringData.invitationDesign?.headline ||
      gatheringData.invitationDesign?.imageUrl ||
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
      passcode: rsvpData.passcode.trim(),
      invitationSubject: rsvpData.emailSubject.trim(),
      invitationMessage: rsvpData.personalMessage.trim(),
      invitationDesign: {
        mode: designMode.value,
        imageUrl: ownImageUrl.value,
        bannerImageUrl: bannerImageUrl.value,
        headline: rsvpData.headline.trim() || undefined,
        requestLine: rsvpData.requestLine.trim() || undefined,
        eventTime: rsvpData.eventTime.trim() || undefined,
        deadlineText: rsvpData.deadlineText.trim() || undefined,
        paletteName: customPaletteName.value,
        typographyName: customTypographyName.value,
        accentColor: savedAccentColor(),
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

async function updateOpenInvite(enabled: boolean) {
  if (!gatheringId.value) return
  try {
    gathering.value = await seating.setOpenInvite(gatheringId.value, { enabled })
    toast.add({ title: enabled ? 'Open invite enabled' : 'Open invite disabled', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not update open invite', description: getApiErrorMessage(error), color: 'error' })
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
</script>

<template>
  <div>
    <!-- Navbar Actions Teleport matching InvitationMaker.vue -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <!-- Cohesion Status Badge -->
          <div
            class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-violet-50 text-violet-800 border-violet-200"
          >
            <UIcon name="i-lucide-palette" class="w-3.5 h-3.5 text-violet-600" />
            <span>{{ designMode === 'IMAGE' ? 'Custom Stationery' : effectivePalette.name }}</span>
          </div>

          <div v-if="isPublished" class="text-xs md:text-sm font-medium text-violet-600">
            ✨ Your invitation is live!
          </div>

          <UButton
            v-if="isPublished && (openInviteUrl || publicInvitationUrl)"
            icon="i-lucide-copy"
            color="violet"
            variant="outline"
            size="sm"
            @click="copyRsvpLink"
          >
            Copy Link
          </UButton>

          <UButton
            v-if="isPublished && publicInvitationUrl"
            icon="i-lucide-external-link"
            color="violet"
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
            color="violet"
            variant="outline"
            size="sm"
            :loading="isSaving"
            @click="saveInvitation"
          >
            Save Draft
          </UButton>

          <UButton
            :icon="isPublished ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
            color="violet"
            size="sm"
            :loading="isSaving"
            @click="togglePublish"
          >
            {{ isPublished ? 'Edit Invitation' : 'Save & Publish' }}
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Main Content Container matching InvitationMaker.vue layout -->
    <UContainer class="py-6">
      <div v-if="isLoading" class="flex items-center justify-center py-20 text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-violet-600" />
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
          class="bread-container col-span-1 p-0 sm:p-0 overflow-hidden flex flex-col max-h-[calc(100vh-125px)] border border-violet-200/80 shadow-sm"
          :ui="{ container: 'p-0 sm:p-0 lg:p-0 flex flex-col w-full min-h-0 gap-0' }"
        >
          <!-- Static Header with Step Indicator -->
          <div class="px-6 pt-5 pb-4 shrink-0 border-b border-violet-100">
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
              <!-- Step 1: Core Details -->
              <div v-if="currentStepData?.id === 'core-details'" class="flex flex-col gap-4">
                <UFormField label="Introductory Line">
                  <UInput v-model="rsvpData.requestLine" placeholder="e.g., Together with their families" class="w-full" />
                </UFormField>
                <UFormField label="Event Headline">
                  <UInput v-model="rsvpData.headline" placeholder="e.g., Sarah & Michael are getting married!" size="lg" class="w-full" />
                </UFormField>
                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Event Date">
                    <UInput type="date" v-model="rsvpData.eventDate" icon="i-lucide-calendar" class="w-full" />
                  </UFormField>
                  <UFormField label="Event Time">
                    <UInput type="text" v-model="rsvpData.eventTime" placeholder="6:00 PM" icon="i-lucide-clock" class="w-full" />
                  </UFormField>
                </div>
                <UFormField label="Venue / Location">
                  <UInput v-model="rsvpData.eventVenue" placeholder="e.g., The Grand Ballroom, Manila" icon="i-lucide-map-pin" class="w-full" />
                </UFormField>
              </div>

              <!-- Step 2: RSVP & Deadline -->
              <div v-else-if="currentStepData?.id === 'rsvp-deadline'" class="flex flex-col gap-4">
                <UFormField label="RSVP Deadline Message">
                  <UTextarea v-model="rsvpData.deadlineText" placeholder="e.g., Kindly reply by March 1 so we can prepare your table and seat." class="w-full" />
                </UFormField>

                <!-- Passcode Protection -->
                <div class="rounded-xl p-4 border border-stone-200 bg-stone-50/70 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 font-semibold text-xs text-stone-800">
                      <UIcon name="i-lucide-key-round" class="w-4 h-4 text-violet-600" />
                      <span>Passcode Protection</span>
                    </div>
                    <UButton
                      v-if="rsvpData.passcode"
                      size="xs"
                      color="violet"
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
                      <UIcon name="i-lucide-link" class="w-4 h-4 text-violet-600" />
                      <span>Public Open Invite Link</span>
                    </div>
                    <UButton
                      v-if="gathering?.openInvite?.enabled"
                      size="xs"
                      color="violet"
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
                      color="violet"
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
                        ? 'bg-violet-50 border-violet-400 ring-2 ring-violet-500/20'
                        : 'bg-white border-stone-200 hover:border-stone-300'"
                      @click="designMode = 'MAKER'"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold text-xs text-stone-900">Built-in Maker</span>
                        <span v-if="designMode === 'MAKER'" class="w-2 h-2 rounded-full bg-violet-600"></span>
                      </div>
                      <p class="text-[10.5px] text-stone-500">
                        Styled typography and optional 1:5 banner.
                      </p>
                    </button>

                    <button
                      type="button"
                      class="p-3 rounded-xl border text-left cursor-pointer transition-all"
                      :class="designMode === 'IMAGE'
                        ? 'bg-violet-50 border-violet-400 ring-2 ring-violet-500/20'
                        : 'bg-white border-stone-200 hover:border-stone-300'"
                      @click="designMode = 'IMAGE'"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold text-xs text-stone-900">Custom Image</span>
                        <span v-if="designMode === 'IMAGE'" class="w-2 h-2 rounded-full bg-violet-600"></span>
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
                    <span v-if="bannerImageUrl" class="text-violet-600 font-medium">Active</span>
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
                    class="p-5 rounded-xl border-2 border-dashed border-stone-300 hover:border-violet-400 transition-colors text-center cursor-pointer space-y-1.5 bg-stone-50/50"
                    @click="bannerFileInputRef?.click()"
                  >
                    <UIcon name="i-lucide-upload" class="w-6 h-6 text-violet-600 mx-auto" />
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
                    <span v-if="ownImageUrl" class="text-violet-600 font-medium">Active</span>
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
                    class="p-6 rounded-xl border-2 border-dashed border-stone-300 hover:border-violet-400 transition-colors text-center cursor-pointer space-y-2 bg-stone-50/50"
                    @click="fileInputRef?.click()"
                  >
                    <UIcon name="i-lucide-image-up" class="w-7 h-7 text-violet-600 mx-auto" />
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
                        ? 'border-violet-500 bg-violet-50/60 ring-2 ring-violet-500/20'
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
                        ? 'border-violet-500 bg-violet-50/60 ring-2 ring-violet-500/20'
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
          <div class="px-6 py-4 shrink-0 border-t border-violet-100 bg-stone-50/50 flex items-center justify-between">
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
                color="violet"
                size="sm"
                @click="currentStep++"
              >
                Next Step
              </UButton>
              <UButton
                v-else
                icon="i-lucide-check-circle"
                color="violet"
                size="sm"
                :loading="isSaving"
                @click="saveInvitation"
              >
                Save & Publish
              </UButton>
            </div>
          </div>
        </UPageCard>

        <!-- RIGHT SIDE: Live Preview (col-span-2) matching InvitationMaker.vue -->
        <div :class="isPublished ? 'col-span-full' : 'col-span-2'" class="flex flex-col gap-4">
          <!-- Preview Switcher -->
          <div class="flex items-center justify-end px-1">
            <div class="inline-flex p-1 rounded-xl bg-stone-100 border border-stone-200/80 shadow-xs">
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                :class="previewMode === 'stationery'
                  ? 'bg-white text-violet-700 shadow-xs'
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
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'"
                @click="previewMode = 'email'"
              >
                <UIcon name="i-lucide-mail" class="w-3.5 h-3.5 text-violet-600" />
                <span>Email Client Preview</span>
              </button>
            </div>
          </div>

          <!-- 1. Luxury Stationery Invitation Card (Web View) -->
          <div
            v-if="previewMode === 'stationery'"
            class="relative rounded-2xl transition-all duration-300 shadow-xl overflow-hidden"
            :class="[
              isPublished ? 'max-w-2xl mx-auto w-full my-4' : 'w-full',
              bannerImageUrl ? '' : 'p-8 sm:p-12'
            ]"
            :style="{
              backgroundColor: effectivePalette.colors.primary,
              borderColor: effectivePalette.colors.secondary,
              borderWidth: '2px',
              borderStyle: 'solid'
            }"
          >
            <!-- Mode A: Custom Stationery Image Uploaded -->
            <div v-if="designMode === 'IMAGE' && ownImageUrl" class="p-4 sm:p-6 text-center space-y-4">
              <img :src="ownImageUrl" alt="Stationery" class="max-w-full h-auto rounded-xl shadow-md mx-auto" />
              <div class="pt-2">
                <a
                  :href="openInviteUrl || publicInvitationUrl || '#'"
                  target="_blank"
                  class="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-semibold text-sm transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                  :style="{
                    backgroundColor: effectivePalette.colors.secondary,
                    color: effectivePalette.colors.secondary_text_color,
                    fontFamily: effectiveTypography.subheaderFont
                  }"
                >
                  <span>RSVP Here</span>
                  <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
                </a>
              </div>
            </div>

            <!-- Mode B: Built-in Maker Canvas -->
            <div v-else>
              <!-- 1:5 Header Banner Image (Flush Top & Sides) -->
              <div
                v-if="bannerImageUrl"
                class="w-full overflow-hidden border-b"
                :style="{ borderColor: `${effectivePalette.colors.secondary}40` }"
              >
                <img
                  :src="bannerImageUrl"
                  alt="Invitation Header Banner"
                  class="w-full aspect-5/1 object-cover object-center block"
                />
              </div>

              <!-- Card Content Wrapper with Double Border Frame -->
              <div
                class="relative"
                :class="bannerImageUrl ? 'p-6 sm:p-10' : ''"
              >
                <div
                  class="absolute inset-3 sm:inset-4 rounded-xl pointer-events-none"
                  :style="{
                    borderColor: `${effectivePalette.colors.secondary}45`,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }"
                />

                <div class="relative z-10 flex flex-col gap-6 text-center py-4 px-2 sm:px-6">
                  <!-- Header Area -->
                  <div class="space-y-3">
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
                      class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight"
                      :style="{
                        color: effectivePalette.colors.text_color,
                        fontFamily: effectiveTypography.headerFont
                      }"
                    >
                      {{ rsvpData.headline || gathering?.name || 'Celebration' }}
                    </h1>

                    <!-- Date, Time, Venue -->
                    <div class="mt-4 flex flex-col items-center gap-1">
                      <div
                        class="text-sm sm:text-base font-semibold uppercase tracking-wider"
                        :style="{
                          color: effectivePalette.colors.text_color,
                          fontFamily: effectiveTypography.subheaderFont
                        }"
                      >
                        {{ formatDateWithWeekday(rsvpData.eventDate) || 'Saturday, October 24, 2026' }}
                      </div>

                      <div
                        v-if="rsvpData.eventTime"
                        class="text-xs sm:text-sm"
                        :style="{
                          color: effectivePalette.colors.secondary_text_color,
                          fontFamily: effectiveTypography.bodyFont
                        }"
                      >
                        {{ formatTime(rsvpData.eventTime) || rsvpData.eventTime }}
                      </div>

                      <div
                        v-if="rsvpData.eventVenue"
                        class="flex items-center text-xs sm:text-sm font-medium pt-1"
                        :style="{
                          color: effectivePalette.colors.text_color,
                          fontFamily: effectiveTypography.subheaderFont
                        }"
                      >
                        <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 mr-1 opacity-70" />
                        {{ rsvpData.eventVenue }}
                      </div>
                    </div>
                  </div>

                  <!-- Decorative Divider -->
                  <div class="flex items-center justify-center my-0.5">
                    <div
                      class="w-14 h-[1px]"
                      :style="{ backgroundColor: `${effectivePalette.colors.secondary}70` }"
                    />
                    <span class="mx-3 text-xs" :style="{ color: effectivePalette.colors.secondary }">✦</span>
                    <div
                      class="w-14 h-[1px]"
                      :style="{ backgroundColor: `${effectivePalette.colors.secondary}70` }"
                    />
                  </div>

                  <!-- Prominent "RSVP Here" CTA Button -->
                  <div class="my-2 flex flex-col items-center justify-center gap-2">
                    <a
                      :href="openInviteUrl || publicInvitationUrl || '#'"
                      target="_blank"
                      class="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-full font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                      :style="{
                        backgroundColor: effectivePalette.colors.secondary,
                        color: effectivePalette.colors.secondary_text_color,
                        fontFamily: effectiveTypography.subheaderFont
                      }"
                    >
                      <span>RSVP Here</span>
                      <UIcon name="i-lucide-arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>

                  <!-- Deadline & Security Info -->
                  <div class="space-y-1">
                    <p
                      class="text-xs max-w-md mx-auto leading-relaxed"
                      :style="{
                        color: effectivePalette.colors.secondary_text_color,
                        fontFamily: effectiveTypography.bodyFont
                      }"
                    >
                      {{ rsvpData.deadlineText }}
                    </p>
                    <p
                      v-if="rsvpData.passcode"
                      class="text-[11px] font-mono font-semibold"
                      :style="{ color: effectivePalette.colors.secondary_text_color }"
                    >
                      Passcode: {{ rsvpData.passcode }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                <p class="text-xs text-muted uppercase tracking-wider font-semibold">You're Invited to</p>
                <h2 class="font-serif font-bold text-2xl text-toast-900">
                  {{ rsvpData.headline || gathering?.name }}
                </h2>
                <p class="text-xs text-toast-700">
                  {{ formatDateWithWeekday(rsvpData.eventDate) }} · {{ formatTime(rsvpData.eventTime) }}
                </p>
                <p v-if="rsvpData.eventVenue" class="text-xs text-muted">
                  {{ rsvpData.eventVenue }}
                </p>
              </div>

              <div
                v-if="rsvpData.personalMessage"
                class="bg-toast-50/70 p-3.5 rounded-xl border border-bread-200/60 text-xs text-toast-800 leading-relaxed"
              >
                {{ rsvpData.personalMessage }}
              </div>

              <div class="text-center pt-3 pb-2">
                <a
                  :href="guestRsvpSampleUrl || '#'"
                  target="_blank"
                  class="inline-block bg-toast-800 hover:bg-toast-900 text-white font-bold text-xs px-8 py-3 rounded-xl shadow-sm transition-all"
                >
                  RSVP & View Invitation
                </a>
                <p class="text-[10.5px] text-muted mt-2">
                  Clicking the button opens your personalized guest invitation and RSVP questionnaire.
                </p>
              </div>
            </div>
          </div>
        </div>
      </UPageGrid>
    </UContainer>
  </div>
</template>
