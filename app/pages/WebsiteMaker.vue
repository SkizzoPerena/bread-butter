<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'event-sub-navbar',
  title: 'Website Maker',
  bgClass: 'bg-blue-50'
})

import aisleImage from '../assets/bpb-images/login-aisle.jpg'
import { getApiErrorMessage, reportApiError } from '~/types/auth'
import type { EventRecord } from '~/types/event'
import { isEventFullyPaid } from '~/types/payment'
import {
  applyCustomSiteToEditor,
  buildCustomSiteFormData,
  validateWebsiteEditorForSave,
} from '~/utils/customSiteForm'
import {
  colorPalettes,
  typographySets,
  resolvePalette,
  resolveTypography,
  getDynamicStyle,
  formatDateWithWeekday,
  getGoogleMapsUrl,
  type ColorPalette,
  type TypographySet,
} from '~/utils/websiteTheme'

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { fetchEvent } = useEvents()
const {
  fetchCustomSitesByEvent,
  createCustomSite,
  updateCustomSite,
  publishCustomSite,
  getSaveWebsiteEndpoint,
} = useCustomSite()

function displaySaveWebsiteEndpoint(customSiteIdForSave: string | null) {
  if (isUiOnlyMode.value) {
    const message = 'UI-only mode — no API request'
    console.info('[Save Website]', message)
    toast.add({ title: 'Save Website', description: message, color: 'info' })
    return
  }
  const { method, url } = getSaveWebsiteEndpoint(customSiteIdForSave)
  console.info(`[Save Website] ${method} ${url}`)
  toast.add({
    title: 'Save Website',
    description: `${method} ${url}`,
    color: 'info',
  })
}

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const customSiteId = ref<string | null>(null)
const eventRecord = ref<EventRecord | null>(null)
const isLoadingSite = ref(false)
const isLoadingEvent = ref(false)
const isSaving = ref(false)

const canPublishWebsite = computed(() => {
  if (isUiOnlyMode.value) {
    return true
  }
  return isEventFullyPaid(eventRecord.value)
})

const previewSiteTitle = computed(
  () => websiteData.siteTitle.trim() || eventRecord.value?.eventName?.trim() || 'Your Site Title'
)

const previewSiteDescription = computed(
  () =>
    websiteData.siteDescription.trim() ||
    eventRecord.value?.description?.trim() ||
    'Your site description goes here.'
)

const liveSiteSlug = computed(() => {
  const domain = websiteData.domainName.trim()
  if (domain) {
    return domain.slice(0, 50)
  }
  return websiteData.siteTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
})

const liveSiteLink = computed(() =>
  liveSiteSlug.value ? `/sites/${encodeURIComponent(liveSiteSlug.value)}` : null
)

const loadedCustomSiteFromApi = ref(false)

// 1. Website Data
const websiteData = reactive({
    format: 'format1', // 'format1' = Classic Stack, 'format2' = Side-by-Side
    siteTitle: '',
    siteDescription: '',
    domainName: '',
    contactEmail: '', // Default motif
    motif: 'Classic Romance',
    colorPalette: 'Blush & Mauve', // Default color palette
    typography: 'Romantic Script', // Default typography set
    headerImage: '', // New: Header background image URL
    endingTitle: 'Hope to see you there!',
    endingMessage: 'We cannot wait to celebrate this special day with all of our favorite people.',
    isPasswordProtected: false,
    sitePassword: '',
    rsvpDeadlineDate: '2024-12-31', // Mocked from account data
    whereToStayLocation: 'Central Park, New York'
})

// Motif Data
const motifs = [
    { name: 'Classic Romance', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop', description: 'Timeless elegance with soft pastels and delicate details.', palette: 'Blush & Mauve', typography: 'Romantic Script' },
    { name: 'Boho Desert', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=2070&auto=format&fit=crop', description: 'Free-spirited and earthy with natural textures and warm tones.', palette: 'Terracotta & Olive', typography: 'Whimsical Script' },
    { name: 'Modern Minimalist', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop', description: 'Clean lines, simple color palettes, and a focus on architecture.', palette: 'Modern Black Tie', typography: 'Modern Sans' },
    { name: 'Enchanted Forest', image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop', description: 'Lush greenery, deep emeralds, and a magical woodland atmosphere.', palette: 'Emerald & Gold', typography: 'Casual Script' },
    { name: 'Vintage Glamour', image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?q=80&w=2070&auto=format&fit=crop', description: 'Old Hollywood opulence with rich burgundy and bold contrasts.', palette: 'Burgundy & Gold', typography: 'Bold & Expressive' },
    { name: 'Coastal Serenity', image: 'https://images.unsplash.com/photo-1499810631641-541e76d678a2?q=80&w=2070&auto=format&fit=crop', description: 'Breezy and calm with soft blues, sage greens, and ocean vibes.', palette: 'Dusty Blue Serenity', typography: 'Casual Script' },
    { name: 'Royal Elegance', image: 'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?q=80&w=2070&auto=format&fit=crop', description: 'Regal and sophisticated with deep purples and luxurious accents.', palette: 'Lavender & Silver', typography: 'Romantic Script' },
    { name: 'Starry Night', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop', description: 'A dreamy evening under the stars with deep blues and golden hues.', palette: 'Navy & Champagne', typography: 'Elegant Serif' }
]

const selectMotif = (motif: typeof motifs[0]) => {
    websiteData.motif = motif.name
    websiteData.colorPalette = motif.palette
    websiteData.typography = motif.typography
}

// 2. Dynamic Content Sections
interface WebsiteSection {
    id: number;
    type: 'heading' | 'paragraph'; // Simplified for initial example
    content: string;
}

const sections = ref<WebsiteSection[]>([
    { id: Date.now(), type: 'heading', content: '"Love is composed of a single soul inhabiting two bodies"' },
    { id: Date.now() + 1, type: 'paragraph', content: 'This is a section about your story together. Add more here!' }
])

const headingSection = computed(() => sections.value.find(s => s.type === 'heading'))
const paragraphSection = computed(() => sections.value.find(s => s.type === 'paragraph'))

const isLive = ref(false)
const currentStep = ref(0) // 0-indexed for steps
const showPassword = ref(false) // Toggle for password field

watch(
  () => websiteData.isPasswordProtected,
  (enabled) => {
    if (!enabled) {
      websiteData.sitePassword = ''
    }
  }
)

const selectedPalette = computed<ColorPalette>(() =>
  resolvePalette(websiteData.colorPalette)
)

const selectedTypography = computed<TypographySet>(() =>
  resolveTypography(websiteData.typography)
)

const previewDynamicStyle = (index: number) =>
  getDynamicStyle(index, selectedPalette.value.colors)

const selectedHeaderFile = ref<File | undefined>();

const currentHeaderImage = computed(() => websiteData.headerImage || aisleImage);

const getBaseLabel = (id: string) => {
    const labels: Record<string, string> = {
        'choose-format': 'Choose a Format',
        'choose-motif': 'Choose a Motif',
        'header-image': 'Header Image',
        'color-palette': 'Color Palette',
        'typography': 'Typography',
        'basic-info': 'Basic Information',
        'content-sections': 'Content Sections',
        'components': 'Components',
        'thank-you': 'Thank You Message',
        'review-publish': 'Review & Publish'
    }
    return labels[id] || id;
}

// 5. Available Components (Step 7)
const availableComponents = [
    { id: 'rsvp', name: 'RSVP', icon: 'i-lucide-mail', description: 'Allow guests to respond to your invitation.' },
    { id: 'schedule', name: 'Schedule', icon: 'i-lucide-calendar', description: 'Share the timeline of your wedding day.' },
    { id: 'where-to-stay', name: 'Where to Stay', icon: 'i-lucide-bed', description: 'Recommend accommodations for your guests.' },
    { id: 'travel', name: 'Travel', icon: 'i-lucide-plane', description: 'Provide directions and travel information.' },
    { id: 'wedding-party', name: 'Wedding Party', icon: 'i-lucide-users', description: 'Introduce your bridesmaids and groomsmen.' },
    { id: 'q-and-a', name: 'Q&A', icon: 'i-lucide-help-circle', description: 'Answer common questions from your guests.' }
]

const selectedComponents = ref<string[]>([])

const toggleComponent = (id: string) => {
    if (selectedComponents.value.includes(id)) {
        selectedComponents.value = selectedComponents.value.filter(c => c !== id)
    } else {
        selectedComponents.value.push(id)
    }
}

interface StepDef {
    id: string;
    icon: string;
    description: string;
    name?: string;
}

const websiteSteps = computed(() => {
    const baseSteps: StepDef[] = [
        { id: 'choose-format', icon: 'i-lucide-layout', description: "Select the structural layout for your website." },
        { id: 'choose-motif', icon: 'i-lucide-palette', description: "Select a design template that matches your wedding style." },
        { id: 'header-image', icon: 'i-lucide-image', description: "Upload a captivating image for your website's header." },
        { id: 'color-palette', icon: 'i-lucide-swatch-book', description: "Choose a color scheme that will be used across your website." },
        { id: 'typography', icon: 'i-lucide-type', description: "Select a font pairing for your website\'s headings and text." },
        { id: 'basic-info', icon: 'i-lucide-info', description: "Provide the essential details for your website, like the title, description, and contact information." },
        { id: 'content-sections', icon: 'i-lucide-layout-template', description: "Add and arrange content sections like headings and paragraphs to build your page." },
        { id: 'components', icon: 'i-lucide-blocks', description: "Select the extra components you want to include on your website." }
    ];

    const dynamicSteps: StepDef[] = selectedComponents.value
        .filter(compId => compId !== 'rsvp') // Skip RSVP since it uses account data
        .map(compId => {
            const compDef = availableComponents.find(c => c.id === compId)!;
            return { id: compId, icon: compDef.icon, description: `Configure your ${compDef.name} component.`, name: compDef.name };
        });

    const endSteps: StepDef[] = [
        { id: 'thank-you', icon: 'i-lucide-heart-handshake', description: "Add a closing message or thank you note to your guests." },
        { id: 'review-publish', icon: 'i-lucide-check-circle', description: "Review all your website details and publish it to go live." }
    ];

    const allSteps = [...baseSteps, ...dynamicSteps, ...endSteps];

    return allSteps.map((step, index) => {
        const title = step.name || getBaseLabel(step.id);
        return { ...step, label: `${index + 1}. ${title}` };
    });
});

const currentStepData = computed(() => websiteSteps.value[currentStep.value]);

watch(websiteSteps, (newSteps) => {
    // Ensure we don't go out of bounds if a component step is removed while on it
    if (currentStep.value >= newSteps.length) {
        currentStep.value = newSteps.length - 1;
    }
});

const addContentSection = (type: 'heading' | 'paragraph') => {
    const newId = Date.now() + sections.value.length; // Ensure unique ID
    if (type === 'heading' && !headingSection.value) {
        sections.value.push({ id: newId, type: 'heading', content: 'Love is composed of a single soul inhabiting two bodies' });
    } else if (type === 'paragraph' && !paragraphSection.value) {
        sections.value.push({ id: newId, type: 'paragraph', content: 'This is a section about your story together. Add more here!' });
    }
}

const removeContentSection = (id: number) => {
    sections.value = sections.value.filter(section => section.id !== id);
}

// 3. Tidbits Section
interface Tidbit {
    id: number;
    heading: string;
    paragraph: string;
}

const tidbits = ref<Tidbit[]>([
])

const addTidbit = () => {
    tidbits.value.push({ id: Date.now() + tidbits.value.length, heading: 'New Question', paragraph: 'Add answer here.' })
}

const removeTidbit = (id: number) => {
    tidbits.value = tidbits.value.filter(t => t.id !== id)
}

// 4. Schedule Section
interface ScheduleItem {
    id: number;
    title: string;
    description: string;
    location: string;
}

const scheduleItems = ref<ScheduleItem[]>([
    { id: Date.now(), title: 'Wedding Ceremony', description: 'The exchange of vows and rings.', location: 'Main Garden' }
])

const addScheduleItem = () => {
    scheduleItems.value.push({ id: Date.now() + scheduleItems.value.length, title: 'New Event', description: 'Event details here.', location: '' })
}

const removeScheduleItem = (id: number) => {
    scheduleItems.value = scheduleItems.value.filter(s => s.id !== id)
}

watch(selectedHeaderFile, (newFile) => {
    if (newFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            websiteData.headerImage = e.target?.result as string;
        };
        reader.readAsDataURL(newFile);
    } else {
        websiteData.headerImage = ''; // Clear image if no file selected
    }
}, { immediate: true }); // Watch immediately to handle initial state if any


async function loadEventContext() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }
  isLoadingEvent.value = true
  try {
    const detail = await loadPageData({
      mock: () => ({
        event: {
          _id: eventId.value || 'mock-event-id',
          eventType: 'WEDDING',
          eventName: 'Mock event',
          description: '',
          venue: '',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
          coverImageURL: null,
          paymentSummary: { fee: 10000, totalReceived: 10000, balanceDue: 0, isFullyPaid: true },
        },
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
      fetch: async () => fetchEvent(eventId.value),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

function seedWebsiteDefaultsFromEvent() {
  if (loadedCustomSiteFromApi.value) {
    return
  }
  const eventName = eventRecord.value?.eventName?.trim()
  if (eventName && !websiteData.siteTitle.trim()) {
    websiteData.siteTitle = eventName
  }
  const description = eventRecord.value?.description?.trim()
  if (description && !websiteData.siteDescription.trim()) {
    websiteData.siteDescription = description
  }
}

async function loadCustomSite() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }
  isLoadingSite.value = true
  try {
    await loadPageData({
      fetch: async () => {
        const targetEventId = eventId.value
        const sites = await fetchCustomSitesByEvent(targetEventId)
        const site = sites[0]
        if (site) {
          loadedCustomSiteFromApi.value = true
          customSiteId.value = site._id
          applyCustomSiteToEditor(site, {
            websiteData,
            sections,
            tidbits,
            scheduleItems,
            selectedComponents,
            isLive,
          })
        }
      },
      mock: () => undefined,
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not load website', error })
  } finally {
    isLoadingSite.value = false
  }
}

onMounted(async () => {
  await loadEventContext()
  await loadCustomSite()
  seedWebsiteDefaultsFromEvent()
})

async function saveCustomSite(): Promise<boolean> {
  const validationError = validateWebsiteEditorForSave(
    websiteData,
    selectedHeaderFile.value
  )
  if (validationError) {
    toast.add({ title: 'Cannot save', description: validationError, color: 'error' })
    return false
  }

  const targetEventId = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  if (!targetEventId) {
    toast.add({
      title: 'Missing event',
      description: 'Open Website Maker from an event dashboard.',
      color: 'error',
    })
    return false
  }

  isSaving.value = true
  try {
    const formData = buildCustomSiteFormData({
      eventId: targetEventId,
      websiteData,
      sections: sections.value,
      tidbits: tidbits.value,
      scheduleItems: scheduleItems.value,
      selectedComponents: selectedComponents.value,
      selectedPalette: selectedPalette.value.colors,
      selectedTypography: selectedTypography.value,
      selectedHeaderFile: selectedHeaderFile.value,
    })

    let savedSite
    if (customSiteId.value) {
      displaySaveWebsiteEndpoint(customSiteId.value)
      savedSite = await updateCustomSite(customSiteId.value, formData)
      customSiteId.value = savedSite._id
    } else {
      try {
        displaySaveWebsiteEndpoint(null)
        savedSite = await createCustomSite(formData)
        customSiteId.value = savedSite._id
      } catch (error) {
        const err = error as { status?: number; statusCode?: number; data?: { message?: string } }
        const status = err.status ?? err.statusCode
        const message = err.data?.message ?? getApiErrorMessage(error)
        if (status === 409 || message.toLowerCase().includes('already has a custom site')) {
          const sites = await fetchCustomSitesByEvent(targetEventId)
          const existing = sites[0]
          if (existing) {
            customSiteId.value = existing._id
            displaySaveWebsiteEndpoint(existing._id)
            savedSite = await updateCustomSite(existing._id, formData)
            customSiteId.value = savedSite._id
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    }

    if (savedSite?.headerImageURL) {
      websiteData.headerImage = savedSite.headerImageURL
    }

    toast.add({ title: 'Website saved', color: 'success' })
    return true
  } catch (error) {
    reportApiError(toast, { title: 'Could not save website', error })
    return false
  } finally {
    isSaving.value = false
  }
}

async function handleGoLive() {
  if (isLive.value) {
    isLive.value = false
    return
  }
  if (!canPublishWebsite.value) {
    toast.add({
      title: 'Payment required',
      description: 'Event payment must be approved before you can publish your website.',
      color: 'warning',
    })
    return
  }
  const saved = await saveCustomSite()
  if (!saved || !customSiteId.value) {
    return
  }
  isSaving.value = true
  try {
    await publishCustomSite(customSiteId.value)
    isLive.value = true
    toast.add({ title: 'Website is live', color: 'success' })
  } catch (error) {
    reportApiError(toast, { title: 'Could not publish website', error })
  } finally {
    isSaving.value = false
  }
}

async function handleSaveWebsite() {
  await saveCustomSite()
}

// Computed properties to grab specific sections if needed, similar to RSVPMaker
// For now, we'll just iterate over `sections` directly in the preview.

</script>

<template>
        <!-- Main Content Container -->
        <UContainer :class="{ 'max-w-full px-0!': isLive }">
            <ClientOnly>
                <Teleport to="#navbar-actions">
                    <div class="flex items-center gap-4">
                        <div v-if="isLive" class="text-sm md:text-base font-medium text-success-600">
                            ✨ Your website is live!
                        </div>

                        <UButton
                            v-if="isLive && liveSiteLink"
                            :to="liveSiteLink"
                            target="_blank"
                            icon="i-lucide-external-link"
                            variant="outline"
                            color="blue"
                        >
                            View Live Site
                        </UButton>

                        <UButton
                            :loading="isSaving"
                            :disabled="isLoadingSite || isLoadingEvent || isSaving"
                            @click="handleSaveWebsite"
                        >
                            Save Website
                        </UButton>
                        <UButton
                            :icon="isLive ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
                            :color="isLive ? 'neutral' : 'blue'"
                            :loading="isSaving"
                            :disabled="isLoadingSite || isLoadingEvent || isSaving || (!isLive && !canPublishWebsite)"
                            @click="handleGoLive"
                        >
                            {{ isLive ? 'Edit Website' : 'Go Live' }}
                        </UButton>
                    </div>
                </Teleport>
            </ClientOnly>

            <div class="transition-all" :class="isLive ? 'mb-0' : 'mb-8'"></div>
            <UPageGrid class="items-start" :grid="{ cols: isLive ? '1' : '1 md:4' }">

                <!-- LEFT SIDE: Step Navigation (Editor Mode) -->
                <UPageCard v-if="!isLive"
                    class="bread-container col-span-1 p-0 sm:p-0 overflow-hidden flex flex-col max-h-[calc(100vh-125px)]"
                    :ui="{ container: 'p-0 sm:p-0 lg:p-0 flex flex-col w-full min-h-0 gap-0' }">

                    <!-- Static Header -->
                    <div class="px-6 pt-6 pb-4 shrink-0">
                        <div class="relative flex justify-center items-center text-xl font-semibold mb-1">
                            <UButton v-if="currentStep > 0" icon="i-lucide-arrow-left" color="neutral" variant="ghost"
                                class="absolute left-0 p-2" aria-label="Previous Step" @click="currentStep--" />
                            <span>{{ currentStepData?.label }}</span>
                        </div>
                        <p class="text-center text-sm mx-3">
                            {{ currentStepData?.description }}
                        </p>
                    </div>

                    <UScrollArea class="w-full shrink min-h-0 my-0 py-0">
                        <div class="px-6 py-2">



                            <!-- MIDDLE SECTION: Step Content (Editor Mode) -->



                            <!-- Step 1: Choose a Format -->
                            <div v-if="currentStepData?.id === 'choose-format'" class="">
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="relative rounded-lg cursor-pointer group transition-all duration-300 border p-4 flex flex-col items-center gap-3 bg-white"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg border-transparent': websiteData.format === 'format1', 'border-toast-200 hover:border-blue-300': websiteData.format !== 'format1' }"
                                        @click="websiteData.format = 'format1'">
                                        <div
                                            class="w-full h-24 bg-toast-50 flex flex-col gap-1 p-1 border border-toast-200 rounded shadow-sm">
                                            <div class="w-full h-8 bg-toast-200 rounded"></div>
                                            <div class="w-full flex-1 bg-toast-100 rounded"></div>
                                        </div>
                                        <span class="font-medium text-sm">Classic Stack</span>
                                        <div v-if="websiteData.format === 'format1'"
                                            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <UIcon name="i-lucide-check" class="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div class="relative rounded-lg cursor-pointer group transition-all duration-300 border p-4 flex flex-col items-center gap-3 bg-white"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg border-transparent': websiteData.format === 'format2', 'border-toast-200 hover:border-blue-300': websiteData.format !== 'format2' }"
                                        @click="websiteData.format = 'format2'">
                                        <div
                                            class="w-full h-24 bg-toast-50 flex gap-1 p-1 border border-toast-200 rounded shadow-sm">
                                            <div class="w-1/2 h-full bg-toast-200 rounded"></div>
                                            <div class="w-1/2 h-full bg-toast-100 rounded"></div>
                                        </div>
                                        <span class="font-medium text-sm">Side-by-Side</span>
                                        <div v-if="websiteData.format === 'format2'"
                                            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <UIcon name="i-lucide-check" class="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Step 2: Choose a Motif -->
                            <div v-if="currentStepData?.id === 'choose-motif'" class="">
                                <div class="grid grid-cols-2 gap-4">
                                    <div v-for="motif in motifs" :key="motif.name"
                                        class="relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-300"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg': websiteData.motif === motif.name }"
                                        @click="selectMotif(motif)" style="height: 100px;">
                                        <img :src="motif.image" :alt="motif.name"
                                            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                        <div
                                            class="absolute inset-0 bg-toast-900/10 group-hover:bg-opacity-40 transition-all duration-300">
                                        </div>
                                        <div v-if="websiteData.motif === motif.name"
                                            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <UIcon name="i-lucide-check" class="h-4 w-4" />
                                        </div>
                                        <div class="absolute bottom-0 left-0 p-2">
                                            <h4 class="font-semibold text-white text-sm drop-shadow-md">{{
                                                motif.name }}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Step 3: Choose a Color Palette -->
                            <div v-if="currentStepData?.id === 'color-palette'" class="">
                                <div class="grid grid-cols-2 gap-4">
                                    <div v-for="palette in colorPalettes" :key="palette.name"
                                        class="relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 border"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg border-blue-500': websiteData.colorPalette === palette.name, 'border-toast-200': websiteData.colorPalette !== palette.name }"
                                        @click="websiteData.colorPalette = palette.name">

                                        <div class="h-20 flex">
                                            <div v-for="(color, key) in palette.colors" :key="key" class="w-full h-full"
                                                :style="{ backgroundColor: color }"></div>
                                        </div>

                                        <div
                                            class="absolute inset-0 group-hover:bg-opacity-20 transition-all duration-300">
                                        </div>
                                        <div v-if="websiteData.colorPalette === palette.name"
                                            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <UIcon name="i-lucide-check" class="h-4 w-4" />
                                        </div>
                                        <div class="absolute bottom-0 left-0 p-2 bg-black/20 w-full">
                                            <h4 class="font-semibold text-white text-sm drop-shadow-md text-left">{{
                                                palette.name }}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Step 4: Upload Header Image -->
                            <div v-if="currentStepData?.id === 'header-image'" class="flex flex-col gap-4">
                                <UFormField label="Header Background Image">
                                    <UFileUpload v-model="selectedHeaderFile" :multiple="false" accept="image/*"
                                        size="xl" variant="area" label="Drop your image here"
                                        description="PNG, JPG, GIF (max. 5MB)" />
                                    <UButton v-if="websiteData.headerImage" icon="i-lucide-x" color="error"
                                        variant="ghost" class="mt-2" block
                                        @click="selectedHeaderFile = undefined; websiteData.headerImage = ''">
                                        Clear Image
                                    </UButton>
                                </UFormField>
                            </div>

                            <!-- Step 5: Choose Typography -->
                            <div v-if="currentStepData?.id === 'typography'" class="">
                                <div class="grid grid-cols-1 gap-4">
                                    <div v-for="set in typographySets" :key="set.name"
                                        class="rounded-lg cursor-pointer group transition-all duration-300 border p-3 flex flex-col justify-between"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg border-blue-500': websiteData.typography === set.name, 'border-toast-200': websiteData.typography !== set.name }"
                                        @click="websiteData.typography = set.name">

                                        <div>
                                            <h3 class="text-2xl" :style="{ fontFamily: `'${set.headerFont}'` }">
                                                Aa -
                                                {{ set.headerFont }}</h3>
                                            <h4 class="text-lg mt-1" :style="{ fontFamily: `'${set.subheaderFont}'` }">
                                                Aa -
                                                {{ set.subheaderFont }}</h4>
                                            <p class="text-base mt-3" :style="{ fontFamily: `'${set.bodyFont}'` }">
                                                The quick
                                                brown fox jumps over the lazy dog.</p>
                                        </div>

                                        <div class="mt-4 pt-2 border-t border-toast-200">
                                            <h4 class="font-semibold text-sm text-toast-800">{{
                                                set.name
                                                }}</h4>
                                            <p class="text-xs text-toast-500">{{ set.description
                                                }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <!-- Step 6: Basic Information -->
                            <div v-if="currentStepData?.id === 'basic-info'" class="flex flex-col gap-4 ">
                                <UFormField label="Site Title">
                                    <UInput v-model="websiteData.siteTitle" placeholder="e.g., My Portfolio"
                                        class="w-full" />
                                </UFormField>

                                <UFormField label="Site Description">
                                    <UTextarea v-model="websiteData.siteDescription"
                                        placeholder="A short description of your website." class="w-full" />
                                </UFormField>

                                <UFormField label="Domain Name">
                                    <UInput v-model="websiteData.domainName" placeholder="jane-loves-john"
                                        icon="i-lucide-globe" class="w-full" :ui="{
                                            base: 'pl-32',
                                            leading: 'pointer-events-none'
                                        }">
                                        <template #leading>
                                            <p class="text-sm text-muted">
                                                bread-butter.com/
                                            </p>
                                        </template>

                                    </UInput>
                                </UFormField>

                                <UFormField label="Contact Email">
                                    <UInput type="email" v-model="websiteData.contactEmail"
                                        placeholder="juan@breadandbutter.com" icon="i-lucide-mail" class="w-full" />
                                </UFormField>

                                <div class="flex items-center justify-between">
                                    <div class="text-left">
                                        <h4 class="font-medium text-sm">Password Protection</h4>
                                        <p class="text-xs text-toast-500">Require a password for
                                            guests to
                                            view your website.</p>
                                    </div>
                                    <USwitch v-model="websiteData.isPasswordProtected" />
                                </div>
                                <UFormField v-if="websiteData.isPasswordProtected" label="Website Password">
                                    <UInput :type="showPassword ? 'text' : 'password'"
                                        v-model="websiteData.sitePassword" placeholder="Enter a secure password"
                                        icon="i-lucide-lock" class="w-full" :ui="{ trailing: 'pointer-events-auto' }">
                                        <template #trailing>
                                            <UButton color="neutral" variant="ghost" size="sm" class="p-0"
                                                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                                                @click="showPassword = !showPassword"
                                                aria-label="Toggle password visibility" />
                                        </template>
                                    </UInput>
                                </UFormField>

                            </div>

                            <!-- Step 7: Content Sections -->
                            <div v-if="currentStepData?.id === 'content-sections'" class="flex flex-col gap-6 ">
                                <div class="items-center space-y-4">

                                    <div v-if="!headingSection && !paragraphSection"
                                        class="text-center text-toast-500 italic">No
                                        sections
                                        added
                                        yet.
                                    </div>

                                    <UButton v-if="!headingSection" icon="i-lucide-plus" color="blue" variant="solid"
                                        block @click="addContentSection('heading')">
                                        Add Heading
                                    </UButton>

                                    <div v-if="headingSection"
                                        class="flex flex-col gap-2 border border-toast-100 p-3 rounded-lg">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium capitalize">Heading</span>
                                            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                @click="removeContentSection(headingSection.id)" />
                                        </div>
                                        <UFormField>
                                            <UInput v-model="headingSection.content" placeholder="Enter heading text"
                                                class="w-full" />
                                        </UFormField>
                                    </div>

                                    <UButton v-if="!paragraphSection" icon="i-lucide-plus" color="blue"
                                        variant="solid" block @click="addContentSection('paragraph')">
                                        Add Paragraph
                                    </UButton>


                                    <div v-if="paragraphSection"
                                        class="flex flex-col gap-2 border border-toast-100 p-3 rounded-lg">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium capitalize">Paragraph</span>
                                            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                @click="removeContentSection(paragraphSection.id)" />
                                        </div>
                                        <UFormField>
                                            <UTextarea v-model="paragraphSection.content"
                                                placeholder="Enter paragraph content" class="w-full" />
                                        </UFormField>
                                    </div>
                                </div>
                            </div>

                            <!-- Step 8: Components -->
                            <div v-if="currentStepData?.id === 'components'" class="">
                                <div class="grid grid-cols-2 gap-4">
                                    <div v-for="comp in availableComponents" :key="comp.id"
                                        class="relative rounded-lg p-5 cursor-pointer group transition-all duration-300 border flex flex-col items-center text-center gap-1"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg border-transparent': selectedComponents.includes(comp.id), 'border-toast-200 hover:border-blue-300': !selectedComponents.includes(comp.id) }"
                                        @click="toggleComponent(comp.id)">

                                        <UIcon :name="comp.icon" class="w-5 h-5 transition-colors duration-300"
                                            :class="selectedComponents.includes(comp.id) ? 'text-blue-600' : 'text-toast-500'" />
                                        <h4 class="font-semibold text-base transition-colors duration-300"
                                            :class="selectedComponents.includes(comp.id) ? 'text-blue-700' : ''">
                                            {{ comp.name }}</h4>
                                        <p class="text-xs text-toast-500">{{ comp.description }}</p>

                                        <div v-if="selectedComponents.includes(comp.id)"
                                            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <UIcon name="i-lucide-check" class="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Dynamic Step: Q&A (formerly Tidbits) -->
                            <div v-if="currentStepData?.id === 'q-and-a'" class="flex flex-col gap-6 ">
                                <div class="items-center space-y-4">
                                    <div v-if="tidbits.length === 0" class="text-center text-toast-500 italic">No Q&A
                                        added yet.
                                    </div>
                                    <UButton icon="i-lucide-plus" color="blue" variant="solid" block
                                        @click="addTidbit()">
                                        Add Q&A
                                    </UButton>
                                    <div v-for="tidbit in tidbits" :key="tidbit.id"
                                        class="flex flex-col gap-2 border border-toast-100 p-3 rounded-lg">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium capitalize">Q&A Item</span>
                                            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                @click="removeTidbit(tidbit.id)" />
                                        </div>
                                        <UFormField label="Question">
                                            <UInput v-model="tidbit.heading" placeholder="Enter question"
                                                class="w-full" />
                                        </UFormField>
                                        <UFormField label="Answer">
                                            <UTextarea v-model="tidbit.paragraph" placeholder="Enter answer"
                                                class="w-full" />
                                        </UFormField>
                                    </div>
                                </div>
                            </div>

                            <!-- Dynamic Step: Schedule -->
                            <div v-if="currentStepData?.id === 'schedule'" class="flex flex-col gap-6 ">
                                <div class="items-center space-y-4">
                                    <div v-if="scheduleItems.length === 0" class="text-center text-toast-500 italic">No
                                        events
                                        added yet.</div>
                                    <UButton icon="i-lucide-plus" color="blue" variant="solid" block
                                        @click="addScheduleItem()">
                                        Add Event
                                    </UButton>
                                    <div v-for="item in scheduleItems" :key="item.id"
                                        class="flex flex-col gap-2 border border-toast-100 p-3 rounded-lg">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium capitalize">Event</span>
                                            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                @click="removeScheduleItem(item.id)" />
                                        </div>
                                        <UFormField label="Title">
                                            <UInput v-model="item.title" placeholder="Enter event title"
                                                class="w-full" />
                                        </UFormField>
                                        <UFormField label="Description">
                                            <UTextarea v-model="item.description" placeholder="Enter event description"
                                                class="w-full" />
                                        </UFormField>
                                        <UFormField label="Location (Optional)">
                                            <UInput v-model="item.location" placeholder="Enter location"
                                                class="w-full" />
                                        </UFormField>
                                    </div>
                                </div>
                            </div>

                            <!-- Dynamic Step: Where to Stay -->
                            <div v-if="currentStepData?.id === 'where-to-stay'" class="flex flex-col gap-6">
                                <div class="items-center space-y-4">
                                    <UFormField label="Venue Location" description="Enter your venue's address or city to show nearby accommodations.">
                                        <UInput v-model="websiteData.whereToStayLocation" placeholder="e.g. Central Park, NY" class="w-full" icon="i-lucide-map-pin" />
                                    </UFormField>
                                </div>
                            </div>

                            <!-- Dynamic Step: Travel -->
                            <div v-if="currentStepData?.id === 'travel'" class="flex flex-col gap-6">
                                <div class="items-center space-y-4">
                                    <div class="text-center text-toast-500 italic">Travel configuration goes here.</div>
                                    <!-- TODO: Add Travel form fields -->
                                </div>
                            </div>

                            <!-- Dynamic Step: Wedding Party -->
                            <div v-if="currentStepData?.id === 'wedding-party'" class="flex flex-col gap-6">
                                <div class="items-center space-y-4">
                                    <div class="text-center text-toast-500 italic">Wedding Party configuration goes here.
                                    </div>
                                    <!-- TODO: Add Wedding Party form fields -->
                                </div>
                            </div>

                            <!-- Ending Step: Thank You Message -->
                            <div v-if="currentStepData?.id === 'thank-you'" class="flex flex-col gap-4 ">
                                <UFormField label="Closing Title">
                                    <UInput v-model="websiteData.endingTitle" placeholder="e.g., We can't wait!"
                                        class="w-full" />
                                </UFormField>

                                <UFormField label="Closing Message">
                                    <UTextarea v-model="websiteData.endingMessage"
                                        placeholder="Write a sweet thank you note or final invitation line."
                                        class="w-full" />
                                </UFormField>
                            </div>

                            <!-- Ending Step: Review & Publish -->
                            <div v-if="currentStepData?.id === 'review-publish'" class="flex flex-col gap-4 ">
                                <div class="space-y-2">
                                    <p><strong>Domain:</strong> {{ websiteData.domainName || 'N/A' }}</p>
                                    <p><strong>Title:</strong> {{ websiteData.siteTitle || 'N/A' }}</p>
                                    <p><strong>Motif:</strong> {{ websiteData.motif || 'N/A' }}</p>
                                    <p><strong>Color Palette:</strong> {{ websiteData.colorPalette || 'N/A' }}</p>
                                    <p><strong>Typography:</strong> {{ websiteData.typography || 'N/A' }}</p>
                                </div>
                                <p
                                    v-if="!canPublishWebsite"
                                    class="text-sm text-toast-500"
                                >
                                    Event payment must be approved before you can publish your website. You can still save your progress.
                                </p>
                                <UButton
                                    v-if="canPublishWebsite"
                                    color="blue"
                                    block
                                    :loading="isSaving"
                                    :disabled="isLoadingSite || isLoadingEvent || isSaving"
                                    @click="handleGoLive"
                                >
                                    Publish Website
                                </UButton>
                                <UButton
                                    v-else
                                    color="blue"
                                    block
                                    :loading="isSaving"
                                    :disabled="isLoadingSite || isLoadingEvent || isSaving"
                                    @click="handleSaveWebsite"
                                >
                                    Save Website
                                </UButton>
                            </div>

                        </div>
                    </UScrollArea>

                    <!-- Static Footer -->
                    <div class="pb-6 px-6 pt-4 shrink-0">
                        <div class="flex justify-end items-center">
                            <UButton v-if="currentStep < websiteSteps.length - 1" icon="i-lucide-arrow-right"
                                color="blue" @click="currentStep++" block class="items-center">
                                Next Step
                            </UButton>
                        </div>
                    </div>
                </UPageCard>

                <!-- RIGHT SIDE: Live Preview / Final Website -->
                <UPageCard
                    :class="isLive ? 'col-span-full w-full h-[calc(100vh-64px)] rounded-none border-0' : 'col-span-2 w-full rounded-xl'"
                    class="flex flex-col gap-6 transition-colors duration-500 overflow-hidden ring-transparent bread-container"
                    :ui="{ container: 'p-0 sm:p-0 lg:p-0 h-full flex flex-col' }">
                    <div class="h-full w-full flex-1 flex flex-col md:flex-row transition-colors duration-500 relative"
                        :style="{
                            backgroundColor: selectedPalette.colors.background,
                            fontFamily: `'${selectedTypography.bodyFont}'`,
                        }">

                        <!-- LEFT SIDE (FIXED in Format 2 Desktop) -->
                        <div v-if="websiteData.format === 'format2'"
                            class="hidden md:flex flex-col gap-8 text-center py-10 px-6 relative justify-end w-1/2 shrink-0"
                            :class="isLive ? 'h-[calc(100vh-64px)]' : 'h-[calc(100vh-125px)]'" :style="{
                                backgroundImage: `url(${currentHeaderImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                            }">
                            <!-- Overlay for readability -->
                            <div class="absolute inset-0 z-0"
                                :style="{ backgroundImage: `linear-gradient(to bottom, transparent 40%, ${selectedPalette.colors.primary}80)` }">
                            </div>
                            <div class="relative z-10">
                                <div class="space-y-3">
                                    <h1 class="font-medium transition-all duration-300"
                                        :class="isLive ? 'text-6xl md:text-7xl' : 'text-4xl md:text-5xl'"
                                        :style="{ color: 'white', fontFamily: `'${selectedTypography.headerFont}'` }">
                                        {{ previewSiteTitle }}
                                    </h1>
                                    <p class="transition-all duration-300" :class="isLive ? 'text-2xl' : 'text-lg'"
                                        :style="{ color: 'white' }">
                                        {{ previewSiteDescription }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <UScrollArea class="flex-1 w-full h-full z-20 min-h-0"
                            :class="isLive ? 'max-h-[calc(100vh-64px)]' : 'max-h-[calc(100vh-125px)]'">

                            <div class="flex flex-col min-h-full w-full">
                                <!-- LEFT SIDE (Scrollable in Format 1, or Format 2 Mobile) -->
                                <div class="flex flex-col gap-8 text-center py-10 px-6 relative justify-end w-full"
                                    :class="[
                                        websiteData.format === 'format2' ? 'md:hidden h-[40vh]' : 'h-[50vh]'
                                    ]" :style="{
                                        backgroundImage: `url(${currentHeaderImage})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        minHeight: websiteData.format === 'format2' ? 'auto' : (isLive ? '80vh' : '50vh'), // Ensure image is visible
                                    }">
                                    <!-- Overlay for readability -->
                                    <div class="absolute inset-0 z-0"
                                        :style="{ backgroundImage: `linear-gradient(to bottom, transparent 40%, ${selectedPalette.colors.primary}80)` }">
                                    </div>
                                    <div class="relative z-10">

                                        <div class="space-y-3">
                                            <h1 class="font-medium transition-all duration-300"
                                                :class="isLive ? 'text-6xl md:text-7xl' : 'text-4xl md:text-5xl'"
                                                :style="{ color: 'white', fontFamily: `'${selectedTypography.headerFont}'` }">
                                                {{ previewSiteTitle }}
                                            </h1>
                                            <p class="transition-all duration-300"
                                                :class="isLive ? 'text-2xl' : 'text-lg'" :style="{ color: 'white' }">
                                                {{ previewSiteDescription }}
                                            </p>

                                        </div>
                                    </div>
                                </div>

                                <div class="w-full flex flex-col">
                                    <!-- Dynamic Content Sections Preview -->
                                    <div class="flex flex-col justify-center mx-10 py-20 text-center"
                                        :class="{ 'min-h-[80vh]': isLive }">
                                        <UContainer v-if="headingSection"
                                            class="font-bold italic transition-all duration-300"
                                            :class="isLive ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                            {{ headingSection.content }}
                                        </UContainer>
                                        <div v-if="paragraphSection"
                                            class="prose max-w-none mx-auto text-center transition-all duration-300"
                                            :class="isLive ? 'text-xl' : 'text-base'"
                                            :style="{ color: selectedPalette.colors.text }">
                                            {{ paragraphSection.content }}
                                        </div>
                                    </div>



                                    <template v-for="(compId, index) in selectedComponents" :key="compId">
                                        <!-- Q&A Preview -->
                                        <div v-if="compId === 'q-and-a' && tidbits.length > 0"
                                            class="flex flex-col justify-center gap-10 px-6 text-center py-20"
                                            :class="{ 'min-h-[80vh]': isLive }" :style="{
                                                backgroundColor: previewDynamicStyle(index).bg,
                                            }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                Q&A</div>


                                            <div v-for="tidbit in tidbits" :key="tidbit.id" class="flex flex-col gap-3">
                                                <h3 class="font-bold transition-all duration-300"
                                                    :class="isLive ? 'text-4xl' : 'text-2xl'"
                                                    :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                    {{ tidbit.heading }}
                                                </h3>
                                                <div class="prose max-w-none mx-auto text-center transition-all duration-300"
                                                    :class="isLive ? 'text-xl' : 'text-base'"
                                                    :style="{ color: previewDynamicStyle(index).text }">
                                                    {{ tidbit.paragraph }}
                                                </div>
                                            </div>
                                        </div>



                                        <!-- Schedule Preview -->
                                        <div v-if="compId === 'schedule' && scheduleItems.length > 0"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                            :class="{ 'min-h-[80vh]': isLive }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                Schedule</div>

                                            <div v-for="item in scheduleItems" :key="item.id"
                                                class="flex flex-col gap-3">
                                                <h3 class="font-bold transition-all duration-300"
                                                    :class="isLive ? 'text-4xl' : 'text-2xl'"
                                                    :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                    {{ item.title }}
                                                </h3>
                                                <div class="prose max-w-none mx-auto text-center transition-all duration-300"
                                                    :class="isLive ? 'text-xl' : 'text-base'"
                                                    :style="{ color: previewDynamicStyle(index).text }">
                                                    {{ item.description }}
                                                </div>
                                                <div v-if="item.location"
                                                    class="font-semibold italic mt-2 transition-all duration-300"
                                                    :class="isLive ? 'text-lg' : 'text-sm'"
                                                    :style="{ color: previewDynamicStyle(index).heading }">
                                                    <UIcon name="i-lucide-map-pin"
                                                        class="mr-1 inline-block align-middle" />{{
                                                            item.location
                                                    }}
                                                </div>
                                            </div>
                                        </div>

                                        <!-- RSVP Preview Placeholder -->
                                        <div v-if="compId === 'rsvp'"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                            :class="{ 'min-h-[80vh]': isLive }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                RSVP</div>
                                            <div class="flex flex-col items-center gap-5 text-sm"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                <div v-if="websiteData.rsvpDeadlineDate" class="font-semibold uppercase tracking-widest text-xs opacity-80">
                                                    <UIcon name="i-lucide-calendar" class="w-4 h-4 inline-block align-text-bottom mr-1" />
                                                    RSVP by {{ formatDateWithWeekday(websiteData.rsvpDeadlineDate) }}
                                                </div>
                                                <UButton size="lg" 
                                                    class="transition-all duration-300 hover:opacity-80 shadow-md border" 
                                                    :style="{ 
                                                        backgroundColor: previewDynamicStyle(index ).text, 
                                                        color: previewDynamicStyle(index ).bg, 
                                                        borderColor: previewDynamicStyle(index ).bg === 'transparent' ? previewDynamicStyle(index - 1).text : previewDynamicStyle(index - 1).bg 
                                                    }"
                                                >
                                                    RSVP Here
                                                </UButton>
                                            </div>
                                        </div>

                                        <!-- Where to Stay Preview Placeholder -->
                                        <div v-if="compId === 'where-to-stay'"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                            :class="{ 'min-h-[80vh]': isLive }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                Where to Stay</div>
                                            
                                            <div v-if="websiteData.whereToStayLocation" class="relative w-full h-100 max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg border" :style="{ borderColor: previewDynamicStyle(index).text }">
                                                <iframe 
                                                    width="100%" 
                                                    height="100%" 
                                                    frameborder="0" 
                                                    scrolling="no" 
                                                    marginheight="0" 
                                                    marginwidth="0" 
                                                    :src="getGoogleMapsUrl(websiteData.whereToStayLocation)"
                                                    style="filter: toastscale(1) contrast(1);">
                                                </iframe>
                                                <!-- Seamless Map Tint Overlay -->
                                                <div class="absolute inset-0 pointer-events-none opacity-60"
                                                     :style="{ backgroundColor: previewDynamicStyle(index).text, mixBlendMode: 'color' }">
                                                </div>
                                            </div>
                                            <div v-else class="text-sm italic opacity-70"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                [ Enter a location to view the map ]
                                            </div>
                                        </div>

                                        <!-- Travel Preview Placeholder -->
                                        <div v-if="compId === 'travel'"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                            :class="{ 'min-h-[80vh]': isLive }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                Travel</div>
                                            <div class="text-sm italic opacity-70"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                [ Travel Component Preview goes here ]
                                            </div>
                                        </div>

                                        <!-- Wedding Party Preview Placeholder -->
                                        <div v-if="compId === 'wedding-party'"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                            :class="{ 'min-h-[80vh]': isLive }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                Wedding Party</div>
                                            <div class="text-sm italic opacity-70"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                [ Wedding Party Component Preview goes here ]
                                            </div>
                                        </div>
                                    </template>

                                    <!-- Thank You / Ending Preview -->
                                    <div class="flex flex-col justify-center gap-6 px-6 py-20 text-center"
                                        :class="{ 'min-h-[80vh]': isLive }"
                                        :style="{ backgroundColor: previewDynamicStyle(selectedComponents.length).bg }">
                                        <h2 class="font-bold transition-all duration-300"
                                            :class="isLive ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: previewDynamicStyle(selectedComponents.length).heading, fontFamily: `'${selectedTypography.headerFont}'` }">
                                            {{ websiteData.endingTitle }}
                                        </h2>
                                        <p class="prose max-w-none mx-auto text-center transition-all duration-300"
                                            :class="isLive ? 'text-2xl' : 'text-lg'"
                                            :style="{ color: previewDynamicStyle(selectedComponents.length).text }">
                                            {{ websiteData.endingMessage }}
                                        </p>
                                    </div>
                                    <!-- Bread + Butter Branding Footer -->
                                    <div class="py-10 flex flex-col items-center justify-center gap-3"
                                        :style="{ backgroundColor: selectedPalette.colors.heading, borderColor: selectedPalette.colors.surface }">
                                        <p class="text-xs font-semibold uppercase tracking-widest opacity-60"
                                            :style="{ color: selectedPalette.colors.background }">This website was made
                                            with</p>
                                        <div class="h-6 w-full opacity-80 mask-logo"
                                            :style="{ backgroundColor: selectedPalette.colors.background }" role="img"
                                            aria-label="Bread + Butter"></div>
                                    </div>
                                </div>
                            </div>
                        </UScrollArea>
                    </div>
                </UPageCard>

            </UPageGrid>
        </UContainer>
</template>

<style scoped>
/* Add any specific styles for WebsiteMaker here if needed */
.mask-logo {
    -webkit-mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
    mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
}

/* Force font preloading for dynamically bound fonts */
.font-preload-parisienne {
    font-family: 'Parisienne', cursive;
}

.font-preload-engagement {
    font-family: 'Engagement', cursive;
}

.font-preload-greatvibes {
    font-family: 'Great Vibes', cursive;
}

.font-preload-boska {
    font-family: 'Boska', serif;
}

.font-preload-melodrama {
    font-family: 'Melodrama', sans-serif;
}

.font-preload-clash {
    font-family: 'Clash Display', sans-serif;
}

.font-preload-gambetta {
    font-family: 'Gambetta', serif;
}

.font-preload-sentient {
    font-family: 'Sentient', serif;
}

.font-preload-quicksand {
    font-family: 'Quicksand', sans-serif;
}

.font-preload-rowan {
    font-family: 'Rowan', serif;
}

.font-preload-satoshi {
    font-family: 'Satoshi', sans-serif;
}

.font-preload-bespoke {
    font-family: 'Bespoke Sans', sans-serif;
}

.font-preload-switzer {
    font-family: 'Switzer', sans-serif;
}

.font-preload-outfit {
    font-family: 'Outfit', sans-serif;
}

.font-preload-general {
    font-family: 'General Sans', sans-serif;
}

.font-preload-amulya {
    font-family: 'Amulya', sans-serif;
}
</style>