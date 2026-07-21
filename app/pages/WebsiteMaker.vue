<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'

definePageMeta({
    layout: 'event-sub-navbar',
    // eslint-disable-next-line vue/no-reserved-component-names
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
    motif: '', // Motif selection step removed, default to empty
    colorPalette: 'Gilded Flora', // Default color palette
    invertColors: false,
    simplifiedColors: false,
    singlePageSite: true, // New: single page vs multi-section
    typography: 'Romantic Script', // Default typography set
    headerImage: '', // New: Header background image URL
    endingTitle: 'Hope to see you there!',
    endingMessage: 'We cannot wait to celebrate this special day with all of our favorite people.',
    isPasswordProtected: false,
    sitePassword: '',
    rsvpDeadlineDate: '2024-12-31', // Mocked from account data
    whereToStayLocation: 'Central Park, New York'
})

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
const isPreviewing = ref(false)
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
    getDynamicStyle(index, selectedPalette.value.colors, websiteData.invertColors, websiteData.simplifiedColors)

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
        'color-remix': 'Color Remix & Navigation',
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
    { id: 'wedding-party', name: 'Wedding Party', icon: 'i-lucide-users', description: 'Introduce your bridesmaids and groomsmen.' },
    { id: 'q-and-a', name: 'Q&A', icon: 'i-lucide-help-circle', description: 'Answer common questions from your guests.' },
    { id: 'diy', name: 'DIY Component', icon: 'i-lucide-plus-square', description: 'Create your own custom component.' }
]

const selectedComponents = ref<string[]>([])

const toggleComponent = (id: string) => {
    if (selectedComponents.value.includes(id)) {
        selectedComponents.value = selectedComponents.value.filter(c => c !== id)
    } else {
        selectedComponents.value.push(id)
    }

    // Special handling for the DIY component toggle
    if (id === 'diy') {
        if (selectedComponents.value.includes('diy')) {
            // If no DIY components exist, add the first one.
            if (diyComponents.value.length === 0) {
                const newId = `diy-${Date.now()}`;
                diyComponents.value.push({ id: newId, name: 'Custom', header: 'Custom Header', description: 'Custom description.' });
            }
        } else {
            diyComponents.value = [];
        }
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
        { id: 'header-image', icon: 'i-lucide-image', description: "1. Upload a captivating image for your website's header." },
        { id: 'color-palette', icon: 'i-lucide-swatch-book', description: "Choose a color scheme for your website." },
        { id: 'color-remix', icon: 'i-lucide-paint-bucket', description: "Fine-tune your color application." },
        { id: 'typography', icon: 'i-lucide-type', description: "Select a font pairing for your website\'s headings and text." },
        { id: 'basic-info', icon: 'i-lucide-info', description: "Provide the essential details for your website." },
        { id: 'content-sections', icon: 'i-lucide-layout-template', description: "Add and arrange content sections like headings and paragraphs to build your page." },
        { id: 'components', icon: 'i-lucide-blocks', description: "Select the extra components you want to include on your website." }
    ];

    const dynamicSteps: StepDef[] = selectedComponents.value
        .filter(compId => compId !== 'rsvp' && compId !== 'diy') // Skip RSVP and DIY from this mapping
        .map(compId => {
            const compDef = availableComponents.find(c => c.id === compId)!;
            return { id: compId, icon: compDef.icon, description: `Configure your ${compDef.name} component.`, name: compDef.name };
        });

    const endSteps: StepDef[] = [
        { id: 'thank-you', icon: 'i-lucide-heart-handshake', description: "Add a closing message or thank you note to your guests." },
        { id: 'review-publish', icon: 'i-lucide-check-circle', description: "Review all your website details and publish it to go live." }
    ];

    // Add a step for DIY component configuration if it's selected
    const diyStep: StepDef[] = selectedComponents.value.includes('diy')
        ? [{ id: 'diy-config', icon: 'i-lucide-settings-2', description: "Configure your custom component.", name: "DIY Component" }]
        : [];

    const allSteps = [...baseSteps, ...dynamicSteps, ...diyStep, ...endSteps];

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

const headerLinks = computed(() => {
    const aboutUsLink = { id: 'about-us', name: 'About Us' };
    const dynamicComponents = selectedComponents.value.filter(id => id !== 'diy')
        .map(id => availableComponents.find(c => c.id === id))
        .filter(Boolean) as { id: string, name: string }[];

    const diyLinks = diyComponents.value.map(diy => ({
        id: `diy-${diy.id}`,
        name: diy.name
    }));

    let components = [aboutUsLink, ...dynamicComponents, ...diyLinks];

    // Find the longest button name to use for the placeholder to ensure consistent width
    const longestName = components.reduce((max, c) => c.name.length > max.length ? c.name : max, '').trim();

    // If the total number of buttons is odd, add a placeholder to make it even.
    if (components.length % 2 !== 0) {
        // Use the longest name for the placeholder but it will be invisible.
        // This ensures the placeholder takes up the same space.
        components.push({ id: 'placeholder', name: longestName });
    }

    const total = components.length;
    const mid = total / 2; // Now it's always an even number

    const left = components.slice(0, mid);
    const right = components.slice(mid);

    return { left, right };
});

const activeComponentId = ref<string>('about-us');

function handleHeaderLinkClick(id: string) {
    if (websiteData.singlePageSite) {
        // TODO: Implement scroll-to-section
        toast.add({ title: 'Scroll to section coming soon!', color: 'info' });
    } else {
        activeComponentId.value = id;
    }
}

const siteTitleEl = ref<HTMLElement | null>(null)
const spacerWidth = ref('16rem') // Default width (w-64)

watch(
    [previewSiteTitle, () => selectedTypography.value.headerFont],
    async () => {
        // Wait for the DOM to update with the new title/font
        await nextTick()
        if (siteTitleEl.value) {
            // Get the width of the title element and add padding
            // 1.25rem on each side (2.5rem total) corresponds to Tailwind's padding `p-5`
            spacerWidth.value = `${siteTitleEl.value.offsetWidth + 2.5 * 16}px`
        }
    },
    { immediate: true }
)
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

// 5. DIY Component Section
interface DiyComponent {
    id: string;
    name: string;
    header: string;
    description: string;
}
const diyComponents = ref<DiyComponent[]>([]);

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
                        diyComponents, 
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
            diyComponents: diyComponents.value,
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

function togglePreview() {
    isPreviewing.value = !isPreviewing.value
    // When entering preview, if the site is already live, we should treat it as editing again.
    if (isPreviewing.value && isLive.value) {
        isLive.value = false
    }
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

                    <UButton v-if="isLive && liveSiteLink" :to="liveSiteLink" target="_blank"
                        icon="i-lucide-external-link" variant="outline" color="blue">
                        View Live Site
                    </UButton>
                    <UButton :icon="isPreviewing ? 'i-lucide-edit' : 'i-lucide-eye'"
                        :color="isPreviewing ? 'neutral' : 'blue'" variant="outline" :disabled="isSaving"
                        @click="togglePreview">
                        {{ isPreviewing ? 'Editor View' : 'Live Preview' }}
                    </UButton>

                    <UButton :loading="isSaving" :disabled="isLoadingSite || isLoadingEvent || isSaving"
                        @click="handleSaveWebsite">
                        Save Website
                    </UButton>
                    <UButton :icon="isLive ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
                        :color="isLive ? 'neutral' : 'blue'" :loading="isSaving"
                        :disabled="isLoadingSite || isLoadingEvent || isSaving || (!isLive && !canPublishWebsite)"
                        @click="handleGoLive">
                        {{ isLive ? 'Edit Website' : 'Go Live' }}
                    </UButton>
                </div>
            </Teleport>
        </ClientOnly>

        <div class="transition-all" :class="isLive ? 'mb-0' : 'mb-8'"></div>
        <UPageGrid class="items-start" :grid="{ cols: isLive || isPreviewing ? '1' : '1 md:3' }">

            <!-- LEFT SIDE: Step Navigation (Editor Mode) -->
            <UPageCard v-if="!isLive && !isPreviewing"
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
                                        <UIcon name="i-lucide-check" class="h-4 w-4" @click.stop />
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
                                        <UIcon name="i-lucide-check" class="h-4 w-4" @click.stop />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2 (Removed): Choose a Motif -->
                        <div v-if="currentStepData?.id === 'choose-motif'" class="">
                        </div>

                        <!-- Step 2: Choose a Color Palette -->
                        <div v-if="currentStepData?.id === 'color-palette'" class="">
                            <div class="grid grid-cols-2 gap-4">
                                <div v-for="palette in colorPalettes" :key="palette.name"
                                    class="relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 border"
                                    :class="{ 'ring-2 ring-blue-500 shadow-lg border-blue-500': websiteData.colorPalette === palette.name, 'border-toast-200': websiteData.colorPalette !== palette.name }"
                                    @click="websiteData.colorPalette = palette.name">

                                    <div class="h-20 flex">
                                        <div class="w-full h-full" :style="{ backgroundColor: palette.colors.primary }">
                                        </div>
                                        <div class="w-full h-full"
                                            :style="{ backgroundColor: palette.colors.secondary }"></div>
                                        <div class="w-full h-full"
                                            :style="{ backgroundColor: palette.colors.text_color }"></div>
                                    </div>

                                    <div class="absolute inset-0 group-hover:bg-opacity-20 transition-all duration-300">
                                    </div>
                                    <div v-if="websiteData.colorPalette === palette.name"
                                        class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                        <UIcon name="i-lucide-check" class="h-4 w-4" @click.stop />
                                    </div>
                                    <div class="absolute bottom-0 left-0 p-2 bg-black/20 w-full">
                                        <h4 class="font-semibold text-white text-sm drop-shadow-md text-left">{{
                                            palette.name }}
                                        </h4>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3: Page Color Options -->
                        <div v-if="currentStepData?.id === 'color-remix'" class="flex flex-col gap-4">
                            <div class="flex items-center justify-between">
                                <div class="text-left">
                                    <h4 class="font-medium text-sm">Invert Colors</h4>
                                    <p class="text-xs text-toast-500">Swap background and text colors for a different
                                        look.</p>
                                </div>
                                <USwitch v-model="websiteData.invertColors" />
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="text-left">
                                    <h4 class="font-medium text-sm">Simplified Colors</h4>
                                    <p class="text-xs text-toast-500">Use a more minimal color scheme with only primary
                                        and text colors.</p>
                                </div>
                                <USwitch v-model="websiteData.simplifiedColors" />
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="text-left">
                                    <h4 class="font-medium text-sm">Single Page Site</h4>
                                    <p class="text-xs text-toast-500">Display all content on one scrolling page. If off, header links will show sections individually.</p>
                                </div>
                                <USwitch v-model="websiteData.singlePageSite" />
                            </div>
                        </div>


                        <!-- Step 3: Upload Header Image -->
                        <div v-if="currentStepData?.id === 'header-image'" class="flex flex-col gap-4">
                            <UFormField label="Header Background Image">
                                <UFileUpload v-model="selectedHeaderFile" :multiple="false" accept="image/*" size="xl"
                                    variant="area" label="Drop your image here"
                                    description="PNG, JPG, GIF (max. 5MB)" />
                                <UButton v-if="websiteData.headerImage" icon="i-lucide-x" color="error" variant="ghost"
                                    class="mt-2" block
                                    @click="selectedHeaderFile = undefined; websiteData.headerImage = ''">
                                    Clear Image
                                </UButton>
                            </UFormField>
                        </div>

                        <!-- Step 4: Choose Typography -->
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


                        <!-- Step 5: Basic Information -->
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
                                <UInput :type="showPassword ? 'text' : 'password'" v-model="websiteData.sitePassword"
                                    placeholder="Enter a secure password" icon="i-lucide-lock" class="w-full"
                                    :ui="{ trailing: 'pointer-events-auto' }">
                                    <template #trailing>
                                        <UButton color="neutral" variant="ghost" size="sm" class="p-0"
                                            :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                                            @click="showPassword = !showPassword"
                                            aria-label="Toggle password visibility" />
                                    </template>
                                </UInput>
                            </UFormField>

                        </div>

                        <!-- Step 6: Content Sections -->
                        <div v-if="currentStepData?.id === 'content-sections'" class="flex flex-col gap-6 ">
                            <div class="items-center space-y-4">

                                <div v-if="!headingSection && !paragraphSection"
                                    class="text-center text-toast-500 italic">No
                                    sections
                                    added
                                    yet.
                                </div>

                                <UButton v-if="!headingSection" icon="i-lucide-plus" color="blue" variant="solid" block
                                    @click="addContentSection('heading')">
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

                                <UButton v-if="!paragraphSection" icon="i-lucide-plus" color="blue" variant="solid"
                                    block @click="addContentSection('paragraph')">
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

                        <!-- Step 7: Components -->
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
                                        <UIcon name="i-lucide-check" class="h-4 w-4" @click.stop />
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
                                <UButton icon="i-lucide-plus" color="blue" variant="solid" block @click="addTidbit()">
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
                                        <UInput v-model="tidbit.heading" placeholder="Enter question" class="w-full" />
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
                                        <UInput v-model="item.title" placeholder="Enter event title" class="w-full" />
                                    </UFormField>
                                    <UFormField label="Description">
                                        <UTextarea v-model="item.description" placeholder="Enter event description"
                                            class="w-full" />
                                    </UFormField>
                                    <UFormField label="Location (Optional)">
                                        <UInput v-model="item.location" placeholder="Enter location" class="w-full" />
                                    </UFormField>
                                </div>
                            </div>
                        </div>

                        <!-- Dynamic Step: Where to Stay -->
                        <div v-if="currentStepData?.id === 'where-to-stay'" class="flex flex-col gap-6">
                            <div class="items-center space-y-4">
                                <UFormField label="Venue Location"
                                    description="Enter your venue's address or city to show nearby accommodations.">
                                    <UInput v-model="websiteData.whereToStayLocation"
                                        placeholder="e.g. Central Park, NY" class="w-full" icon="i-lucide-map-pin" />
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

                        <!-- Dynamic Step: DIY Component Config -->
                        <div v-if="currentStepData?.id === 'diy-config'" class="flex flex-col gap-6">
                            <div class="items-center space-y-4">
                                <div v-if="diyComponents.length === 0" class="text-center text-toast-500 italic">
                                    No DIY components added.
                                </div>
                                <div v-for="diy in diyComponents" :key="diy.id"
                                    class="flex flex-col gap-2 border border-toast-100 p-3 rounded-lg">
                                    <UFormField label="Component Name (for header link)">
                                        <UInput v-model="diy.name" placeholder="e.g., Our Story" class="w-full" />
                                    </UFormField>
                                    <UFormField label="Header">
                                        <UInput v-model="diy.header" placeholder="Enter a header" class="w-full" />
                                    </UFormField>
                                    <UFormField label="Description">
                                        <UTextarea v-model="diy.description"
                                            placeholder="Enter your content for this section." class="w-full" />
                                    </UFormField>
                                </div>
                                <!-- Note: Currently only one DIY component is supported. UI can be extended for more. -->
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
                            <p v-if="!canPublishWebsite" class="text-sm text-toast-500">
                                Event payment must be approved before you can publish your website. You can still save
                                your progress.
                            </p>
                            <UButton v-if="canPublishWebsite" color="blue" block :loading="isSaving"
                                :disabled="isLoadingSite || isLoadingEvent || isSaving" @click="handleGoLive">
                                Publish Website
                            </UButton>
                            <UButton v-else color="blue" block :loading="isSaving"
                                :disabled="isLoadingSite || isLoadingEvent || isSaving" @click="handleSaveWebsite">
                                Save Website
                            </UButton>
                        </div>

                    </div>
                </UScrollArea>

                <!-- Static Footer -->
                <div class="pb-6 px-6 pt-4 shrink-0">
                    <div class="flex justify-end items-center">
                        <UButton v-if="currentStep < websiteSteps.length - 1" icon="i-lucide-arrow-right" color="blue"
                            @click="currentStep++" block class="items-center">
                            Next
                        </UButton>
                    </div>
                </div>
            </UPageCard>

            <!-- RIGHT SIDE: Live Preview / Final Website -->
            <UPageCard
                :class="isLive || isPreviewing ? 'col-span-full w-full rounded-none border-0  h-[calc(100vh-125px)]' : 'col-span-2 w-full rounded-xl'"
                class="flex flex-col gap-6 transition-colors duration-500 overflow-hidden ring-transparent bread-container"
                :ui="{ container: 'p-0 sm:p-0 lg:p-0 h-full flex flex-col' }">
                <div class="h-full w-full flex-1 flex flex-col md:flex-row transition-colors duration-500 relative"
                    :style="{
                        backgroundColor: websiteData.invertColors ? selectedPalette.colors.text_color : selectedPalette.colors.primary,
                        fontFamily: `'${selectedTypography.bodyFont}'`,
                    }">

                    <UHeader :links="[]" class="absolute top-0 w-full z-50 border-none"
                        :ui="{ container: 'justify-center' }" title="" :style="{
                            backgroundColor: websiteData.format === 'format2'
                                ? (websiteData.invertColors ? selectedPalette.colors.text_color : selectedPalette.colors.primary)
                                : (websiteData.invertColors ? selectedPalette.colors.text_color : selectedPalette.colors.primary),
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
                        }">
                        <template #left />
                        <template #right />
                        <template #default>
                            <div class="w-full">
                            <div class="flex items-center justify-center">
                                <!-- Left Links -->
                                <div class="flex-1 flex items-center justify-end gap-x-8 w-full">
                                    <UButton v-for="link in headerLinks.left" :key="link.id" variant="link"
                                        class="font-semibold text-sm whitespace-nowrap justify-center" :style="{
                                            color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color,
                                            visibility: link.id === 'placeholder' ? 'hidden' : 'visible',
                                            cursor: link.id === 'placeholder' ? 'default' : 'pointer'
                                        }" @click="handleHeaderLinkClick(link.id)">
                                        {{ link.name }}
                                    </UButton>
                                </div>
                                <!-- Spacer for the title -->
                                <div class="shrink-0" :style="{ width: spacerWidth }" />
                                <!-- Right Links -->
                                <div class="flex-1 flex items-center justify-start gap-x-8 w-full">
                                    <UButton v-for="link in headerLinks.right" :key="link.id" variant="link"
                                        class="font-semibold text-sm whitespace-nowrap justify-center" :style="{
                                            color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color,
                                            visibility: link.id === 'placeholder' ? 'hidden' : 'visible',
                                            cursor: link.id === 'placeholder' ? 'default' : 'pointer'
                                        }" @click="handleHeaderLinkClick(link.id)">
                                        {{ link.name }}
                                    </UButton>
                                </div>
                            </div>
                            </div>
                            <!-- Center Title -->
                            <div ref="siteTitleEl" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-xl px-4 pointer-events-none"
                                :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color, fontFamily: `'${selectedTypography.headerFont}'` }">
                                {{ previewSiteTitle }}
                            </div>
                        </template>
                    </UHeader>
                    <!-- LEFT SIDE (FIXED in Format 2 Desktop) -->
                    <div v-if="websiteData.format === 'format2'"
                        class="hidden md:flex flex-col gap-8 text-center pt-24 pb-10 px-6 relative justify-end w-1/2 shrink-0"
                        :class="isLive || isPreviewing ? 'h-[calc(100vh-64px)]' : 'h-[calc(100vh-125px)]'" :style="{
                            backgroundImage: `url(${currentHeaderImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        }">
                        <!-- Overlay for readability -->
                        <div class="absolute inset-0 z-0" :style="{
                            backgroundImage: `linear-gradient(to bottom, transparent 40%, ${websiteData.invertColors ? selectedPalette.colors.secondary_text_color : selectedPalette.colors.secondary}80)`
                        }">
                        </div>
                        <div class="relative z-10">
                            <h1 class="font-medium transition-all duration-300 text-white"
                                :style="{ fontFamily: `'${selectedTypography.headerFont}'` }"
                                :class="isLive || isPreviewing ? 'text-3xl md:text-5xl' : 'text-2xl md:text-3xl'">
                                {{ previewSiteDescription }}
                            </h1>
                        </div>
                    </div>

                    <UScrollArea class="flex-1 w-full h-full z-40 min-h-0"
                        :class="isLive || isPreviewing ? 'max-h-[calc(100vh-64px)]' : 'max-h-[calc(100vh-125px)]'">

                        <div class="flex flex-col min-h-full w-full z-10">
                            <!-- LEFT SIDE (Scrollable in Format 1, or Format 2 Mobile) -->
                            <div v-if="(websiteData.format === 'format1' && (websiteData.singlePageSite || activeComponentId === 'about-us')) || (websiteData.format === 'format2' && (websiteData.singlePageSite || activeComponentId === 'about-us'))" class="flex flex-col gap-8 text-center pt-24 pb-10 px-6 relative justify-end w-full"
                                :class="[
                                    websiteData.format === 'format2' ? 'md:hidden h-[40vh]' : (isLive || isPreviewing ? 'h-[80vh]' : 'h-[50vh]')
                                ]" :style="{
                                        backgroundImage: `url(${currentHeaderImage})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                    }">
                                <!-- Overlay for readability -->
                                <div class="absolute inset-0 z-0" :style="{
                                    backgroundImage: `linear-gradient(to bottom, transparent 40%, ${websiteData.invertColors ? selectedPalette.colors.secondary_text_color : selectedPalette.colors.secondary}80)`
                                }">
                                </div>
                                <div class="relative z-10">

                                    <div class="space-y-3">
                                        <h1 class="font-medium transition-all duration-300 text-white"
                                            :style="{ fontFamily: `'${selectedTypography.headerFont}'` }"
                                            :class="isLive || isPreviewing ? 'text-3xl md:text-5xl' : 'text-2xl md:text-3xl'">
                                            {{ previewSiteDescription }}
                                        </h1>


                                    </div>
                                </div>
                            </div>

                            <div class="w-full flex flex-col">
                                <!-- Dynamic Content Sections Preview -->
                                <div v-if="websiteData.singlePageSite || activeComponentId === 'about-us'"
                                    class="flex flex-col justify-center mx-10 py-20 text-center" :class="{ 'min-h-[80vh]': isLive || isPreviewing }">
                                    <UContainer v-if="headingSection"
                                        class="font-bold italic transition-all duration-300"
                                        :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                        :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                        {{ headingSection.content }}
                                    </UContainer>
                                    <div v-if="paragraphSection"
                                        class="prose max-w-none mx-auto text-center transition-all duration-300"
                                        :class="isLive || isPreviewing ? 'text-xl' : 'text-base'"
                                        :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color }">
                                        {{ paragraphSection.content }}
                                    </div>
                                </div>



                                <template v-for="(compId, index) in selectedComponents" :key="compId" >
                                    <!-- Q&A Preview -->
                                    <div v-if="compId === 'q-and-a' && tidbits.length > 0 && (websiteData.singlePageSite || activeComponentId === compId)"
                                        class="flex flex-col justify-center gap-10 px-6 text-center py-20"
                                        :class="{ 'min-h-[80vh]': isLive || isPreviewing }" :style="{
                                            backgroundColor: previewDynamicStyle(index).bg,
                                        }">
                                        <div class="font-bold transition-all duration-300"
                                            :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                            Q&A</div>


                                        <div v-for="tidbit in tidbits" :key="tidbit.id" class="flex flex-col gap-3">
                                            <h3 class="font-bold transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-4xl' : 'text-2xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                {{ tidbit.heading }}
                                            </h3>
                                            <div class="prose max-w-none mx-auto text-center transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-xl' : 'text-base'"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                {{ tidbit.paragraph }}
                                            </div>
                                        </div>
                                    </div>



                                    <!-- Schedule Preview -->
                                    <div v-if="compId === 'schedule' && scheduleItems.length > 0 && (websiteData.singlePageSite || activeComponentId === compId)"
                                        class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                        :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                        :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                        <div class="font-bold transition-all duration-300"
                                            :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                            Schedule</div>

                                        <div v-for="item in scheduleItems" :key="item.id" class="flex flex-col gap-3">
                                            <h3 class="font-bold transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-4xl' : 'text-2xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                {{ item.title }}
                                            </h3>
                                            <div class="prose max-w-none mx-auto text-center transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-xl' : 'text-base'"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                {{ item.description }}
                                            </div>
                                            <div v-if="item.location"
                                                class="font-semibold italic mt-2 transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-lg' : 'text-sm'"
                                                :style="{ color: previewDynamicStyle(index).heading }">
                                                <UIcon name="i-lucide-map-pin" class="mr-1 inline-block align-middle" />
                                                {{
                                                    item.location
                                                }}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- RSVP Preview Placeholder -->
                                    <div v-if="compId === 'rsvp' && (websiteData.singlePageSite || activeComponentId === compId)"
                                        class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                        :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                        :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                        <div class="font-bold transition-all duration-300"
                                            :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                            RSVP</div>
                                        <div class="flex flex-col items-center gap-5 text-sm"
                                            :style="{ color: previewDynamicStyle(index).text }">
                                            <div v-if="websiteData.rsvpDeadlineDate"
                                                class="font-semibold uppercase tracking-widest text-xs opacity-80">
                                                <UIcon name="i-lucide-calendar"
                                                    class="w-4 h-4 inline-block align-text-bottom mr-1" />
                                                RSVP by {{ formatDateWithWeekday(websiteData.rsvpDeadlineDate) }}
                                            </div>
                                            <UButton size="lg"
                                                class="transition-all duration-300 hover:opacity-80 shadow-md border"
                                                :style="{ // Adjusting button colors to use new palette structure
                                                    backgroundColor: previewDynamicStyle(index).text,
                                                    color: previewDynamicStyle(index).bg,
                                                    borderColor: previewDynamicStyle(index).bg === 'transparent' ? previewDynamicStyle(index - 1).text : previewDynamicStyle(index - 1).bg
                                                }">
                                                RSVP Here
                                            </UButton>
                                        </div>
                                    </div>

                                    <!-- Where to Stay Preview Placeholder -->
                                    <div v-if="compId === 'where-to-stay' && (websiteData.singlePageSite || activeComponentId === compId)"
                                        class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                        :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                        :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                        <div class="font-bold transition-all duration-300"
                                            :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                            Where to Stay</div>

                                        <div v-if="websiteData.whereToStayLocation"
                                            class="relative w-full h-100 max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg border"
                                            :style="{ borderColor: previewDynamicStyle(index).text }">
                                            <iframe width="100%" height="100%" frameborder="0" scrolling="no"
                                                marginheight="0" marginwidth="0"
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

                                    <!-- DIY Component Preview -->
                                    <template v-for="(diy, diyIndex) in diyComponents" :key="`diy-${diy.id}`">
                                        <div v-if="websiteData.singlePageSite || activeComponentId === `diy-${diy.id}`"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                            :class="{ 'min-h-[80vh]': isLive || isPreviewing }" :style="{
                                                backgroundColor: previewDynamicStyle(index + diyIndex).bg,
                                            }">
                                            <h2 class="font-bold transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index + diyIndex).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                {{ diy.header }}
                                            </h2>
                                            <div class="prose max-w-none mx-auto text-center transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-xl' : 'text-base'"
                                                :style="{ color: previewDynamicStyle(index + diyIndex).text }">
                                                {{ diy.description }}
                                            </div>
                                        </div>
                                    </template>

                                    <!-- Wedding Party Preview Placeholder -->
                                    <div v-if="compId === 'wedding-party' && (websiteData.singlePageSite || activeComponentId === compId)"
                                        class="flex flex-col justify-center gap-10 px-6 py-20 text-center"
                                        :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                        :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                        <div class="font-bold transition-all duration-300"
                                            :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                            Wedding Party</div>
                                        <div class="text-sm italic opacity-70"
                                            :style="{ color: previewDynamicStyle(index).text }">
                                            [ Wedding Party Component Preview goes here ]
                                        </div>
                                    </div>
                                </template>

                                <!-- Thank You / Ending Preview -->
                                <div v-if="websiteData.singlePageSite || activeComponentId === 'about-us'" class="flex flex-col justify-center gap-6 px-6 py-20 text-center"
                                    :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                    :style="{ backgroundColor: previewDynamicStyle(selectedComponents.length).bg }">
                                    <h2 class="font-bold transition-all duration-300"
                                        :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                        :style="{ color: previewDynamicStyle(selectedComponents.length).heading, fontFamily: `'${selectedTypography.headerFont}'` }">
                                        {{ websiteData.endingTitle }}
                                    </h2>
                                    <p class="prose max-w-none mx-auto text-center transition-all duration-300"
                                        :class="isLive || isPreviewing ? 'text-2xl' : 'text-lg'"
                                        :style="{ color: previewDynamicStyle(selectedComponents.length).text }">
                                        {{ websiteData.endingMessage }}
                                    </p>
                                </div>
                                <div v-if="websiteData.singlePageSite || activeComponentId === 'about-us' || websiteData.format === 'format2'" class="py-10 flex flex-col items-center justify-center gap-3"
                                    :style="{ backgroundColor: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color, borderColor: websiteData.invertColors ? selectedPalette.colors.text_color : selectedPalette.colors.primary }">
                                    <p class="text-xs font-semibold uppercase tracking-widest opacity-60"
                                        :style="{ color: websiteData.invertColors ? selectedPalette.colors.text_color : selectedPalette.colors.primary }">
                                        This website was made
                                        with</p>
                                    <div class="h-6 w-full opacity-80 mask-logo"
                                        :style="{ backgroundColor: websiteData.invertColors ? selectedPalette.colors.text_color : selectedPalette.colors.primary }"
                                        role="img" aria-label="Bread + Butter"></div>
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