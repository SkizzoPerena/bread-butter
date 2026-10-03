<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import aisleImage from '../assets/bpb-images/login-aisle.jpg'
import { getApiErrorMessage, reportApiError } from '~/types/auth'
import type { EventRecord, GuestRecord } from '~/types/event'
import type { GuestRoleRecord } from '~/types/guest_role'
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
    getGoogleMapsUrl,
    type ColorPalette,
    type TypographySet,
} from '~/utils/websiteTheme'
import { formatDateWithWeekday } from '~/utils/invitationDisplay'

definePageMeta({
    layout: 'event-sub-navbar',
    title: 'Website Maker',
    bgClass: 'bg-blue-50'
})

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
const { fetchGuestRolesByEvent } = useGuestRoles()
const { fetchGuestsByEvent } = useGuests()

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
    typography: 'Custom', // Default typography
    headerFont: 'Parisienne',
    subheaderFont: 'Cormorant Garamond',
    bodyFont: 'Montserrat',
    headerImage: '', // New: Header background image URL
    endingTitle: 'Hope to see you there!',
    endingMessage: 'We cannot wait to celebrate this special day with all of our favorite people.',
    isPasswordProtected: false,
    sitePassword: '',
    rsvpDeadlineDate: '2024-12-31', // Mocked from account data
    whereToStayLocation: 'Central Park, New York',
    whereToStayLatitude: 40.785091 as number | null,
    whereToStayLongitude: -73.968285 as number | null,
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

const colorTabSelected = ref<'templates' | 'custom'>('templates')
const colorTabs = [
    { label: 'Templates', slot: 'templates', icon: 'i-lucide-layout-grid' },
    { label: 'Custom Colors', slot: 'custom', icon: 'i-lucide-palette' }
]

const customColors = reactive({
    primary: '#FDFBF7',
    secondary: '#D4AF37',
    text_color: '#9CA986',
    secondary_text_color: '#3A4A29'
})

const customColorState = reactive({
    primary: { h: 40, s: 60, l: 98, hex: '#FDFBF7' },
    secondary: { h: 45, s: 65, l: 52, hex: '#D4AF37' },
    text_color: { h: 80, s: 18, l: 59, hex: '#9CA986' }
})

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    let clean = hex.replace('#', '').trim()
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('')
    }
    if (clean.length !== 6) {
        return { h: 0, s: 0, l: 50 }
    }
    const r = parseInt(clean.substring(0, 2), 16) / 255
    const g = parseInt(clean.substring(2, 4), 16) / 255
    const b = parseInt(clean.substring(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    }
}

function hslToHex(h: number, s: number, l: number): string {
    h = ((h % 360) + 360) % 360
    s = Math.max(0, Math.min(100, s)) / 100
    l = Math.max(0, Math.min(100, l)) / 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r = 0, g = 0, b = 0

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x
    }

    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function isDarkColor(hex: string): boolean {
    const { l } = hexToHsl(hex)
    return l < 55
}

function syncCustomColorState(colors: { primary: string; secondary: string; text_color: string; secondary_text_color?: string }) {
    customColors.primary = colors.primary
    customColors.secondary = colors.secondary
    customColors.text_color = colors.text_color
    customColors.secondary_text_color = colors.secondary_text_color || (isDarkColor(colors.secondary) ? '#FDFBF7' : '#1A1A1A')

    const p = hexToHsl(colors.primary)
    customColorState.primary = { ...p, hex: colors.primary }
    const s = hexToHsl(colors.secondary)
    customColorState.secondary = { ...s, hex: colors.secondary }
    const t = hexToHsl(colors.text_color)
    customColorState.text_color = { ...t, hex: colors.text_color }
}

function applyCustomColorToWebsite() {
    websiteData.colorPalette = 'Custom'
    customColors.primary = customColorState.primary.hex
    customColors.secondary = customColorState.secondary.hex
    customColors.text_color = customColorState.text_color.hex
    customColors.secondary_text_color = isDarkColor(customColorState.secondary.hex) ? '#FDFBF7' : '#1A1A1A'
}

function onHueChange(key: 'primary' | 'secondary' | 'text_color', hue: number) {
    customColorState[key].h = hue
    customColorState[key].hex = hslToHex(hue, customColorState[key].s, customColorState[key].l)
    applyCustomColorToWebsite()
}

function onSaturationChange(key: 'primary' | 'secondary' | 'text_color', saturation: number) {
    customColorState[key].s = saturation
    customColorState[key].hex = hslToHex(customColorState[key].h, saturation, customColorState[key].l)
    applyCustomColorToWebsite()
}

function onLightnessChange(key: 'primary' | 'secondary' | 'text_color', lightness: number) {
    customColorState[key].l = lightness
    customColorState[key].hex = hslToHex(customColorState[key].h, customColorState[key].s, lightness)
    applyCustomColorToWebsite()
}

function onHexChange(key: 'primary' | 'secondary' | 'text_color', rawHex: string) {
    const formatted = rawHex.startsWith('#') ? rawHex : `#${rawHex}`
    customColorState[key].hex = formatted.toUpperCase()
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
        const hsl = hexToHsl(formatted)
        customColorState[key].h = hsl.h
        customColorState[key].s = hsl.s
        customColorState[key].l = hsl.l
        applyCustomColorToWebsite()
    }
}

function selectPaletteTemplate(name: string) {
    websiteData.colorPalette = name
    colorTabSelected.value = 'templates'
    const found = resolvePalette(name)
    if (found) {
        syncCustomColorState(found.colors)
    }
}

watch(colorTabSelected, (newTab) => {
    if (newTab === 'custom') {
        websiteData.invertColors = false
        if (websiteData.colorPalette !== 'Custom') {
            websiteData.colorPalette = 'Custom'
            applyCustomColorToWebsite()
        }
    }
})

watch(
    () => websiteData.colorPalette,
    (newPalette) => {
        if (newPalette === 'Custom') {
            colorTabSelected.value = 'custom'
        } else {
            const found = resolvePalette(newPalette)
            if (found) {
                syncCustomColorState(found.colors)
            }
        }
    }
)

const selectedPalette = computed<ColorPalette>(() => {
    if (websiteData.colorPalette === 'Custom') {
        return {
            name: 'Custom',
            colors: {
                primary: customColors.primary,
                secondary: customColors.secondary,
                text_color: customColors.text_color,
                secondary_text_color: customColors.secondary_text_color || (isDarkColor(customColors.secondary) ? '#FDFBF7' : '#1A1A1A'),
            },
        }
    }
    return resolvePalette(websiteData.colorPalette)
})


const typographyTabSelected = ref<'header' | 'subheader' | 'body'>('header')
const typographyTabs = [
    { label: 'Header', slot: 'header', icon: 'i-lucide-heading' },
    { label: 'Subheader', slot: 'subheader', icon: 'i-lucide-heading-2' },
    { label: 'Body Font', slot: 'body', icon: 'i-lucide-align-left' },
]

const headerFontOptions = [
    { value: 'Parisienne', category: 'Romantic French Script' },
    { value: 'Great Vibes', category: 'Flourished Calligraphy' },
    { value: 'Alex Brush', category: 'Classic Cursive Script' },
    { value: 'Pinyon Script', category: 'Formal Copperplate' },
    { value: 'MonteCarlo', category: 'Vintage Luxury Script' },
    { value: 'Allura', category: 'Graceful Handwritten' },
    { value: 'Playfair Display', category: 'Romantic Editorial Serif' },
    { value: 'Bodoni Moda', category: 'High-Fashion Luxury Serif' },
    { value: 'Cinzel', category: 'Royal Roman Capitals' },
    { value: 'Cormorant Garamond', category: 'Timeless Regal Serif' },
    { value: 'Prata', category: 'Didone Romantic Serif' },
    { value: 'Italiana', category: 'Florentine Luxury Serif' },
    { value: 'DM Serif Display', category: 'Modern Wedding Serif' },
    { value: 'Marcellus', category: 'Classic Flared Serif' },
    { value: 'Castoro', category: 'Poetic Literary Serif' },
]

const subheaderFontOptions = [
    { value: 'Cormorant Garamond', category: 'Regal Serif' },
    { value: 'Playfair Display', category: 'Editorial Serif' },
    { value: 'Cinzel', category: 'Royal Roman Capitals' },
    { value: 'Lora', category: 'Contemporary Literary Serif' },
    { value: 'Marcellus', category: 'Classic Flared Serif' },
    { value: 'Bodoni Moda', category: 'Luxury Serif' },
    { value: 'Prata', category: 'Romantic Serif' },
    { value: 'Montserrat', category: 'Clean Modern Sans' },
    { value: 'Josefin Sans', category: 'Art Deco Sans' },
    { value: 'Tenor Sans', category: 'Humanist Refined Sans' },
    { value: 'Outfit', category: 'Modern Geometric Sans' },
    { value: 'Raleway', category: 'Sophisticated Light Sans' },
    { value: 'Quicksand', category: 'Soft Gentle Sans' },
    { value: 'Great Vibes', category: 'Calligraphy Accent' },
    { value: 'Parisienne', category: 'Script Accent' },
]

const bodyFontOptions = [
    { value: 'Montserrat', category: 'Clean & Modern Sans' },
    { value: 'Lato', category: 'Warm & Balanced Sans' },
    { value: 'Open Sans', category: 'Crisp & Highly Legible' },
    { value: 'Raleway', category: 'Sophisticated Sans' },
    { value: 'Nunito Sans', category: 'Soft & Friendly Sans' },
    { value: 'Plus Jakarta Sans', category: 'Contemporary Clean' },
    { value: 'Inter', category: 'Neutral Minimalist Sans' },
    { value: 'Outfit', category: 'Modern Geometric Sans' },
    { value: 'Lora', category: 'Warm Literary Serif' },
    { value: 'Cormorant Garamond', category: 'Classic Fine Serif' },
    { value: 'Merriweather', category: 'Stately Traditional Serif' },
    { value: 'Josefin Sans', category: 'Art Deco Sans' },
]

const selectedTypography = computed<TypographySet>(() => ({
    name: `${websiteData.headerFont || 'Parisienne'} / ${websiteData.subheaderFont || 'Cormorant Garamond'} / ${websiteData.bodyFont || 'Montserrat'}`,
    headerFont: websiteData.headerFont || 'Parisienne',
    subheaderFont: websiteData.subheaderFont || 'Cormorant Garamond',
    bodyFont: websiteData.bodyFont || 'Montserrat',
}))

// Responsive font size auto-fitting directive
interface FitTextOptions {
    max?: number
    min?: number
}

const fitTextObservers = new WeakMap<HTMLElement, ResizeObserver>()

function fitElementText(el: HTMLElement, max = 22, min = 11) {
    if (!el || !el.isConnected) return
    const availableWidth = el.clientWidth
    if (availableWidth <= 0) return

    // Set font size to max to measure natural unconstrained text width
    el.style.fontSize = `${max}px`

    // If it fits at max without overflow, no reduction needed
    if (el.scrollWidth <= availableWidth) {
        return
    }

    // Proportional down-scale estimate
    const ratio = availableWidth / el.scrollWidth
    let size = Math.max(min, Math.min(max, Math.floor(max * ratio)))
    el.style.fontSize = `${size}px`

    // If still overflowing due to kerning or subpixel limits, step down in 0.5px increments
    let iterations = 0
    while (el.scrollWidth > availableWidth && size > min && iterations < 30) {
        size -= 0.5
        el.style.fontSize = `${size}px`
        iterations++
    }
}

function setupFitText(el: HTMLElement, options?: FitTextOptions) {
    const max = options?.max ?? 22
    const min = options?.min ?? 11

    const run = () => {
        fitElementText(el, max, min)
    }

    run()

    // Recalculate once web fonts finish loading so exact glyph widths are evaluated
    if (typeof document !== 'undefined' && 'fonts' in document) {
        document.fonts.ready.then(run).catch(() => { })
    }

    const parent = el.parentElement
    if (parent && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
            run()
        })
        ro.observe(parent)
        fitTextObservers.set(el, ro)
    }
}

function cleanupFitText(el: HTMLElement) {
    const ro = fitTextObservers.get(el)
    if (ro) {
        ro.disconnect()
        fitTextObservers.delete(el)
    }
}

const vFitText = {
    mounted(el: HTMLElement, binding: { value?: FitTextOptions }) {
        nextTick(() => {
            setupFitText(el, binding.value)
        })
    },
    updated(el: HTMLElement, binding: { value?: FitTextOptions }) {
        nextTick(() => {
            const max = binding.value?.max ?? 22
            const min = binding.value?.min ?? 11
            fitElementText(el, max, min)
        })
    },
    unmounted(el: HTMLElement) {
        cleanupFitText(el)
    }
}

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
const displayComponents = computed(() => {
    return selectedComponents.value.filter(id => id !== 'diy')
})

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

const getStepShortName = (step: StepDef) => {
    if (step.name) return step.name;
    const shortNames: Record<string, string> = {
        'choose-format': 'Format',
        'choose-motif': 'Motif',
        'header-image': 'Header',
        'color-palette': 'Palette',
        'color-remix': 'Remix',
        'typography': 'Fonts',
        'basic-info': 'Info',
        'content-sections': 'Sections',
        'components': 'Blocks',
        'thank-you': 'Closing',
        'review-publish': 'Review'
    };
    return shortNames[step.id] || step.id;
};

const websiteSteps = computed(() => {
    const baseSteps: StepDef[] = [
        { id: 'choose-format', icon: 'i-lucide-layout', description: "Select the structural layout for your website." },
        { id: 'header-image', icon: 'i-lucide-image', description: "1. Upload a captivating image for your website's header." },
        { id: 'color-palette', icon: 'i-lucide-swatch-book', description: "Choose a color scheme for your website." },
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

    const components = [aboutUsLink, ...dynamicComponents, ...diyLinks];

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

const headerDropdownItems = computed(() => {
    const aboutUsLink = { label: 'About Us', onSelect: () => handleHeaderLinkClick('about-us') }
    const dynamicItems = selectedComponents.value.filter(id => id !== 'diy')
        .map(id => availableComponents.find(c => c.id === id))
        .filter(Boolean)
        .map(c => ({ label: c!.name, onSelect: () => handleHeaderLinkClick(c!.id) }))

    const diyItems = diyComponents.value.map(diy => ({
        label: diy.name,
        onSelect: () => handleHeaderLinkClick(`diy-${diy.id}`)
    }))

    return [[aboutUsLink, ...dynamicItems, ...diyItems]]
});

const activeComponentId = ref<string>('about-us');

function handleHeaderLinkClick(id: string) {
    if (websiteData.singlePageSite) {
        const target = document.getElementById(`preview-section-${id}`)
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            return
        }
        if (id === 'about-us') {
            const topTarget = document.getElementById('preview-scroll-top')
            topTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
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
    date?: string;
    startTime?: string;
    endTime?: string;
    isAllDay?: boolean;
}

const scheduleItems = ref<ScheduleItem[]>([
    {
        id: Date.now(),
        title: 'Wedding Ceremony',
        description: 'The exchange of vows and rings.',
        location: 'Main Garden',
        date: '',
        startTime: '15:00',
        endTime: '16:30',
        isAllDay: false
    }
])

const addScheduleItem = () => {
    const defaultDate = eventRecord.value?.eventDate ? eventRecord.value.eventDate.slice(0, 10) : ''
    scheduleItems.value.push({
        id: Date.now() + scheduleItems.value.length,
        title: 'New Event',
        description: 'Event details here.',
        location: '',
        date: defaultDate,
        startTime: '17:00',
        endTime: '21:00',
        isAllDay: false
    })
}

const removeScheduleItem = (id: number) => {
    scheduleItems.value = scheduleItems.value.filter(s => s.id !== id)
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

function formatScheduleTime(item: ScheduleItem): string {
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
                year: 'numeric'
            })
        }
        const d = new Date(dateStr)
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    } catch {
        return dateStr
    }
}

// 5. Where to Stay Accommodations (Up to 4 slots)
interface WhereToStayAccommodation {
    id: string
    name: string
    rating?: string
    distance?: string
    description?: string
    link?: string
    image?: string
}

function getAccommodationImage(hotel?: { name?: string; image?: string }): string {
    if (hotel?.image && hotel.image.trim()) {
        return hotel.image.trim()
    }
    const fallbacks = [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=700&q=80'
    ]
    const name = hotel?.name || ''
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0
    }
    return fallbacks[hash % fallbacks.length] || fallbacks[0]!
}

const defaultAccommodations: WhereToStayAccommodation[] = [
    {
        id: 'acc-1',
        name: 'The Grand Hotel & Suites',
        rating: '4.8 ★',
        distance: '5 mins from venue',
        description: 'Luxury rooms & suites with grand ballroom and fine dining.',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
        link: ''
    },
    {
        id: 'acc-2',
        name: 'Boutique Garden Resort',
        rating: '4.7 ★',
        distance: '10 mins away',
        description: 'Scenic garden view, private verandas & pool lounge.',
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
        link: ''
    },
    {
        id: 'acc-3',
        name: 'City Center Hotel & Spa',
        rating: '4.6 ★',
        distance: '15 mins away',
        description: 'Modern central amenities with full luxury wellness spa.',
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
        link: ''
    },
    {
        id: 'acc-4',
        name: 'Cozy Inn & Bed & Breakfast',
        rating: '4.9 ★',
        distance: '8 mins away',
        description: 'Charming breakfast stay with scenic hillside views.',
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=700&q=80',
        link: ''
    }
]

const whereToStayAccommodations = ref<WhereToStayAccommodation[]>([...defaultAccommodations])

function getAccommodationGoogleUrl(item: { name: string; link?: string }, location?: string): string {
    if (item.link && item.link.trim()) {
        return item.link.trim()
    }
    const query = [item.name, location, 'hotel reviews'].filter(Boolean).join(' ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function getAreaHotelsGoogleReviewsUrl(
    location?: string,
    coords?: { lat?: number | null; lng?: number | null } | null
): string {
    if (coords && coords.lat != null && coords.lng != null && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        return `https://www.google.com/maps/search/hotels+and+accommodations/@${coords.lat},${coords.lng},14z`
    }
    const loc = (location || '').trim() || 'wedding venue'
    return `https://www.google.com/maps/search/hotels+and+accommodations+near+${encodeURIComponent(loc)}`
}

function getVenueGoogleMapsUrl(
    location?: string,
    coords?: { lat?: number | null; lng?: number | null } | null
): string {
    if (coords && coords.lat != null && coords.lng != null && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    }
    const loc = (location || '').trim() || 'wedding venue'
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`
}

// -------------------------------------------------------------
// Google Maps / Live Geocoding for Venue Location
// -------------------------------------------------------------
interface GeocodeResultItem {
    name: string
    displayName: string
    lat: number
    lng: number
    address?: {
        city?: string
        state?: string
        country?: string
    }
}

const venueSearchResults = ref<GeocodeResultItem[]>([])
const isSearchingVenue = ref(false)
const showVenueDropdown = ref(false)
const isDetectingLocation = ref(false)
let venueSearchTimer: ReturnType<typeof setTimeout> | null = null

async function searchVenueLocations(query: string) {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
        venueSearchResults.value = []
        showVenueDropdown.value = false
        return
    }

    isSearchingVenue.value = true
    try {
        const data = await $fetch<{ results: GeocodeResultItem[] }>('/api/geocode', {
            params: { q: trimmed },
        })
        venueSearchResults.value = data?.results || []
        showVenueDropdown.value = venueSearchResults.value.length > 0
    } catch {
        venueSearchResults.value = []
    } finally {
        isSearchingVenue.value = false
    }
}

function onVenueSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value
    websiteData.whereToStayLocation = value
    if (venueSearchTimer) clearTimeout(venueSearchTimer)
    venueSearchTimer = setTimeout(() => {
        searchVenueLocations(value)
    }, 350)
}

async function triggerVenueSearch() {
    const query = (websiteData.whereToStayLocation || '').trim()
    if (!query) return
    await searchVenueLocations(query)
    if (venueSearchResults.value.length === 1 && venueSearchResults.value[0]) {
        selectVenueLocation(venueSearchResults.value[0])
    } else if (venueSearchResults.value.length > 0) {
        showVenueDropdown.value = true
    }
}

function selectVenueLocation(result: GeocodeResultItem) {
    websiteData.whereToStayLocation = result.displayName || result.name
    websiteData.whereToStayLatitude = result.lat
    websiteData.whereToStayLongitude = result.lng
    showVenueDropdown.value = false
    venueSearchResults.value = []
    toast.add({
        title: 'Coordinates Found & Synced',
        description: `Pinned at ${result.lat.toFixed(4)}°, ${result.lng.toFixed(4)}°`,
        color: 'success',
    })
}

function clearVenueLocation() {
    websiteData.whereToStayLocation = ''
    websiteData.whereToStayLatitude = null
    websiteData.whereToStayLongitude = null
    venueSearchResults.value = []
    showVenueDropdown.value = false
}

async function detectCurrentLocation() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
        toast.add({
            title: 'Geolocation Unavailable',
            description: 'Browser geolocation is not available on this device.',
            color: 'error',
        })
        return
    }
    isDetectingLocation.value = true
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude
            const lng = pos.coords.longitude
            websiteData.whereToStayLatitude = lat
            websiteData.whereToStayLongitude = lng
            try {
                const data = await $fetch<{ results: GeocodeResultItem[] }>('/api/geocode', {
                    params: { q: `${lat}, ${lng}` },
                })
                if (data?.results?.[0]) {
                    websiteData.whereToStayLocation = data.results[0].displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                } else {
                    websiteData.whereToStayLocation = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                }
            } catch {
                websiteData.whereToStayLocation = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            } finally {
                isDetectingLocation.value = false
                toast.add({
                    title: 'Current Location Synced',
                    description: `Pinned at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
                    color: 'success',
                })
            }
        },
        (err) => {
            isDetectingLocation.value = false
            toast.add({
                title: 'Location Request Failed',
                description: err.message || 'Could not retrieve current location.',
                color: 'warning',
            })
        },
        { timeout: 10000, enableHighAccuracy: true }
    )
}

interface SuggestedAccommodation {
    name: string
    rating: string
    reviewsCount: string
    distance: string
    description: string
    image?: string
    badge?: string
    tags?: string[]
}

const destinationHotelsDatabase: Record<string, SuggestedAccommodation[]> = {
    tagaytay: [
        {
            name: 'Taal Vista Hotel',
            rating: '4.8 ★',
            reviewsCount: '3,420+ reviews',
            distance: '0.5 km from venue',
            description: 'Iconic ridge hotel with panoramic Taal Lake & Volcano views, luxury rooms & dining.',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
            badge: 'Most Popular',
            tags: ['Lake View', 'Swimming Pool', 'Buffet Breakfast']
        },
        {
            name: 'Discovery Country Suites',
            rating: '4.9 ★',
            reviewsCount: '1,280+ reviews',
            distance: '1.2 km from venue',
            description: 'Exclusive boutique bed & breakfast country manor with personalized luxury hospitality.',
            image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
            badge: 'Top Rated',
            tags: ['Boutique', 'Cozy Manor', 'Gourmet Breakfast']
        },
        {
            name: 'Escala Tagaytay',
            rating: '4.8 ★',
            reviewsCount: '2,150+ reviews',
            distance: '1.8 km from venue',
            description: 'Modern luxury retreat famous for its picturesque infinity pool overlooking the crater ridge.',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
            badge: 'Infinity Pool',
            tags: ['Infinity Pool', 'Ridge Balcony', 'Modern Design']
        },
        {
            name: 'Anya Resort Tagaytay',
            rating: '4.9 ★',
            reviewsCount: '1,890+ reviews',
            distance: '3.5 km from venue',
            description: 'Tranquil sanctuary with private villas, award-winning Nira Spa, and fine dining.',
            image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
            badge: 'Luxury Villas',
            tags: ['Private Villas', 'Luxury Spa', 'Fine Dining']
        },
        {
            name: 'Twin Lakes Hotel',
            rating: '4.7 ★',
            reviewsCount: '2,780+ reviews',
            distance: '4.2 km from venue',
            description: 'European vineyard-inspired architecture with expansive mountain and valley vistas.',
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Vineyard Style',
            tags: ['Vineyard Views', 'Spacious Suites', 'Heated Pool']
        },
        {
            name: 'Hotel Kimberly Tagaytay',
            rating: '4.7 ★',
            reviewsCount: '1,640+ reviews',
            distance: '2.0 km from venue',
            description: 'Lush garden grounds with outdoor movie nights, animal farm, and family relaxation.',
            image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
            tags: ['Lush Garden', 'Family Friendly', 'Complimentary Breakfast']
        }
    ],
    manila: [
        {
            name: 'The Manila Hotel',
            rating: '4.8 ★',
            reviewsCount: '8,920+ reviews',
            distance: '0.6 km from venue',
            description: 'Historic 5-star grand dame hotel with presidential heritage, champagne room & bay sunset.',
            image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
            badge: 'Historic 5-Star',
            tags: ['Historic Landmark', 'Champagne Room', 'Bay View']
        },
        {
            name: 'The Peninsula Manila',
            rating: '4.9 ★',
            reviewsCount: '5,430+ reviews',
            distance: '1.5 km from venue',
            description: 'Iconic luxury hotel in Makati with legendary lobby orchestra, 5-star suites & spa.',
            image: 'https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=700&q=80',
            badge: 'Luxury Classic',
            tags: ['Iconic Lobby', '5-Star Spa', 'Prime Location']
        },
        {
            name: 'Grand Hyatt Manila',
            rating: '4.9 ★',
            reviewsCount: '4,110+ reviews',
            distance: '1.8 km from venue',
            description: 'Soaring Bonifacio Global City skyline tower with luxury suites, spa and rooftop restaurant.',
            image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=700&q=80',
            badge: 'Skyline Luxury',
            tags: ['BGC Skyline', 'The Peak Bar', 'Luxury Suites']
        },
        {
            name: 'The Bayleaf Intramuros',
            rating: '4.7 ★',
            reviewsCount: '2,430+ reviews',
            distance: '0.3 km from venue',
            description: 'Charming boutique hotel located right within the historic walls of Intramuros.',
            image: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=700&q=80',
            badge: 'Historic Center',
            tags: ['Rooftop View', 'Within Intramuros', 'Boutique']
        },
        {
            name: 'Shangri-La The Fort',
            rating: '4.9 ★',
            reviewsCount: '6,240+ reviews',
            distance: '1.2 km from venue',
            description: 'Contemporary luxury landmark in BGC featuring bespoke dining and extensive wellness facilities.',
            image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=700&q=80',
            badge: 'Top Rated',
            tags: ['Kerry Sports', 'High Street', 'Luxury Pool']
        }
    ],
    boracay: [
        {
            name: 'Shangri-La Boracay Resort & Spa',
            rating: '4.9 ★',
            reviewsCount: '4,850+ reviews',
            distance: 'Private secluded beach',
            description: 'Ultra-exclusive cliffside villas and lush tropical sanctuary on a private cove.',
            image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=700&q=80',
            badge: '5-Star Sanctuary',
            tags: ['Private Beach', 'Cliff Villas', 'Sunset Views']
        },
        {
            name: 'Discovery Shores Boracay',
            rating: '4.9 ★',
            reviewsCount: '3,760+ reviews',
            distance: 'Station 1 Beachfront',
            description: 'Consistently awarded beachfront luxury with world-class hospitality and sunset lounge.',
            image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
            badge: 'Beachfront Choice',
            tags: ['Station 1', 'Beach Service', 'Award Winning']
        },
        {
            name: 'The Lind Boracay',
            rating: '4.8 ★',
            reviewsCount: '2,340+ reviews',
            distance: 'Station 1 Beachfront',
            description: 'Vibrant modern luxury resort with beachfront infinity pool and designer suites.',
            image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=700&q=80',
            badge: 'Modern Chic',
            tags: ['Infinity Pool', 'Cabana Bar', 'White Beach']
        },
        {
            name: 'Henann Prime Beach Resort',
            rating: '4.7 ★',
            reviewsCount: '3,120+ reviews',
            distance: 'Station 1 Beachfront',
            description: 'Direct beachfront access with signature crystal lagoon pools and ocean-view rooms.',
            image: 'https://images.unsplash.com/photo-1512353087810-25dfcd100962?auto=format&fit=crop&w=700&q=80',
            tags: ['Lagoon Access', 'Beachfront', 'Swim-up Bar']
        }
    ],
    cebu: [
        {
            name: 'Shangri-La Mactan Resort & Spa',
            rating: '4.9 ★',
            reviewsCount: '5,620+ reviews',
            distance: '15 mins from airport',
            description: 'Tropical paradise featuring 13 hectares of lush gardens, private marine sanctuary and beach.',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
            badge: 'Resort Favorite',
            tags: ['Marine Sanctuary', 'Private Cove', 'Chi Spa']
        },
        {
            name: 'Crimson Resort & Spa Mactan',
            rating: '4.8 ★',
            reviewsCount: '3,940+ reviews',
            distance: '20 mins from venue',
            description: 'Balinese-style private pool villas, infinity pool cascading down to the sea, and Azure beach club.',
            image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
            badge: 'Private Villas',
            tags: ['Plunge Pool', 'Beach Club', 'Ocean View']
        },
        {
            name: 'Plantation Bay Resort & Spa',
            rating: '4.8 ★',
            reviewsCount: '4,120+ reviews',
            distance: '25 mins from venue',
            description: 'Sprawling private waterways and man-made saltwater lagoons with colonial plantation elegance.',
            image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=700&q=80',
            tags: ['Saltwater Lagoon', 'Paddleboards', 'Spacious Grounds']
        },
        {
            name: 'Radisson Blu Hotel Cebu',
            rating: '4.8 ★',
            reviewsCount: '4,500+ reviews',
            distance: 'City Center',
            description: 'Upscale 5-star city hotel with premier amenities, lagoon pool, and direct mall connectivity.',
            image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
            tags: ['City Convenience', 'Large Pool', 'International Buffet']
        }
    ],
    baguio: [
        {
            name: 'The Manor at Camp John Hay',
            rating: '4.9 ★',
            reviewsCount: '6,840+ reviews',
            distance: 'Camp John Hay',
            description: 'Timeless pine-scented luxury lodge featuring cozy fireplace suites and picturesque garden courtyard.',
            image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=700&q=80',
            badge: 'Baguio Classic',
            tags: ['Pine Forest', 'Fireplace Courtyard', 'Le Chef Dining']
        },
        {
            name: 'Baguio Country Club',
            rating: '4.9 ★',
            reviewsCount: '3,420+ reviews',
            distance: 'South Drive',
            description: 'Prestigious country club with championship golf course, heritage cottages, and bakery.',
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Exclusive',
            tags: ['Golf Course', 'Exclusive Club', 'Famous Pastries']
        },
        {
            name: 'Grand Sierra Pines Baguio',
            rating: '4.8 ★',
            reviewsCount: '2,640+ reviews',
            distance: 'North Outlook Drive',
            description: 'Serene eco-friendly sanctuary with private pine forest views, mini art gallery, and quiet spa.',
            image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
            tags: ['Eco Sanctuary', 'Art Gallery', 'Forest Balconies']
        },
        {
            name: 'Le Monet Hotel',
            rating: '4.7 ★',
            reviewsCount: '2,180+ reviews',
            distance: 'Camp John Hay',
            description: 'Boutique floral retreat with heated indoor swimming pool and warm country atmosphere.',
            image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
            tags: ['Heated Pool', 'Camp John Hay', 'Breakfast Buffet']
        }
    ],
    newyork: [
        {
            name: 'The Plaza Hotel',
            rating: '4.8 ★',
            reviewsCount: '11,200+ reviews',
            distance: '0.1 km from Central Park',
            description: 'Centuries of storied elegance overlooking Central Park South, with white-glove butler service.',
            image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
            badge: 'Historic 5-Star',
            tags: ['5-Star Luxury', 'Central Park South', 'Palm Court']
        },
        {
            name: 'The Ritz-Carlton New York, Central Park',
            rating: '4.9 ★',
            reviewsCount: '3,840+ reviews',
            distance: 'Direct Central Park View',
            description: 'Townhouse-style luxury with bespoke Central Park vistas, Contour lounge, and La Prairie spa.',
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Park Views',
            tags: ['Central Park Views', 'Bespoke Service', 'Luxury Spa']
        },
        {
            name: '1 Hotel Central Park',
            rating: '4.8 ★',
            reviewsCount: '2,980+ reviews',
            distance: '1 block from Central Park',
            description: 'Eco-conscious luxury sanctuary crafted with reclaimed natural materials and living greenery.',
            image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=700&q=80',
            badge: 'Eco-Luxury',
            tags: ['Sustainable Design', 'Jams Dining', 'Park Proximity']
        },
        {
            name: 'Mandarin Oriental New York',
            rating: '4.8 ★',
            reviewsCount: '3,110+ reviews',
            distance: 'Columbus Circle',
            description: 'High-floor panoramic views of Central Park and the Manhattan skyline with 5-star spa amenities.',
            image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=700&q=80',
            tags: ['Skyline Panoramas', '5-Star Spa', 'Indoor Lap Pool']
        }
    ]
}

function getDynamicAccommodations(location: string): SuggestedAccommodation[] {
    const locLower = (location || '').toLowerCase()
    for (const [key, hotels] of Object.entries(destinationHotelsDatabase)) {
        if (locLower.includes(key)) {
            return hotels
        }
    }
    // Check common aliases
    if (locLower.includes('makati') || locLower.includes('bgc') || locLower.includes('bonifacio') || locLower.includes('intramuros')) {
        return destinationHotelsDatabase.manila || []
    }
    if (locLower.includes('mactan')) {
        return destinationHotelsDatabase.cebu || []
    }
    if (locLower.includes('central park') || locLower.includes('manhattan') || locLower.includes('brooklyn') || locLower.includes('ny')) {
        return destinationHotelsDatabase.newyork || []
    }

    const clean = (location || '').trim() || 'Wedding Venue'
    return [
        {
            name: `The Grand Hotel & Suites ${clean}`,
            rating: '4.9 ★',
            reviewsCount: '1,840+ reviews',
            distance: '0.8 km from venue',
            description: `Premier 5-star luxury stay with spacious bridal suites, fine dining, and prime accessibility in ${clean}.`,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
            badge: 'Top Rated',
            tags: ['5-Star Luxury', 'Bridal Suites', 'Free Breakfast']
        },
        {
            name: `${clean} Boutique Resort & Spa`,
            rating: '4.8 ★',
            reviewsCount: '1,420+ reviews',
            distance: '1.5 km from venue',
            description: `Charming boutique retreat offering tranquil gardens, relaxation spa, and scenic photo spots in ${clean}.`,
            image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
            badge: 'Boutique Pick',
            tags: ['Garden Retreat', 'Full Spa', 'Scenic Grounds']
        },
        {
            name: `Heritage Manor & Country Club ${clean}`,
            rating: '4.8 ★',
            reviewsCount: '980+ reviews',
            distance: '2.3 km from venue',
            description: `Classic estate elegance surrounded by lush greenery, event-friendly rooms, and warm hospitality.`,
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Heritage Estate',
            tags: ['Estate Grounds', 'Event Friendly', 'Fine Dining']
        },
        {
            name: `Courtyard & Suites ${clean}`,
            rating: '4.7 ★',
            reviewsCount: '1,650+ reviews',
            distance: '3.0 km from venue',
            description: `Modern accommodations with comfortable amenities, pool deck, and convenient transportation links.`,
            image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
            tags: ['Modern Comfort', 'Swimming Pool', 'Free High-speed Wi-Fi']
        },
        {
            name: `The Vista Villas at ${clean}`,
            rating: '4.9 ★',
            reviewsCount: '720+ reviews',
            distance: '3.8 km from venue',
            description: `Private secluded villas with picturesque landscape views, ideal for wedding parties and family stays.`,
            image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
            badge: 'Private Villas',
            tags: ['Private Villas', 'Panoramic Views', 'Family Friendly']
        }
    ]
}

// Accommodation Modal State
const isAccommodationPickerOpen = ref(false)
const activeAccommodationSlotIndex = ref(0)
const accommodationSearchQuery = ref('')
const selectedAccommodationCategory = ref('all')

const displayAccommodationsList = computed(() => {
    const list = getDynamicAccommodations(websiteData.whereToStayLocation)
    const query = accommodationSearchQuery.value.trim().toLowerCase()
    const cat = selectedAccommodationCategory.value

    return list.filter(h => {
        if (cat === 'luxury') {
            const isLux = (h.badge && (h.badge.includes('5-Star') || h.badge.includes('Luxury'))) ||
                (h.tags && h.tags.some(t => t.toLowerCase().includes('luxury') || t.toLowerCase().includes('5-star'))) ||
                h.rating.includes('4.9')
            if (!isLux) return false
        } else if (cat === 'resort') {
            const isResort = h.name.toLowerCase().includes('resort') ||
                h.name.toLowerCase().includes('villa') ||
                (h.tags && h.tags.some(t => t.toLowerCase().includes('pool') || t.toLowerCase().includes('resort') || t.toLowerCase().includes('villa')))
            if (!isResort) return false
        } else if (cat === 'boutique') {
            const isBoutique = h.name.toLowerCase().includes('boutique') ||
                h.name.toLowerCase().includes('inn') ||
                h.name.toLowerCase().includes('manor') ||
                (h.badge && h.badge.toLowerCase().includes('boutique')) ||
                (h.tags && h.tags.some(t => t.toLowerCase().includes('boutique') || t.toLowerCase().includes('cozy')))
            if (!isBoutique) return false
        } else if (cat === 'nearby') {
            const isNearby = h.distance.includes('0.') || h.distance.includes('1.') || h.distance.toLowerCase().includes('mins') || h.distance.toLowerCase().includes('park')
            if (!isNearby) return false
        }

        if (!query) return true
        return (
            h.name.toLowerCase().includes(query) ||
            h.description.toLowerCase().includes(query) ||
            h.distance.toLowerCase().includes(query) ||
            (h.tags && h.tags.some(t => t.toLowerCase().includes(query)))
        )
    })
})

const previewAccommodations = computed(() => {
    const list = whereToStayAccommodations.value.slice(0, 4)
    const filled = list.filter(h => h && h.name && h.name.trim())
    return filled.length > 0 ? filled : list
})

function openAccommodationPicker(slotIdx: number) {
    activeAccommodationSlotIndex.value = slotIdx
    accommodationSearchQuery.value = ''
    selectedAccommodationCategory.value = 'all'
    isAccommodationPickerOpen.value = true
}

function selectAccommodationForSlot(hotel: { name: string; rating?: string; distance?: string; description?: string; link?: string; image?: string }) {
    const idx = activeAccommodationSlotIndex.value
    while (whereToStayAccommodations.value.length <= idx) {
        whereToStayAccommodations.value.push({
            id: `acc-${whereToStayAccommodations.value.length + 1}`,
            name: '',
            rating: '',
            distance: '',
            description: '',
            link: '',
            image: ''
        })
    }
    whereToStayAccommodations.value[idx] = {
        id: whereToStayAccommodations.value[idx]?.id || `acc-${idx + 1}`,
        name: hotel.name,
        rating: hotel.rating || '4.8 ★',
        distance: hotel.distance || 'Near venue',
        description: hotel.description || '',
        link: hotel.link || '',
        image: hotel.image || getAccommodationImage(hotel)
    }
    isAccommodationPickerOpen.value = false
    toast.add({
        title: `Slot ${idx + 1} Selected`,
        description: `${hotel.name} was added to your accommodations.`,
        color: 'success'
    })
}

function clearSlotAccommodation(idx: number) {
    if (whereToStayAccommodations.value[idx]) {
        whereToStayAccommodations.value[idx] = {
            id: `acc-${idx + 1}`,
            name: '',
            rating: '',
            distance: '',
            description: '',
            link: ''
        }
    }
    toast.add({
        title: `Slot ${idx + 1} Cleared`,
        description: 'Accommodation slot reset.',
        color: 'info'
    })
}

// 6. DIY Component Section
interface DiyComponent {
    id: string;
    name: string;
    header: string;
    description: string;
}
const diyComponents = ref<DiyComponent[]>([]);

// 6. Wedding Party Section (Linked to Guest List entourage roles)
interface WeddingPartyMember {
    id: string
    name: string
    role: string
    email?: string
    notes?: string
}

interface WeddingPartyGroup {
    roleName: string
    members: WeddingPartyMember[]
}

const weddingPartyIntro = ref('Meet the wonderful friends and family standing beside us on our wedding day.')
const customWeddingPartyMembers = ref<WeddingPartyMember[]>([])
const eventGuestsList = ref<GuestRecord[]>([])
const guestRolesList = ref<GuestRoleRecord[]>([])

const linkedGuestPartyMembers = computed<WeddingPartyMember[]>(() => {
    const list: WeddingPartyMember[] = []
    const seen = new Set<string>()

    // 1. From guest roles
    for (const role of guestRolesList.value) {
        const roleName = role.name?.trim()
        if (!roleName) continue
        for (const guest of role.guests || []) {
            const fullName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || guest.envelopeName || 'Guest'
            const key = `${guest._id}-${roleName.toLowerCase()}`
            if (!seen.has(key)) {
                seen.add(key)
                list.push({
                    id: `${guest._id}-${role._id || roleName}`,
                    name: fullName,
                    role: roleName,
                    email: guest.email
                })
            }
        }
    }

    // 2. From event guests (if guest has roles array)
    for (const guest of eventGuestsList.value) {
        if (!guest.roles || guest.roles.length === 0) continue
        const fullName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || guest.envelopeName || 'Guest'
        for (const r of guest.roles) {
            const roleName = (typeof r === 'string' ? r : r.name)?.trim()
            if (!roleName) continue
            const key = `${guest._id}-${roleName.toLowerCase()}`
            if (!seen.has(key)) {
                seen.add(key)
                list.push({
                    id: `${guest._id}-${roleName}`,
                    name: fullName,
                    role: roleName,
                    email: guest.email
                })
            }
        }
    }

    return list
})

const sampleWeddingPartyMembers: WeddingPartyMember[] = [
    { id: 'sample-1', name: 'Sofia Rodriguez', role: 'Maid of Honor' },
    { id: 'sample-2', name: 'Lucas Vance', role: 'Best Man' },
    { id: 'sample-3', name: 'Camila Santos', role: 'Bridesmaids' },
    { id: 'sample-4', name: 'Elena Reyes', role: 'Bridesmaids' },
    { id: 'sample-5', name: 'Mateo Cruz', role: 'Groomsmen' },
    { id: 'sample-6', name: 'Julian Navarro', role: 'Groomsmen' },
]

const effectiveWeddingPartyMembers = computed<WeddingPartyMember[]>(() => {
    const combined = [
        ...linkedGuestPartyMembers.value,
        ...customWeddingPartyMembers.value
    ]
    if (combined.length > 0) return combined
    return sampleWeddingPartyMembers
})

const groupedWeddingParty = computed<WeddingPartyGroup[]>(() => {
    const groupsMap = new Map<string, WeddingPartyMember[]>()
    for (const member of effectiveWeddingPartyMembers.value) {
        const role = member.role.trim() || 'Wedding Party'
        if (!groupsMap.has(role)) {
            groupsMap.set(role, [])
        }
        groupsMap.get(role)!.push(member)
    }
    return Array.from(groupsMap.entries()).map(([roleName, members]) => ({
        roleName,
        members
    }))
})

const maidOfHonorMembers = computed<WeddingPartyMember[]>(() => {
    return effectiveWeddingPartyMembers.value.filter(m => {
        const r = (m.role || '').toLowerCase().trim()
        if (r.includes('bridesmaid')) return false
        return r.includes('maid of honor') || r.includes('matron of honor') || r.includes('maid') || r.includes('matron') || (r.includes('honor') && !r.includes('best'))
    })
})

const bridesmaidsMembers = computed<WeddingPartyMember[]>(() => {
    return effectiveWeddingPartyMembers.value.filter(m => {
        const r = (m.role || '').toLowerCase().trim()
        if (r.includes('maid of honor') || r.includes('matron of honor')) return false
        return r.includes('bridesmaid') || r.includes('bridesmaids') || (r.includes('bride') && !r.includes('maid') && !r.includes('matron'))
    })
})

const bestManMembers = computed<WeddingPartyMember[]>(() => {
    return effectiveWeddingPartyMembers.value.filter(m => {
        const r = (m.role || '').toLowerCase().trim()
        if (r.includes('groomsman') || r.includes('groomsmen')) return false
        return r.includes('best man') || r.includes('bestman')
    })
})

const groomsmenMembers = computed<WeddingPartyMember[]>(() => {
    return effectiveWeddingPartyMembers.value.filter(m => {
        const r = (m.role || '').toLowerCase().trim()
        if (r.includes('best man') || r.includes('bestman')) return false
        return r.includes('groomsman') || r.includes('groomsmen') || r.includes('groom')
    })
})

const otherWeddingPartyMembers = computed<WeddingPartyMember[]>(() => {
    const matchedIds = new Set([
        ...maidOfHonorMembers.value.map(m => m.id),
        ...bridesmaidsMembers.value.map(m => m.id),
        ...bestManMembers.value.map(m => m.id),
        ...groomsmenMembers.value.map(m => m.id),
    ])
    return effectiveWeddingPartyMembers.value.filter(m => !matchedIds.has(m.id))
})

const addCustomWeddingPartyMember = () => {
    customWeddingPartyMembers.value.push({
        id: `custom-wp-${Date.now()}`,
        name: 'New Member',
        role: 'Bridesmaid',
        notes: ''
    })
}

const removeCustomWeddingPartyMember = (id: string) => {
    customWeddingPartyMembers.value = customWeddingPartyMembers.value.filter(m => m.id !== id)
}

function getInitials(name: string): string {
    if (!name) return 'WP'
    const parts = name.trim().split(/\s+/)
    const first = parts[0]
    const last = parts[parts.length - 1]
    if (first && last && parts.length >= 2) {
        return (first[0]! + last[0]!).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
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
                guestList: [
                    {
                        _id: 'mock-g-1',
                        firstName: 'Sofia',
                        lastName: 'Rodriguez',
                        email: 'sofia@example.com',
                        roles: [{ _id: 'r-1', name: 'Maid of Honor' }]
                    },
                    {
                        _id: 'mock-g-2',
                        firstName: 'Lucas',
                        lastName: 'Vance',
                        email: 'lucas@example.com',
                        roles: [{ _id: 'r-2', name: 'Best Man' }]
                    },
                    {
                        _id: 'mock-g-3',
                        firstName: 'Camila',
                        lastName: 'Santos',
                        email: 'camila@example.com',
                        roles: [{ _id: 'r-3', name: 'Bridesmaids' }]
                    },
                    {
                        _id: 'mock-g-4',
                        firstName: 'Elena',
                        lastName: 'Reyes',
                        email: 'elena@example.com',
                        roles: [{ _id: 'r-3', name: 'Bridesmaids' }]
                    },
                    {
                        _id: 'mock-g-5',
                        firstName: 'Mateo',
                        lastName: 'Cruz',
                        email: 'mateo@example.com',
                        roles: [{ _id: 'r-4', name: 'Groomsmen' }]
                    },
                    {
                        _id: 'mock-g-6',
                        firstName: 'Julian',
                        lastName: 'Navarro',
                        email: 'julian@example.com',
                        roles: [{ _id: 'r-4', name: 'Groomsmen' }]
                    }
                ],
                rsvpSummary: null,
                tasks: null,
            }),
            fetch: async () => fetchEvent(eventId.value),
        })
        eventRecord.value = detail.event
        setActiveEvent(detail.event)

        if (detail.guestList && detail.guestList.length > 0) {
            eventGuestsList.value = detail.guestList
        }

        if (eventId.value && !isUiOnlyMode.value) {
            fetchGuestRolesByEvent(eventId.value).then(roles => {
                if (roles && roles.length > 0) {
                    guestRolesList.value = roles
                }
            }).catch(() => { })

            fetchGuestsByEvent(eventId.value).then(guests => {
                if (guests && guests.length > 0) {
                    eventGuestsList.value = guests
                }
            }).catch(() => { })
        }
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
                        customColors,
                        customWeddingPartyMembers,
                        weddingPartyIntro,
                        whereToStayAccommodations,
                    })
                    if (websiteData.colorPalette === 'Custom') {
                        colorTabSelected.value = 'custom'
                        syncCustomColorState(customColors)
                    } else {
                        colorTabSelected.value = 'templates'
                        const found = resolvePalette(websiteData.colorPalette)
                        if (found) {
                            syncCustomColorState(found.colors)
                        }
                    }
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
            weddingPartyMembers: effectiveWeddingPartyMembers.value,
            weddingPartyIntro: weddingPartyIntro.value,
            whereToStayAccommodations: whereToStayAccommodations.value,
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
    <div class="w-full min-h-[calc(100vh-64px)]">
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

                    <UButton color="blue" :loading="isSaving" :disabled="isLoadingSite || isLoadingEvent || isSaving"
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

        <div class="w-full items-start"
            :class="isLive || isPreviewing ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-3'">

            <!-- LEFT SIDE: Step Navigation (UDashboardSidebar with vertical steps rail on leftmost part) -->
            <UDashboardSidebar v-if="!isLive && !isPreviewing" id="website-maker-sidebar" :resizable="false"
                :collapsible="false" :toggle="false"
                class="col-span-1 lg:col-span-1 w-full rounded-none overflow-hidden flex flex-row lg:sticky lg:top-16 h-145 sm:h-160 lg:h-[calc(100vh-64px)] z-20"
                :ui="{
                    root: '!flex !flex-row !w-full h-145 sm:h-160 lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 bg-white dark:bg-toast-900 border-r border-toast-200/80 rounded-none z-20 min-h-0 shadow-none overflow-hidden',
                    header: 'hidden',
                    body: 'p-0 overflow-hidden flex flex-row flex-1 min-h-0 w-full h-full bg-white dark:bg-toast-900',
                    footer: 'hidden'
                }">

                <!-- 1. LEFTMOST PART: Vertical Steps Rail -->
                <div
                    class="w-14 -mr-4 sm:w-16 shrink-0 h-full border-r border-bread-400 bg-white flex flex-col items-center justify-center select-none z-10 font-sans">

                    <!-- Steps Vertical List -->
                    <div
                        class="w-full max-h-full overflow-y-auto p-1 sm:p-1.5 my-auto flex flex-col items-center justify-center gap-1 sm:gap-1.5 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden font-sans">
                        <button v-for="(step, idx) in websiteSteps" :key="step.id" type="button" :title="step.label"
                            class="w-full aspect-square flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-150 cursor-pointer relative group text-center font-sans"
                            :class="currentStep === idx
                                ? 'bg-blue-500 text-white font-semibold shadow-xs hover:bg-blue-600'
                                : 'text-toast-600 hover:text-blue-600 hover:bg-blue-50/70'" @click="currentStep = idx">
                            <div class="relative flex items-center justify-center">
                                <UIcon :name="step.icon"
                                    class="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                                <span v-if="currentStep === idx"
                                    class="absolute -top-1 -right-2 size-3.5 rounded-full bg-white text-blue-600 text-[8px] font-bold flex items-center justify-center shadow-xs">
                                    {{ idx + 1 }}
                                </span>
                            </div>
                            <span
                                class="text-[9px] sm:text-[10px] font-sans leading-tight mt-1 truncate max-w-12 sm:max-w-14">
                                {{ getStepShortName(step) }}
                            </span>
                        </button>
                    </div>
                </div>

                <!-- 2. RIGHT PART OF CONTAINER: Step Header + Editor Controls + Footer -->
                <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-toast-900 m-0 p-0">
                    <!-- Step Header -->
                    <div class="px-6 pt-6 shrink-0 bg-white dark:bg-toast-900"
                        :class="['color-palette', 'typography', 'schedule', 'q-and-a'].includes(currentStepData?.id || '') ? 'pb-2' : 'pb-4 border-b border-toast-200/60'">


                        <h3 class="text-sm sm:text-base font-bold font-serif text-toast-900 text-center px-1">
                            {{ currentStepData?.label }}
                        </h3>


                        <p class="text-center text-xs text-toast-600 line-clamp-2">
                            {{ currentStepData?.description }}
                        </p>
                    </div>

                    <!-- Step 3: Color Palette Tabs (Static above scroll area) -->
                    <div v-if="currentStepData?.id === 'color-palette'"
                        class="px-4 pt-1 pb-2 shrink-0 border-b border-toast-200/60 bg-white dark:bg-toast-900">
                        <UTabs v-model="colorTabSelected" :items="colorTabs" value-key="slot" size="sm" color="blue"
                            class="w-full" :content="false" />
                    </div>

                    <!-- Step 4: Typography Tabs (Static above scroll area) -->
                    <div v-if="currentStepData?.id === 'typography'"
                        class="px-4 pt-1 pb-2 shrink-0 border-b border-toast-200/60 bg-white dark:bg-toast-900">
                        <UTabs v-model="typographyTabSelected" :items="typographyTabs" value-key="slot" size="sm"
                            color="blue" class="w-full" :content="false" />
                    </div>

                    <!-- Dynamic Step: Schedule (Events): Add Event button (Static above scroll area) -->
                    <div v-if="currentStepData?.id === 'schedule'"
                        class="px-4 pt-1 pb-2 shrink-0 border-b border-toast-200/60 bg-white dark:bg-toast-900">
                        <UButton icon="i-lucide-plus" color="blue" variant="solid" block
                            class="text-white cursor-pointer justify-center" @click="addScheduleItem()">
                            Add Event
                        </UButton>
                    </div>

                    <!-- Dynamic Step: Q&A: Add Question button (Static above scroll area) -->
                    <div v-if="currentStepData?.id === 'q-and-a'"
                        class="px-4 pt-1 pb-2 shrink-0 border-b border-toast-200/60 bg-white dark:bg-toast-900">
                        <UButton icon="i-lucide-plus" color="blue" variant="solid" block
                            class="text-white cursor-pointer justify-center" @click="addTidbit()">
                            Add Question
                        </UButton>
                    </div>

                    <!-- Body (Scrollable step controls) -->
                    <UScrollArea class="w-full flex-1 min-h-0 m-0 p-0"
                        :ui="{ root: 'w-full flex-1 min-h-0 m-0 p-0', viewport: 'w-full h-full m-0 p-0' }">
                        <div class="w-full p-4 sm:p-6">



                            <!-- MIDDLE SECTION: Step Content (Editor Mode) -->



                            <!-- Step 1: Choose a Format -->
                            <div v-if="currentStepData?.id === 'choose-format'" class="space-y-4">
                                <div class="space-y-4">
                                    <div class=" relative rounded-lg cursor-pointer group transition-all duration-300 border p-4 flex flex-col items-center gap-3 bg-white"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg border-transparent': websiteData.format === 'format1', 'border-toast-200 hover:border-blue-300': websiteData.format !== 'format1' }"
                                        @click="websiteData.format = 'format1'">
                                        <div
                                            class="w-full h-35 bg-toast-50 flex flex-col gap-1 p-1 border border-toast-200 rounded shadow-sm">
                                            <div class="w-full h-8 bg-toast-200 rounded"></div>
                                            <div class="w-full flex-1 bg-toast-100 rounded"></div>
                                        </div>
                                        <span class="font-medium text-sm">Classic Stack</span>
                                        <div v-if="websiteData.format === 'format1'"
                                            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <UIcon name="i-lucide-check" class="h-4 w-4" @click.stop />
                                        </div>
                                    </div>
                                    <div class=" relative rounded-lg cursor-pointer group transition-all duration-300 border p-4 flex flex-col items-center gap-3 bg-white"
                                        :class="{ 'ring-2 ring-blue-500 shadow-lg border-transparent': websiteData.format === 'format2', 'border-toast-200 hover:border-blue-300': websiteData.format !== 'format2' }"
                                        @click="websiteData.format = 'format2'">
                                        <div
                                            class="w-full  h-35 bg-toast-50 flex gap-1 p-1 border border-toast-200 rounded shadow-sm">
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

                                <!-- Single Page Site Switch -->
                                <div
                                    class="flex items-center justify-between p-3.5 bg-toast-50/70 border border-toast-200/80 rounded-xl">
                                    <div class="text-left pr-2">
                                        <h4 class="font-medium text-sm text-toast-900">Single Page Site</h4>
                                        <p class="text-xs text-toast-500">Display all content on one scrolling page. If
                                            off, header links will show sections individually.</p>
                                    </div>
                                    <USwitch v-model="websiteData.singlePageSite" color="blue" />
                                </div>
                            </div>

                            <!-- Step 2 (Removed): Choose a Motif -->
                            <div v-if="currentStepData?.id === 'choose-motif'" class="">
                            </div>

                            <!-- Step 2: Choose a Color Palette -->
                            <!-- Step 3: Choose a Color Palette & Custom Colors -->
                            <div v-if="currentStepData?.id === 'color-palette'" class="w-full">
                                <!-- Tab 1: Templates -->
                                <div v-if="colorTabSelected === 'templates'" class="space-y-3 pb-4">
                                    <div class="flex items-center justify-between text-xs pb-1 gap-2">
                                        <span class="text-toast-500 text-xs">Choose a curated designer palette</span>
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            <span class="text-xs font-medium text-toast-700">Invert Colors</span>
                                            <USwitch v-model="websiteData.invertColors" color="blue" size="xs" />
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div v-for="palette in colorPalettes" :key="palette.name"
                                            class="relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 border p-1 bg-white shadow-sm hover:shadow"
                                            :class="{
                                                'ring-2 ring-blue-500 shadow-md border-blue-500': websiteData.colorPalette === palette.name,
                                                'border-toast-200 hover:border-blue-300': websiteData.colorPalette !== palette.name
                                            }" @click="selectPaletteTemplate(palette.name)">
                                            <div
                                                class="h-16 rounded-lg overflow-hidden flex border border-black/5 shadow-inner">
                                                <div class="w-full h-full transition-transform duration-300 group-hover:scale-105"
                                                    :style="{ backgroundColor: palette.colors.primary }"
                                                    title="Primary Background" />
                                                <div class="w-full h-full transition-transform duration-300 group-hover:scale-105"
                                                    :style="{ backgroundColor: palette.colors.secondary }"
                                                    title="Secondary Accent" />
                                                <div class="w-full h-full transition-transform duration-300 group-hover:scale-105"
                                                    :style="{ backgroundColor: palette.colors.text_color }"
                                                    title="Text Font" />
                                            </div>

                                            <div v-if="websiteData.colorPalette === palette.name"
                                                class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow">
                                                <UIcon name="i-lucide-check" class="h-3.5 w-3.5" />
                                            </div>

                                            <div class="pt-2 pb-1 px-1 flex items-center justify-between">
                                                <span class="font-semibold text-toast-900 text-xs truncate">{{
                                                    palette.name }}</span>
                                                <div class="flex items-center gap-1">
                                                    <span class="w-2.5 h-2.5 rounded-full border border-black/10"
                                                        :style="{ backgroundColor: palette.colors.primary }" />
                                                    <span class="w-2.5 h-2.5 rounded-full border border-black/10"
                                                        :style="{ backgroundColor: palette.colors.secondary }" />
                                                    <span class="w-2.5 h-2.5 rounded-full border border-black/10"
                                                        :style="{ backgroundColor: palette.colors.text_color }" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tab 2: Custom Colors -->
                                <div v-if="colorTabSelected === 'custom'" class="space-y-4 pb-6">
                                    <!-- 1. Primary Color -->
                                    <div class="p-3.5 bg-white rounded-xl border border-toast-200 shadow-sm space-y-3">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span
                                                    class="flex h-5 w-5 items-center justify-center rounded-full bg-toast-900 text-white text-[11px] font-bold">1</span>
                                                <div>
                                                    <h4 class="text-xs font-bold text-toast-900">Primary
                                                        Color
                                                    </h4>
                                                    <p class="text-[10px] text-toast-500">Page Background
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <label class="relative cursor-pointer">
                                                    <span
                                                        class="block w-7 h-7 rounded-lg border border-black/15 shadow-sm"
                                                        :style="{ backgroundColor: customColors.primary }" />
                                                    <input type="color" :value="customColors.primary"
                                                        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        @input="(e) => onHexChange('primary', (e.target as HTMLInputElement).value)" />
                                                </label>
                                                <input type="text" :value="customColors.primary" maxlength="7"
                                                    class="w-20 px-2 py-1 text-xs font-mono uppercase bg-toast-50 border border-toast-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    @change="(e) => onHexChange('primary', (e.target as HTMLInputElement).value)" />
                                            </div>
                                        </div>

                                        <!-- Color Range: Hue Spectrum Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Hue Spectrum Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.primary.h }}°</span>
                                            </div>
                                            <input type="range" min="0" max="360" :value="customColorState.primary.h"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);"
                                                @input="(e) => onHueChange('primary', Number((e.target as HTMLInputElement).value))" />
                                        </div>

                                        <!-- Color Range: Saturation Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Saturation Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.primary.s }}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" :value="customColorState.primary.s"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                :style="{ background: `linear-gradient(to right, hsl(${customColorState.primary.h}, 0%, 50%), hsl(${customColorState.primary.h}, 100%, 50%))` }"
                                                @input="(e) => onSaturationChange('primary', Number((e.target as HTMLInputElement).value))" />
                                        </div>

                                        <!-- Color Range: Tone / Lightness Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Tone / Brightness Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.primary.l }}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" :value="customColorState.primary.l"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                :style="{ background: `linear-gradient(to right, #000000 0%, hsl(${customColorState.primary.h}, ${customColorState.primary.s}%, 50%) 50%, #ffffff 100%)` }"
                                                @input="(e) => onLightnessChange('primary', Number((e.target as HTMLInputElement).value))" />
                                        </div>
                                    </div>

                                    <!-- 2. Secondary Color -->
                                    <div class="p-3.5 bg-white rounded-xl border border-toast-200 shadow-sm space-y-3">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span
                                                    class="flex h-5 w-5 items-center justify-center rounded-full bg-toast-900 text-white text-[11px] font-bold">2</span>
                                                <div>
                                                    <h4 class="text-xs font-bold text-toast-900">Secondary
                                                        Color
                                                    </h4>
                                                    <p class="text-[10px] text-toast-500">Accent &
                                                        Alternating
                                                        Sections</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <label class="relative cursor-pointer">
                                                    <span
                                                        class="block w-7 h-7 rounded-lg border border-black/15 shadow-sm"
                                                        :style="{ backgroundColor: customColors.secondary }" />
                                                    <input type="color" :value="customColors.secondary"
                                                        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        @input="(e) => onHexChange('secondary', (e.target as HTMLInputElement).value)" />
                                                </label>
                                                <input type="text" :value="customColors.secondary" maxlength="7"
                                                    class="w-20 px-2 py-1 text-xs font-mono uppercase bg-toast-50 border border-toast-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    @change="(e) => onHexChange('secondary', (e.target as HTMLInputElement).value)" />
                                            </div>
                                        </div>

                                        <!-- Color Range: Hue Spectrum Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Hue Spectrum Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.secondary.h }}°</span>
                                            </div>
                                            <input type="range" min="0" max="360" :value="customColorState.secondary.h"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);"
                                                @input="(e) => onHueChange('secondary', Number((e.target as HTMLInputElement).value))" />
                                        </div>

                                        <!-- Color Range: Saturation Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Saturation Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.secondary.s }}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" :value="customColorState.secondary.s"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                :style="{ background: `linear-gradient(to right, hsl(${customColorState.secondary.h}, 0%, 50%), hsl(${customColorState.secondary.h}, 100%, 50%))` }"
                                                @input="(e) => onSaturationChange('secondary', Number((e.target as HTMLInputElement).value))" />
                                        </div>

                                        <!-- Color Range: Tone / Lightness Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Tone / Brightness Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.secondary.l }}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" :value="customColorState.secondary.l"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                :style="{ background: `linear-gradient(to right, #000000 0%, hsl(${customColorState.secondary.h}, ${customColorState.secondary.s}%, 50%) 50%, #ffffff 100%)` }"
                                                @input="(e) => onLightnessChange('secondary', Number((e.target as HTMLInputElement).value))" />
                                        </div>
                                    </div>

                                    <!-- 3. Text Fonts Color -->
                                    <div class="p-3.5 bg-white rounded-xl border border-toast-200 shadow-sm space-y-3">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span
                                                    class="flex h-5 w-5 items-center justify-center rounded-full bg-toast-900 text-white text-[11px] font-bold">3</span>
                                                <div>
                                                    <h4 class="text-xs font-bold text-toast-900">Text Fonts
                                                    </h4>
                                                    <p class="text-[10px] text-toast-500">Headings & Body
                                                        Typography</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <label class="relative cursor-pointer">
                                                    <span
                                                        class="block w-7 h-7 rounded-lg border border-black/15 shadow-sm"
                                                        :style="{ backgroundColor: customColors.text_color }" />
                                                    <input type="color" :value="customColors.text_color"
                                                        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        @input="(e) => onHexChange('text_color', (e.target as HTMLInputElement).value)" />
                                                </label>
                                                <input type="text" :value="customColors.text_color" maxlength="7"
                                                    class="w-20 px-2 py-1 text-xs font-mono uppercase bg-toast-50 border border-toast-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    @change="(e) => onHexChange('text_color', (e.target as HTMLInputElement).value)" />
                                            </div>
                                        </div>

                                        <!-- Color Range: Hue Spectrum Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Hue Spectrum Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.text_color.h }}°</span>
                                            </div>
                                            <input type="range" min="0" max="360" :value="customColorState.text_color.h"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);"
                                                @input="(e) => onHueChange('text_color', Number((e.target as HTMLInputElement).value))" />
                                        </div>

                                        <!-- Color Range: Saturation Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Saturation Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.text_color.s }}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" :value="customColorState.text_color.s"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                :style="{ background: `linear-gradient(to right, hsl(${customColorState.text_color.h}, 0%, 50%), hsl(${customColorState.text_color.h}, 100%, 50%))` }"
                                                @input="(e) => onSaturationChange('text_color', Number((e.target as HTMLInputElement).value))" />
                                        </div>

                                        <!-- Color Range: Tone / Lightness Slider -->
                                        <div class="space-y-1">
                                            <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                                                <span>Tone / Brightness Range</span>
                                                <span class="font-mono text-[10px]">{{
                                                    customColorState.text_color.l }}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" :value="customColorState.text_color.l"
                                                class="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-toast-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-toast-900 [&::-moz-range-thumb]:shadow"
                                                :style="{ background: `linear-gradient(to right, #000000 0%, hsl(${customColorState.text_color.h}, ${customColorState.text_color.s}%, 50%) 50%, #ffffff 100%)` }"
                                                @input="(e) => onLightnessChange('text_color', Number((e.target as HTMLInputElement).value))" />
                                        </div>
                                    </div>
                                </div>

                            </div>


                            <!-- Step 3: Upload Header Image -->
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

                            <!-- Step 4: Choose Typography (Options inside UScrollArea) -->
                            <div v-if="currentStepData?.id === 'typography'" class="w-full">
                                <!-- Header Font Options -->
                                <div v-if="typographyTabSelected === 'header'" class="space-y-3">

                                    <div class="grid grid-cols-2 gap-2.5">
                                        <button v-for="font in headerFontOptions" :key="font.value" type="button"
                                            class="relative p-3.5 text-left rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer"
                                            :class="{
                                                'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20': websiteData.headerFont === font.value,
                                                'border-toast-200 bg-white hover:border-blue-400 hover:bg-blue-50/10': websiteData.headerFont !== font.value
                                            }" @click="websiteData.headerFont = font.value">
                                            <div class="pr-6 w-full min-w-0 overflow-hidden">
                                                <div v-fit-text="{ max: 22, min: 11 }"
                                                    class="text-toast-900 leading-tight py-0.5 whitespace-nowrap overflow-hidden"
                                                    :style="{ fontFamily: `'${font.value}', cursive, serif` }">
                                                    {{ font.value }}
                                                </div>
                                                <div class="text-[11px] text-toast-500 mt-1 line-clamp-1">
                                                    {{ font.category }}
                                                </div>
                                            </div>
                                            <div v-if="websiteData.headerFont === font.value"
                                                class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                                                <UIcon name="i-lucide-check" class="h-3.5 w-3.5" />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <!-- Subheader Font Options -->
                                <div v-if="typographyTabSelected === 'subheader'" class="space-y-3">

                                    <div class="grid grid-cols-2 gap-2.5">
                                        <button v-for="font in subheaderFontOptions" :key="font.value" type="button"
                                            class="relative p-3.5 text-left rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer"
                                            :class="{
                                                'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20': websiteData.subheaderFont === font.value,
                                                'border-toast-200 bg-white hover:border-blue-400 hover:bg-blue-50/10': websiteData.subheaderFont !== font.value
                                            }" @click="websiteData.subheaderFont = font.value">
                                            <div class="pr-6 w-full min-w-0 overflow-hidden">
                                                <div v-fit-text="{ max: 18, min: 11 }"
                                                    class="font-medium text-toast-900 leading-snug py-0.5 whitespace-nowrap overflow-hidden"
                                                    :style="{ fontFamily: `'${font.value}', serif, sans-serif` }">
                                                    {{ font.value }}
                                                </div>
                                                <div class="text-[11px] text-toast-500 mt-1 line-clamp-1">
                                                    {{ font.category }}
                                                </div>
                                            </div>
                                            <div v-if="websiteData.subheaderFont === font.value"
                                                class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                                                <UIcon name="i-lucide-check" class="h-3.5 w-3.5" />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <!-- Body Font Options -->
                                <div v-if="typographyTabSelected === 'body'" class="space-y-3">

                                    <div class="grid grid-cols-2 gap-2.5">
                                        <button v-for="font in bodyFontOptions" :key="font.value" type="button"
                                            class="relative p-3.5 text-left rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer"
                                            :class="{
                                                'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20': websiteData.bodyFont === font.value,
                                                'border-toast-200 bg-white hover:border-blue-400 hover:bg-blue-50/10': websiteData.bodyFont !== font.value
                                            }" @click="websiteData.bodyFont = font.value">
                                            <div class="pr-6 w-full min-w-0 overflow-hidden">
                                                <div v-fit-text="{ max: 18, min: 11 }"
                                                    class="text-toast-900 leading-snug py-0.5 whitespace-nowrap overflow-hidden"
                                                    :style="{ fontFamily: `'${font.value}', sans-serif` }">
                                                    {{ font.value }}
                                                </div>
                                                <div class="text-[11px] text-toast-500 mt-1 line-clamp-1">
                                                    {{ font.category }}
                                                </div>
                                            </div>
                                            <div v-if="websiteData.bodyFont === font.value"
                                                class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                                                <UIcon name="i-lucide-check" class="h-3.5 w-3.5" />
                                            </div>
                                        </button>
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
                                    <USwitch v-model="websiteData.isPasswordProtected" color="blue" />
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

                            <!-- Step 6: Content Sections -->
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
                                    <div v-if="tidbits.length === 0" class="text-center text-toast-500 italic py-4">No
                                        questions
                                        added yet.
                                    </div>
                                    <div v-for="tidbit in tidbits" :key="tidbit.id"
                                        class="flex flex-col gap-2 border border-toast-100 dark:border-toast-700/80 p-3 rounded-lg bg-white dark:bg-toast-800">
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
                                    <div v-if="scheduleItems.length === 0"
                                        class="text-center text-toast-500 italic py-4">No
                                        events added yet.</div>
                                    <div v-for="item in scheduleItems" :key="item.id"
                                        class="flex flex-col gap-3 border border-toast-200/80 dark:border-toast-700/80 p-4 rounded-xl bg-white dark:bg-toast-800 shadow-sm">
                                        <div
                                            class="flex justify-between items-center pb-1 border-b border-toast-100 dark:border-toast-700">
                                            <span
                                                class="font-semibold text-sm capitalize text-toast-900 dark:text-toast-100">Event</span>
                                            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="xs"
                                                @click="removeScheduleItem(item.id)" />
                                        </div>
                                        <UFormField label="Title">
                                            <UInput v-model="item.title" placeholder="e.g., Wedding Ceremony"
                                                class="w-full" />
                                        </UFormField>

                                        <!-- Date -->
                                        <UFormField label="Date">
                                            <UInput v-model="item.date" type="date" icon="i-lucide-calendar"
                                                class="w-full" />
                                        </UFormField>

                                        <!-- Whole day event Checkmark -->
                                        <div
                                            class="flex items-center justify-between p-2.5 bg-toast-50/70 dark:bg-toast-900/50 rounded-lg border border-toast-200/60 dark:border-toast-700/60">
                                            <span class="text-xs font-medium text-toast-800 dark:text-toast-200">Whole
                                                day event</span>
                                            <UCheckbox v-model="item.isAllDay" color="blue" />
                                        </div>

                                        <!-- Start & End Time (shown when not whole day event) -->
                                        <div v-if="!item.isAllDay" class="grid grid-cols-2 gap-3">
                                            <UFormField label="Start Time">
                                                <UInput v-model="item.startTime" type="time" icon="i-lucide-clock"
                                                    class="w-full" />
                                            </UFormField>
                                            <UFormField label="End Time">
                                                <UInput v-model="item.endTime" type="time" icon="i-lucide-clock"
                                                    class="w-full" />
                                            </UFormField>
                                        </div>

                                        <UFormField label="Location (Optional)">
                                            <UInput v-model="item.location" placeholder="e.g., Main Garden"
                                                icon="i-lucide-map-pin" class="w-full" />
                                        </UFormField>

                                        <UFormField label="Description">
                                            <UTextarea v-model="item.description" placeholder="Enter event details"
                                                class="w-full" />
                                        </UFormField>
                                    </div>
                                </div>
                            </div>

                            <!-- Dynamic Step: Where to Stay -->
                            <div v-if="currentStepData?.id === 'where-to-stay'" class="flex flex-col gap-6">
                                <div class="space-y-4">
                                    <!-- Venue Searcher with Live Google Maps Geocoding & Coordinates -->
                                    <div class="relative">
                                        <UFormField label="Venue Location"
                                            description="Search an address, venue name, Google Maps link, or coordinates.">
                                            <div class="flex gap-2">
                                                <div class="relative flex-1">
                                                    <UInput :model-value="websiteData.whereToStayLocation"
                                                        @input="onVenueSearchInput"
                                                        @keydown.enter.prevent="triggerVenueSearch"
                                                        @focus="venueSearchResults.length > 0 ? (showVenueDropdown = true) : null"
                                                        placeholder="e.g. Central Park, NY or 40.785, -73.968"
                                                        class="w-full" icon="i-lucide-map-pin" />
                                                    <div v-if="isSearchingVenue"
                                                        class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <UIcon name="i-lucide-loader-2"
                                                            class="w-4 h-4 animate-spin text-toast-400" />
                                                    </div>
                                                </div>
                                                <UButton size="sm" color="neutral" variant="soft"
                                                    :loading="isSearchingVenue" icon="i-lucide-search"
                                                    title="Search Google Maps" @click="triggerVenueSearch">
                                                    Search
                                                </UButton>
                                                <UButton size="sm" color="neutral" variant="subtle"
                                                    :loading="isDetectingLocation" icon="i-lucide-crosshair"
                                                    title="Use current GPS position" @click="detectCurrentLocation" />
                                            </div>
                                        </UFormField>

                                        <!-- Autocomplete Results Dropdown -->
                                        <div v-if="showVenueDropdown && venueSearchResults.length > 0"
                                            class="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white dark:bg-toast-900 border border-toast-200 dark:border-toast-700 shadow-xl overflow-hidden py-1 max-h-64 overflow-y-auto">
                                            <div
                                                class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-toast-400 flex items-center justify-between border-b border-toast-100 dark:border-toast-800">
                                                <span>Matching Places (Exact Coordinates)</span>
                                                <button type="button" @click="showVenueDropdown = false"
                                                    class="hover:text-toast-600">
                                                    <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <button v-for="(place, pIdx) in venueSearchResults" :key="pIdx"
                                                type="button" @click="selectVenueLocation(place)"
                                                class="w-full px-3 py-2 text-left hover:bg-toast-50 dark:hover:bg-toast-800 flex items-start gap-2.5 transition-colors border-b last:border-b-0 border-toast-100 dark:border-toast-800/50 cursor-pointer">
                                                <div
                                                    class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                                                    <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <div
                                                        class="text-xs font-semibold text-toast-900 dark:text-toast-100 truncate">
                                                        {{ place.name }}
                                                    </div>
                                                    <div class="text-[11px] text-toast-500 line-clamp-1 mt-0.5">
                                                        {{ place.displayName }}
                                                    </div>
                                                    <div
                                                        class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                                                        <span
                                                            class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        <span>{{ place.lat.toFixed(5) }}°, {{ place.lng.toFixed(5)
                                                            }}°</span>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Coordinate Status Badge -->
                                    <div v-if="websiteData.whereToStayLatitude && websiteData.whereToStayLongitude"
                                        class="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40 flex items-center justify-between gap-3 text-xs">
                                        <div
                                            class="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 min-w-0">
                                            <div
                                                class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                <UIcon name="i-lucide-check-circle-2" class="w-4 h-4" />
                                            </div>
                                            <div class="min-w-0">
                                                <div
                                                    class="font-semibold text-emerald-950 dark:text-emerald-100 text-xs">
                                                    Precise Coordinates Synced
                                                </div>
                                                <div
                                                    class="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 truncate">
                                                    {{ Number(websiteData.whereToStayLatitude).toFixed(5) }}°, {{
                                                        Number(websiteData.whereToStayLongitude).toFixed(5) }}°
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                            <UButton
                                                :to="getVenueGoogleMapsUrl(websiteData.whereToStayLocation, { lat: websiteData.whereToStayLatitude, lng: websiteData.whereToStayLongitude })"
                                                target="_blank" size="xs" color="success" variant="ghost"
                                                icon="i-lucide-external-link">
                                                View Pin
                                            </UButton>
                                            <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x"
                                                title="Clear Coordinates"
                                                @click="websiteData.whereToStayLatitude = null; websiteData.whereToStayLongitude = null" />
                                        </div>
                                    </div>

                                    <!-- Google Maps & Reviews Exploration Link -->
                                    <div
                                        class="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900/40 flex items-center justify-between gap-3">
                                        <div class="text-xs text-toast-700 dark:text-toast-300">
                                            <span class="font-semibold block text-toast-900 dark:text-toast-100">Find
                                                Live Google Reviews</span>
                                            Search real, top-rated hotels in this area on Google Maps.
                                        </div>
                                        <UButton
                                            :to="getAreaHotelsGoogleReviewsUrl(websiteData.whereToStayLocation, { lat: websiteData.whereToStayLatitude, lng: websiteData.whereToStayLongitude })"
                                            target="_blank" size="xs" color="blue" variant="soft"
                                            icon="i-lucide-external-link">
                                            Open Google
                                        </UButton>
                                    </div>

                                    <!-- 4 Accommodation Slots -->
                                    <div class="space-y-3.5 pt-1">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <h4
                                                    class="text-xs font-bold uppercase tracking-wider text-toast-700 dark:text-toast-300">
                                                    Accommodation Slots (Max 4)
                                                </h4>
                                                <p class="text-[11px] text-toast-500 mt-0.5">
                                                    Click any slot to open top hotels near <span
                                                        class="font-medium text-blue-600 dark:text-blue-400">{{
                                                            websiteData.whereToStayLocation ||
                                                            'your venue' }}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <!-- 4 Slots List -->
                                        <div class="space-y-3">
                                            <div v-for="slotIdx in [0, 1, 2, 3]" :key="slotIdx">
                                                <!-- Has Selected Hotel -->
                                                <div v-if="whereToStayAccommodations[slotIdx] && whereToStayAccommodations[slotIdx].name && whereToStayAccommodations[slotIdx].name.trim()"
                                                    class="p-3.5 rounded-xl border border-blue-200/90 dark:border-blue-900/60 bg-white dark:bg-toast-800 shadow-xs space-y-2.5 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
                                                    <div
                                                        class="flex items-center justify-between pb-2 border-b border-toast-100 dark:border-toast-700">
                                                        <div class="flex items-center gap-2 min-w-0">
                                                            <span
                                                                class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                {{ slotIdx + 1 }}
                                                            </span>
                                                            <span
                                                                class="font-bold text-xs text-toast-900 dark:text-toast-100 truncate">
                                                                Slot {{ slotIdx + 1 }}
                                                            </span>
                                                            <span
                                                                class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                                                                <UIcon name="i-lucide-check-circle" class="w-3 h-3" />
                                                                Selected
                                                            </span>
                                                        </div>
                                                        <div class="flex items-center gap-1">
                                                            <UButton size="xs" color="neutral" variant="ghost"
                                                                icon="i-lucide-trash-2" title="Clear this slot"
                                                                class="cursor-pointer"
                                                                @click="clearSlotAccommodation(slotIdx)" />
                                                        </div>
                                                    </div>

                                                    <!-- Hotel details -->
                                                    <div class="flex items-start gap-3">
                                                        <div
                                                            class="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-toast-200 dark:border-toast-700 bg-toast-100 dark:bg-toast-800 shadow-xs">
                                                            <img :src="getAccommodationImage(whereToStayAccommodations[slotIdx])"
                                                                :alt="whereToStayAccommodations[slotIdx].name"
                                                                class="w-full h-full object-cover" />
                                                        </div>
                                                        <div class="min-w-0 flex-1">
                                                            <div
                                                                class="font-bold text-sm text-toast-900 dark:text-toast-100 truncate leading-snug">
                                                                {{ whereToStayAccommodations[slotIdx].name }}
                                                            </div>
                                                            <div
                                                                class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-toast-600 dark:text-toast-400 mt-1">
                                                                <span v-if="whereToStayAccommodations[slotIdx].rating"
                                                                    class="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                                                    <UIcon name="i-lucide-star"
                                                                        class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                                    {{ whereToStayAccommodations[slotIdx].rating }}
                                                                </span>
                                                                <span v-if="whereToStayAccommodations[slotIdx].distance"
                                                                    class="flex items-center gap-0.5 text-toast-500">
                                                                    <UIcon name="i-lucide-map-pin"
                                                                        class="w-3.5 h-3.5 text-toast-400 shrink-0" />
                                                                    {{ whereToStayAccommodations[slotIdx].distance }}
                                                                </span>
                                                            </div>
                                                            <p v-if="whereToStayAccommodations[slotIdx].description"
                                                                class="text-[11px] text-toast-500 line-clamp-1 mt-1">
                                                                {{ whereToStayAccommodations[slotIdx].description }}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <!-- Slot Action Buttons -->
                                                    <div
                                                        class="flex items-center gap-2 pt-1 border-t border-toast-100 dark:border-toast-700/60">
                                                        <UButton size="xs" color="blue" variant="soft"
                                                            icon="i-lucide-map"
                                                            class="flex-1 justify-center cursor-pointer"
                                                            @click="openAccommodationPicker(slotIdx)">
                                                            Change Hotel
                                                        </UButton>
                                                        <UButton
                                                            :to="getAccommodationGoogleUrl(whereToStayAccommodations[slotIdx], websiteData.whereToStayLocation)"
                                                            target="_blank" size="xs" color="neutral" variant="outline"
                                                            icon="i-lucide-external-link"
                                                            title="View Google Reviews & Map" class="cursor-pointer">
                                                            Reviews
                                                        </UButton>
                                                    </div>
                                                </div>

                                                <!-- Empty Slot Card (Click to open Google Maps popup) -->
                                                <button v-else type="button" @click="openAccommodationPicker(slotIdx)"
                                                    class="w-full p-4 rounded-xl border-2 border-dashed border-toast-300 hover:border-blue-500 dark:border-toast-700 dark:hover:border-blue-400 bg-white/70 hover:bg-blue-50/40 dark:bg-toast-800/40 dark:hover:bg-blue-950/20 text-left transition-all group cursor-pointer space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <div class="flex items-center gap-2">
                                                            <span
                                                                class="w-5 h-5 rounded-full bg-toast-200 dark:bg-toast-700 text-toast-700 dark:text-toast-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-[10px] font-bold transition-colors">
                                                                {{ slotIdx + 1 }}
                                                            </span>
                                                            <span
                                                                class="font-semibold text-xs text-toast-600 dark:text-toast-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                Slot {{ slotIdx + 1 }}: Not Selected
                                                            </span>
                                                        </div>
                                                        <span
                                                            class="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                                            Select on Map
                                                            <UIcon name="i-lucide-chevron-right" class="w-3.5 h-3.5" />
                                                        </span>
                                                    </div>
                                                    <div class="flex items-center gap-3 pt-0.5">
                                                        <div
                                                            class="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                            <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
                                                        </div>
                                                        <div class="min-w-0 flex-1">
                                                            <span
                                                                class="font-semibold text-xs block text-toast-900 dark:text-toast-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                                Choose Hotel from Google Maps
                                                            </span>
                                                            <span class="text-[11px] text-toast-500 truncate block">
                                                                Top hotels & stays near {{
                                                                    websiteData.whereToStayLocation || 'wedding venue' }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
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
                            <div v-if="currentStepData?.id === 'wedding-party'" class="flex flex-col gap-5">
                                <!-- Section Intro -->
                                <UFormField label="Section Introduction"
                                    description="A welcoming message to introduce your entourage.">
                                    <UTextarea v-model="weddingPartyIntro"
                                        placeholder="e.g. Meet the special people standing by our side on our big day."
                                        class="w-full" />
                                </UFormField>

                                <!-- Guest List Link Status Card -->
                                <div
                                    class="p-4 rounded-xl border border-blue-200/80 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900/40 flex flex-col gap-2.5">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <UIcon name="i-lucide-link"
                                                class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <span
                                                class="text-xs font-semibold text-toast-900 dark:text-toast-100">Linked
                                                to Event Guest List</span>
                                        </div>
                                        <span
                                            class="text-[11px] font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                            {{ linkedGuestPartyMembers.length }} entourage tagged
                                        </span>
                                    </div>
                                    <p class="text-xs text-toast-600 dark:text-toast-400 leading-relaxed">
                                        Guests assigned special entourage roles (e.g. Maid of Honor, Best Man,
                                        Bridesmaids, Groomsmen) in your guest
                                        list automatically appear here.
                                    </p>
                                    <div>
                                        <UButton :to="'/event/guests' + (eventId ? '?eventId=' + eventId : '')"
                                            target="_blank" icon="i-lucide-external-link" size="xs" color="blue"
                                            variant="soft">
                                            Manage Roles in Guest Dashboard
                                        </UButton>
                                    </div>
                                </div>

                                <!-- Entourage Groups Summary -->
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <h4
                                            class="text-xs font-bold uppercase tracking-wider text-toast-600 dark:text-toast-400">
                                            Entourage Groups ({{ groupedWeddingParty.length }})
                                        </h4>
                                        <UButton icon="i-lucide-user-plus" size="xs" color="blue" variant="ghost"
                                            @click="addCustomWeddingPartyMember">
                                            Add Custom Member
                                        </UButton>
                                    </div>

                                    <div v-if="groupedWeddingParty.length === 0"
                                        class="text-center py-6 border border-dashed border-toast-200 rounded-xl text-xs text-toast-500">
                                        No entourage members tagged yet. Assign roles in your Guest List or click "Add
                                        Custom Member".
                                    </div>

                                    <div v-for="group in groupedWeddingParty" :key="group.roleName"
                                        class="p-3.5 rounded-xl border border-toast-200/80 dark:border-toast-700/80 bg-white dark:bg-toast-800 space-y-2">
                                        <div
                                            class="flex items-center justify-between pb-1.5 border-b border-toast-100 dark:border-toast-700">
                                            <span
                                                class="font-semibold text-xs text-toast-900 dark:text-toast-100 uppercase tracking-wide">
                                                {{ group.roleName }}
                                            </span>
                                            <span class="text-[10px] text-toast-500 font-medium">
                                                {{ group.members.length }} {{ group.members.length === 1 ? 'member' :
                                                    'members' }}
                                            </span>
                                        </div>
                                        <div class="space-y-1.5">
                                            <div v-for="member in group.members" :key="member.id"
                                                class="flex items-center justify-between py-1 px-2 rounded-lg bg-toast-50/70 dark:bg-toast-900/50 text-xs">
                                                <div class="flex items-center gap-2">
                                                    <span
                                                        class="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                        {{ getInitials(member.name) }}
                                                    </span>
                                                    <span class="font-medium text-toast-900 dark:text-toast-100">{{
                                                        member.name }}</span>
                                                </div>
                                                <span class="text-[10px] text-toast-500">{{ member.role }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Custom / Overridden Party Members (if any) -->
                                <div v-if="customWeddingPartyMembers.length > 0" class="space-y-3 pt-2">
                                    <h4
                                        class="text-xs font-bold uppercase tracking-wider text-toast-600 dark:text-toast-400">
                                        Custom Additions ({{ customWeddingPartyMembers.length }})
                                    </h4>
                                    <div v-for="(customMember, idx) in customWeddingPartyMembers" :key="customMember.id"
                                        class="p-3 rounded-xl border border-toast-200 dark:border-toast-700 bg-white dark:bg-toast-800 space-y-2">
                                        <div class="flex justify-between items-center">
                                            <span class="text-xs font-semibold">Custom Member {{ idx + 1 }}</span>
                                            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="xs"
                                                @click="removeCustomWeddingPartyMember(customMember.id)" />
                                        </div>
                                        <div class="grid grid-cols-2 gap-2">
                                            <UFormField label="Name">
                                                <UInput v-model="customMember.name" placeholder="Full Name" size="xs" />
                                            </UFormField>
                                            <UFormField label="Role / Tag">
                                                <UInput v-model="customMember.role" placeholder="e.g. Bridesmaid"
                                                    size="xs" />
                                            </UFormField>
                                        </div>
                                        <UFormField label="Note (Optional)">
                                            <UInput v-model="customMember.notes" placeholder="e.g. Sister of the Bride"
                                                size="xs" />
                                        </UFormField>
                                    </div>
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
                                    <p><strong>Color Palette:</strong> {{ websiteData.colorPalette || 'N/A' }}</p>
                                    <p><strong>Invert Colors:</strong> {{ websiteData.invertColors ? 'Yes' : 'No' }}</p>
                                    <p><strong>Simplified Colors:</strong> {{ websiteData.simplifiedColors ? 'Yes' :
                                        'No' }}
                                    </p>
                                    <p><strong>Navigation:</strong> {{ websiteData.singlePageSite ? 'Single Page Site' :
                                        'Multi-Section (Tabs)' }}
                                    </p>
                                    <p><strong>Typography:</strong> {{ websiteData.headerFont }} (Header) &bull; {{
                                        websiteData.subheaderFont }}
                                        (Subheader) &bull; {{ websiteData.bodyFont }} (Body) <span
                                            class="text-xs text-toast-400">[{{
                                                websiteData.typography || 'Custom' }}]</span></p>
                                </div>
                                <p v-if="!canPublishWebsite" class="text-sm text-toast-500">
                                    Event payment must be approved before you can publish your website. You can still
                                    save
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

                    <!-- Step 3: Live Palette Harmony Preview (Static below scroll area, on top of simplified colors) -->
                    <div v-if="currentStepData?.id === 'color-palette'"
                        class="px-5 py-3.5 border-t border-toast-200/60 shrink-0 transition-colors"
                        :style="{ backgroundColor: websiteData.invertColors ? selectedPalette.colors.text_color : selectedPalette.colors.primary }">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[10px] font-bold uppercase tracking-wider opacity-75"
                                :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color }">
                                Live Palette Harmony
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border" :style="{
                                borderColor: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color,
                                color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color
                            }">
                                {{ websiteData.colorPalette === 'Custom' ? 'Custom Active' : websiteData.colorPalette }}
                            </span>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <h4 class="font-bold text-sm leading-tight truncate"
                                    :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color }">
                                    {{ websiteData.siteTitle || 'Elena & Matthew' }}
                                </h4>
                                <p class="text-xs opacity-85 mt-0.5 truncate"
                                    :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color }">
                                    Heading & typography preview text
                                </p>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm shrink-0" :style="{
                                backgroundColor: websiteData.invertColors ? selectedPalette.colors.secondary_text_color : selectedPalette.colors.secondary,
                                color: websiteData.invertColors ? selectedPalette.colors.secondary : selectedPalette.colors.secondary_text_color
                            }">
                                Accent Button
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Simplified Colors (Static below scroll area) -->
                    <div v-if="currentStepData?.id === 'color-palette'"
                        class="px-4 py-2.5 bg-white dark:bg-toast-900 border-t border-toast-200/60 flex items-center justify-between shrink-0">
                        <div class="text-left pr-2">
                            <h4 class="font-medium text-xs sm:text-sm text-toast-900 dark:text-toast-100">Simplified
                                Colors</h4>
                            <p class="text-[11px] text-toast-500">Minimal color scheme with only primary & text colors.
                            </p>
                        </div>
                        <USwitch v-model="websiteData.simplifiedColors" color="blue" size="sm" />
                    </div>

                    <!-- Step 4: Live Typography Sample (Static below scroll area) -->
                    <div v-if="currentStepData?.id === 'typography'"
                        class="px-5 py-3 bg-white dark:bg-toast-900 border-t border-toast-200/60 flex flex-col justify-center shrink-0">
                        <div class="flex items-center justify-between pb-1.5">
                            <span class="text-[11px] font-semibold uppercase tracking-wider text-toast-500">Live
                                Typography Sample</span>
                            <span
                                class="text-[10px] text-blue-600 font-medium bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900 truncate max-w-52.5">
                                {{ websiteData.headerFont }} &bull; {{ websiteData.subheaderFont }} &bull; {{
                                    websiteData.bodyFont }}
                            </span>
                        </div>
                        <!-- Two-column Typography Live Sample -->
                        <div class="grid grid-cols-3 gap-4 items-center py-0.5">
                            <!-- Left Column: Sample Header -->
                            <div
                                class="flex flex-col items-center justify-center text-center p-2 border-r border-toast-200/70 dark:border-toast-700/70">
                                <div class="text-2xl sm:text-3xl text-toast-900 dark:text-toast-100 leading-tight wrap-break-word"
                                    :style="{ fontFamily: `'${websiteData.headerFont}', cursive, serif` }">
                                    sample header
                                </div>
                            </div>

                            <!-- Right Column: Sample Subheader & Numerous Lines of Body Text -->
                            <div class="col-span-2 flex flex-col justify-center space-y-1.5 text-left pl-1">
                                <div class="text-md sm:text-lg font-semibold text-toast-800 dark:text-toast-200 leading-snug"
                                    :style="{ fontFamily: `'${websiteData.subheaderFont}', serif, sans-serif` }">
                                    Sample Subheader
                                </div>
                                <p class="text-[11px] sm:text-xs text-toast-600 dark:text-toast-400 max-h-18 overflow-hidden pr-1"
                                    :style="{ fontFamily: `'${websiteData.bodyFont}', sans-serif` }">
                                    We warmly invite you to celebrate our special day with us. Surrounded by family and
                                    lifelong friends, love is in the air.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer: Action Controls -->
                    <div class="w-full p-3 border-t border-bread-400 flex items-center gap-2">
                        <UButton v-if="currentStep > 0" icon="i-lucide-arrow-left" variant="outline" color="neutral"
                            block class="flex-1 cursor-pointer justify-center" @click="currentStep--">
                            Back
                        </UButton>

                        <UButton v-if="currentStep < websiteSteps.length - 1" icon="i-lucide-arrow-right" color="blue"
                            block class="flex-1 text-white font-semibold cursor-pointer justify-center"
                            @click="currentStep++">
                            Next
                        </UButton>
                        <UButton v-else :icon="isLive ? 'i-lucide-pencil' : 'i-lucide-check-circle'" color="blue" block
                            class="flex-1 text-white font-semibold cursor-pointer justify-center" :loading="isSaving"
                            :disabled="isLoadingSite || isLoadingEvent || isSaving || (!isLive && !canPublishWebsite)"
                            @click="handleGoLive">
                            {{ isLive ? 'Edit Website' : 'Publish' }}
                        </UButton>
                    </div>
                </div>
            </UDashboardSidebar>

            <!-- RIGHT SIDE: Live Preview / Final Website (Spans 2 cols on desktop) -->
            <div
                :class="isLive || isPreviewing
                    ? 'col-span-full w-full h-[calc(100vh-70px)] p-0'
                    : 'col-span-1 lg:col-span-2 w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-start min-h-[calc(100vh-70px)] overflow-hidden'">
                <UPageCard
                    :class="isLive || isPreviewing
                        ? 'w-full h-full rounded-none border-0'
                        : 'w-full h-[calc(100vh-130px)] rounded-2xl shadow-lg border border-toast-200/80 ring-1 ring-black/5'"
                    class="flex flex-col gap-6 transition-colors duration-500 overflow-hidden ring-transparent"
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
                                <!-- Desktop Symmetrical Nav -->
                                <div class="hidden md:flex w-full items-center justify-center">
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
                                <!-- Center Title -->
                                <div ref="siteTitleEl"
                                    class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-xl px-4 pointer-events-none select-none text-center"
                                    :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color, fontFamily: `'${selectedTypography.headerFont}'` }">
                                    {{ previewSiteTitle }}
                                </div>
                                <!-- Mobile Nav (< md) -->
                                <div class="flex md:hidden items-center justify-between w-full px-4">
                                    <span class="font-bold text-base truncate mr-2"
                                        :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color, fontFamily: `'${selectedTypography.headerFont}'` }">
                                        {{ previewSiteTitle }}
                                    </span>
                                    <UDropdownMenu :items="headerDropdownItems" :content="{ align: 'end' }">
                                        <UButton icon="i-lucide-menu" variant="ghost" size="sm"
                                            :style="{ color: websiteData.invertColors ? selectedPalette.colors.primary : selectedPalette.colors.text_color }"
                                            aria-label="Open menu" />
                                    </UDropdownMenu>
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

                            <div id="preview-scroll-top" class="flex flex-col min-h-full w-full z-10">
                                <!-- LEFT SIDE (Scrollable in Format 1, or Format 2 Mobile) -->
                                <div v-if="(websiteData.format === 'format1' && (websiteData.singlePageSite || activeComponentId === 'about-us')) || (websiteData.format === 'format2' && (websiteData.singlePageSite || activeComponentId === 'about-us'))"
                                    class="flex flex-col gap-8 text-center pt-24 pb-10 px-6 relative justify-end w-full"
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
                                        id="preview-section-about-us"
                                        class="flex flex-col justify-center mx-10 py-20 text-center scroll-mt-24"
                                        :class="{ 'min-h-[80vh]': isLive || isPreviewing }">
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



                                    <template v-for="(compId, index) in displayComponents" :key="compId">
                                        <!-- Q&A Preview -->
                                        <div v-if="compId === 'q-and-a' && tidbits.length > 0 && (websiteData.singlePageSite || activeComponentId === compId)"
                                            id="preview-section-q-and-a"
                                            class="flex flex-col justify-center gap-10 px-6 text-center py-20 scroll-mt-24"
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
                                            id="preview-section-schedule"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center scroll-mt-24"
                                            :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                Schedule</div>

                                            <div v-for="item in scheduleItems" :key="item.id"
                                                class="flex flex-col gap-3">
                                                <!-- Date & Time badge -->
                                                <div v-if="item.date || item.startTime || item.isAllDay"
                                                    class="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-medium tracking-wide uppercase opacity-85"
                                                    :style="{ color: previewDynamicStyle(index).heading }">
                                                    <span v-if="item.date" class="inline-flex items-center gap-1.5">
                                                        <UIcon name="i-lucide-calendar" class="w-4 h-4" />
                                                        {{ formatScheduleDate(item.date) }}
                                                    </span>
                                                    <span v-if="item.date && (item.startTime || item.isAllDay)"
                                                        class="opacity-40">&bull;</span>
                                                    <span v-if="item.isAllDay"
                                                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-current text-xs">
                                                        <UIcon name="i-lucide-sun" class="w-3.5 h-3.5" />
                                                        Whole Day Event
                                                    </span>
                                                    <span v-else-if="item.startTime"
                                                        class="inline-flex items-center gap-1.5">
                                                        <UIcon name="i-lucide-clock" class="w-4 h-4" />
                                                        {{ formatScheduleTime(item) }}
                                                    </span>
                                                </div>

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
                                                    <UIcon name="i-lucide-map-pin"
                                                        class="mr-1 inline-block align-middle" />
                                                    {{
                                                        item.location
                                                    }}
                                                </div>
                                            </div>
                                        </div>

                                        <!-- RSVP Preview Placeholder -->
                                        <div v-if="compId === 'rsvp' && (websiteData.singlePageSite || activeComponentId === compId)"
                                            id="preview-section-rsvp"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center scroll-mt-24"
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
                                            id="preview-section-where-to-stay"
                                            class="flex flex-col justify-center gap-8 px-6 py-20 text-center scroll-mt-24"
                                            :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="space-y-2">
                                                <div class="font-bold transition-all duration-300"
                                                    :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                                    :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                    Where to Stay
                                                </div>
                                                <p v-if="websiteData.whereToStayLocation"
                                                    class="text-xs sm:text-sm opacity-75 inline-flex items-center gap-1.5 flex-wrap justify-center"
                                                    :style="{ color: previewDynamicStyle(index).text }">
                                                    <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0" />
                                                    <span>{{ websiteData.whereToStayLocation }}</span>
                                                    <a v-if="websiteData.whereToStayLatitude && websiteData.whereToStayLongitude"
                                                        :href="getVenueGoogleMapsUrl(websiteData.whereToStayLocation, { lat: websiteData.whereToStayLatitude, lng: websiteData.whereToStayLongitude })"
                                                        target="_blank" rel="noopener noreferrer"
                                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-current/20 hover:border-current/50 opacity-80 hover:opacity-100 transition-opacity ml-1"
                                                        title="View pin on Google Maps">
                                                        <span>{{ Number(websiteData.whereToStayLatitude).toFixed(4) }}°,
                                                            {{ Number(websiteData.whereToStayLongitude).toFixed(4)
                                                            }}°</span>
                                                        <UIcon name="i-lucide-external-link" class="w-3 h-3" />
                                                    </a>
                                                </p>
                                            </div>

                                            <div v-if="websiteData.whereToStayLocation"
                                                class="relative w-full h-80 max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg border"
                                                :style="{ borderColor: previewDynamicStyle(index).text }">
                                                <iframe width="100%" height="100%" frameborder="0" scrolling="no"
                                                    marginheight="0" marginwidth="0"
                                                    :src="getGoogleMapsUrl(websiteData.whereToStayLocation, { lat: websiteData.whereToStayLatitude, lng: websiteData.whereToStayLongitude })"
                                                    style="filter: grayscale(1) contrast(1);">
                                                </iframe>
                                                <!-- Seamless Map Tint Overlay -->
                                                <div class="absolute inset-0 pointer-events-none opacity-60"
                                                    :style="{ backgroundColor: previewDynamicStyle(index).text, mixBlendMode: 'color' }">
                                                </div>
                                            </div>
                                            <div v-else class="text-sm italic opacity-70"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                [ Enter a location in the editor to view map & nearby stays ]
                                            </div>

                                            <!-- 4 Suggested Accommodations Buttons (Google Reviews) -->
                                            <div class="max-w-4xl mx-auto w-full pt-4 space-y-4">
                                                <div
                                                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left">
                                                    <div>
                                                        <h3 class="text-lg sm:text-xl font-bold"
                                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                            Recommended Accommodations
                                                        </h3>
                                                        <p class="text-xs sm:text-sm opacity-75"
                                                            :style="{ color: previewDynamicStyle(index).text }">
                                                            Highly-rated stays near the area. Click any button to view
                                                            Google Reviews.
                                                        </p>
                                                    </div>
                                                    <a :href="getAreaHotelsGoogleReviewsUrl(websiteData.whereToStayLocation, { lat: websiteData.whereToStayLatitude, lng: websiteData.whereToStayLongitude })"
                                                        target="_blank" rel="noopener noreferrer"
                                                        class="text-xs font-semibold underline underline-offset-4 opacity-80 hover:opacity-100 inline-flex items-center gap-1 shrink-0"
                                                        :style="{ color: previewDynamicStyle(index).heading }">
                                                        Browse All Stays on Google
                                                        <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
                                                    </a>
                                                </div>

                                                <!-- 4 Accommodation UPageCard Grid -->
                                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                    <UPageCard v-for="(hotel, slotIdx) in previewAccommodations"
                                                        :key="hotel.id || slotIdx"
                                                        :to="getAccommodationGoogleUrl(hotel, websiteData.whereToStayLocation)"
                                                        target="_blank" rel="noopener noreferrer"
                                                        class="group overflow-hidden rounded-2xl border border-current/15 hover:border-current/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col backdrop-blur-md"
                                                        :style="{
                                                            backgroundColor: previewDynamicStyle(index).bg,
                                                            color: previewDynamicStyle(index).text
                                                        }" :ui="{ container: 'p-0 flex flex-col h-full ring-0' }">
                                                        <!-- Venue Image Section -->
                                                        <div
                                                            class="relative w-full h-44 sm:h-48 overflow-hidden bg-black/5 dark:bg-white/5">
                                                            <img :src="getAccommodationImage(hotel)"
                                                                :alt="hotel.name || 'Venue Accommodation'"
                                                                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                loading="lazy" />
                                                            <div
                                                                class="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent">
                                                            </div>

                                                            <!-- Star Rating Badge -->
                                                            <div v-if="hotel.rating"
                                                                class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 dark:bg-toast-900/95 text-amber-600 dark:text-amber-400 shadow-md backdrop-blur-xs flex items-center gap-1">
                                                                <UIcon name="i-lucide-star"
                                                                    class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                                <span>{{ hotel.rating }}</span>
                                                            </div>

                                                            <!-- Distance / Location Badge -->
                                                            <div
                                                                class="absolute bottom-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/65 text-white backdrop-blur-xs flex items-center gap-1">
                                                                <UIcon name="i-lucide-map-pin"
                                                                    class="w-3.5 h-3.5 text-white/90" />
                                                                <span>{{ hotel.distance || 'Near venue' }}</span>
                                                            </div>
                                                        </div>

                                                        <!-- Venue Content Body -->
                                                        <div
                                                            class="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 text-left">
                                                            <div>
                                                                <h4 class="font-bold text-base sm:text-lg leading-snug group-hover:underline line-clamp-1"
                                                                    :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                                    {{ hotel.name || `Accommodation Slot ${slotIdx + 1}`
                                                                    }}
                                                                </h4>
                                                                <p v-if="hotel.description"
                                                                    class="text-xs sm:text-sm opacity-80 line-clamp-2 mt-1.5"
                                                                    :style="{ color: previewDynamicStyle(index).text }">
                                                                    {{ hotel.description }}
                                                                </p>
                                                            </div>

                                                            <div class="flex items-center justify-between pt-2.5 border-t border-current/10 text-xs font-semibold"
                                                                :style="{ color: previewDynamicStyle(index).heading }">
                                                                <span
                                                                    class="inline-flex items-center gap-1.5 opacity-85 group-hover:opacity-100">
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

                                        <!-- Travel Preview Placeholder -->
                                        <div v-if="compId === 'travel' && (websiteData.singlePageSite || activeComponentId === compId)"
                                            id="preview-section-travel"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center scroll-mt-24"
                                            :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">
                                            <div class="font-bold transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                Travel</div>
                                            <div class="text-sm italic opacity-70"
                                                :style="{ color: previewDynamicStyle(index).text }">
                                                [ Travel Component Preview goes here ]
                                            </div>
                                        </div>

                                        <!-- Wedding Party Preview -->
                                        <div v-if="compId === 'wedding-party' && (websiteData.singlePageSite || activeComponentId === compId)"
                                            id="preview-section-wedding-party"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center scroll-mt-24"
                                            :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                            :style="{ backgroundColor: previewDynamicStyle(index).bg }">

                                            <!-- Title & Subtitle -->
                                            <div class="space-y-3 max-w-2xl mx-auto">
                                                <h2 class="font-bold transition-all duration-300"
                                                    :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                                    :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                    Wedding Party
                                                </h2>
                                                <p v-if="weddingPartyIntro"
                                                    class="text-sm sm:text-base leading-relaxed opacity-80"
                                                    :style="{ color: previewDynamicStyle(index).text }">
                                                    {{ weddingPartyIntro }}
                                                </p>
                                            </div>

                                            <!-- 2 Columns: Maid of Honor & Bridesmaids on Left, Best Man & Groomsmen on Right -->
                                            <div
                                                class="max-w-2xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-14 pt-2">
                                                <!-- Left Column: Maid of Honor + Bridesmaids -->
                                                <div class="flex flex-col gap-8 text-center">
                                                    <!-- Maid of Honor -->
                                                    <div v-if="maidOfHonorMembers.length > 0" class="space-y-2">
                                                        <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80"
                                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                            Maid of Honor
                                                        </h3>
                                                        <div class="space-y-1.5">
                                                            <p v-for="member in maidOfHonorMembers" :key="member.id"
                                                                class="text-base sm:text-lg font-medium"
                                                                :style="{ color: previewDynamicStyle(index).text, fontFamily: `'${selectedTypography.bodyFont}'` }">
                                                                {{ member.name }}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <!-- Bridesmaids -->
                                                    <div v-if="bridesmaidsMembers.length > 0" class="space-y-2">
                                                        <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80"
                                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                            Bridesmaids
                                                        </h3>
                                                        <div class="space-y-1.5">
                                                            <p v-for="member in bridesmaidsMembers" :key="member.id"
                                                                class="text-base sm:text-lg font-medium"
                                                                :style="{ color: previewDynamicStyle(index).text, fontFamily: `'${selectedTypography.bodyFont}'` }">
                                                                {{ member.name }}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Right Column: Best Man + Groomsmen -->
                                                <div class="flex flex-col gap-8 text-center">
                                                    <!-- Best Man -->
                                                    <div v-if="bestManMembers.length > 0" class="space-y-2">
                                                        <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80"
                                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                            Best Man
                                                        </h3>
                                                        <div class="space-y-1.5">
                                                            <p v-for="member in bestManMembers" :key="member.id"
                                                                class="text-base sm:text-lg font-medium"
                                                                :style="{ color: previewDynamicStyle(index).text, fontFamily: `'${selectedTypography.bodyFont}'` }">
                                                                {{ member.name }}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <!-- Groomsmen -->
                                                    <div v-if="groomsmenMembers.length > 0" class="space-y-2">
                                                        <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80"
                                                            :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                            Groomsmen
                                                        </h3>
                                                        <div class="space-y-1.5">
                                                            <p v-for="member in groomsmenMembers" :key="member.id"
                                                                class="text-base sm:text-lg font-medium"
                                                                :style="{ color: previewDynamicStyle(index).text, fontFamily: `'${selectedTypography.bodyFont}'` }">
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
                                                    <h3 class="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80"
                                                        :style="{ color: previewDynamicStyle(index).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                        Entourage
                                                    </h3>
                                                    <div class="space-y-1.5">
                                                        <p v-for="member in otherWeddingPartyMembers" :key="member.id"
                                                            class="text-base sm:text-lg font-medium"
                                                            :style="{ color: previewDynamicStyle(index).text, fontFamily: `'${selectedTypography.bodyFont}'` }">
                                                            {{ member.name }}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </template>

                                    <!-- DIY Component Preview: Always between the last numbered component and the thank you message -->
                                    <template v-for="(diy, diyIndex) in diyComponents" :key="`diy-${diy.id}`">
                                        <div v-if="websiteData.singlePageSite || activeComponentId === `diy-${diy.id}`"
                                            :id="`preview-section-diy-${diy.id}`"
                                            class="flex flex-col justify-center gap-10 px-6 py-20 text-center scroll-mt-24"
                                            :class="{ 'min-h-[80vh]': isLive || isPreviewing }" :style="{
                                                backgroundColor: previewDynamicStyle(displayComponents.length + diyIndex).bg,
                                            }">
                                            <h2 class="font-bold transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                                :style="{ color: previewDynamicStyle(displayComponents.length + diyIndex).heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                                {{ diy.header }}
                                            </h2>
                                            <div class="prose max-w-none mx-auto text-center transition-all duration-300"
                                                :class="isLive || isPreviewing ? 'text-xl' : 'text-base'"
                                                :style="{ color: previewDynamicStyle(displayComponents.length + diyIndex).text }">
                                                {{ diy.description }}
                                            </div>
                                        </div>
                                    </template>

                                    <!-- Thank You / Ending Preview -->
                                    <div v-if="websiteData.singlePageSite || activeComponentId === 'about-us'"
                                        class="flex flex-col justify-center gap-6 px-6 py-20 text-center"
                                        :class="{ 'min-h-[80vh]': isLive || isPreviewing }"
                                        :style="{ backgroundColor: previewDynamicStyle(displayComponents.length + (selectedComponents.includes('diy') ? diyComponents.length : 0)).bg }">
                                        <h2 class="font-bold transition-all duration-300"
                                            :class="isLive || isPreviewing ? 'text-5xl' : 'text-3xl'"
                                            :style="{ color: previewDynamicStyle(displayComponents.length + (selectedComponents.includes('diy') ? diyComponents.length : 0)).heading, fontFamily: `'${selectedTypography.headerFont}'` }">
                                            {{ websiteData.endingTitle }}
                                        </h2>
                                        <p class="prose max-w-none mx-auto text-center transition-all duration-300"
                                            :class="isLive || isPreviewing ? 'text-2xl' : 'text-lg'"
                                            :style="{ color: previewDynamicStyle(displayComponents.length + (selectedComponents.includes('diy') ? diyComponents.length : 0)).text }">
                                            {{ websiteData.endingMessage }}
                                        </p>
                                    </div>
                                    <div v-if="websiteData.singlePageSite || activeComponentId === 'about-us' || websiteData.format === 'format2'"
                                        class="py-10 flex flex-col items-center justify-center gap-3"
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
            </div>

        </div>
    </div>

    <!-- Google Maps Accommodation Picker Modal -->
    <UModal v-model:open="isAccommodationPickerOpen" :ui="{
        content: 'w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-toast-900 text-toast-950 dark:text-toast-50 border border-toast-200 dark:border-toast-700 shadow-2xl rounded-2xl overflow-hidden'
    }">
        <template #content>
            <div class="flex flex-col h-full max-h-[90vh]">
                <!-- Modal Header -->
                <div
                    class="px-5 py-4 border-b border-toast-200 dark:border-toast-700 bg-linear-to-r from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/40 dark:via-toast-900 dark:to-toast-900 flex items-start justify-between gap-3 shrink-0">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-base sm:text-lg font-bold text-toast-900 dark:text-toast-100">
                                    Select Accommodation for Slot {{ activeAccommodationSlotIndex + 1 }}
                                </h3>
                                <span
                                    class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                                    Google Maps
                                </span>
                            </div>
                            <p class="text-xs text-toast-600 dark:text-toast-400 mt-0.5">
                                Top-rated hotels & accommodations near
                                <span class="font-semibold text-blue-600 dark:text-blue-400">
                                    {{ websiteData.whereToStayLocation || 'Venue Location' }}
                                </span>
                            </p>
                        </div>
                    </div>
                    <button type="button"
                        class="p-1.5 rounded-lg text-toast-400 hover:text-toast-700 dark:hover:text-toast-200 hover:bg-toast-100 dark:hover:bg-toast-800 transition-colors cursor-pointer"
                        aria-label="Close modal" @click="isAccommodationPickerOpen = false">
                        <UIcon name="i-lucide-x" class="w-5 h-5" />
                    </button>
                </div>

                <!-- Modal Body (Scrollable) -->
                <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    <!-- Interactive Google Map View -->
                    <div
                        class="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-toast-200 dark:border-toast-700 shadow-inner shrink-0">
                        <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0"
                            marginwidth="0"
                            :src="getGoogleMapsUrl(websiteData.whereToStayLocation, { lat: websiteData.whereToStayLatitude, lng: websiteData.whereToStayLongitude })">
                        </iframe>
                        <!-- Floating Open in Google Maps Button -->
                        <div class="absolute bottom-2.5 right-2.5">
                            <a :href="getAreaHotelsGoogleReviewsUrl(websiteData.whereToStayLocation, { lat: websiteData.whereToStayLatitude, lng: websiteData.whereToStayLongitude })"
                                target="_blank" rel="noopener noreferrer"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/95 dark:bg-toast-900/95 text-toast-800 dark:text-toast-100 shadow-md border border-toast-200 dark:border-toast-700 hover:bg-blue-50 dark:hover:bg-toast-800 inline-flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer">
                                <UIcon name="i-lucide-external-link"
                                    class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                Open Live Map on Google
                            </a>
                        </div>
                    </div>

                    <!-- Search Input & Quick Filter Pills -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <UInput v-model="accommodationSearchQuery"
                                placeholder="Search hotel name, amenity, or area..." icon="i-lucide-search" size="sm"
                                class="w-full" />
                            <UButton v-if="accommodationSearchQuery" size="xs" color="neutral" variant="ghost"
                                class="cursor-pointer shrink-0" @click="accommodationSearchQuery = ''">
                                Clear
                            </UButton>
                        </div>

                        <!-- Filter pills -->
                        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                            <button type="button" v-for="cat in [
                                { id: 'all', label: 'All Stays' },
                                { id: 'luxury', label: '5-Star / Luxury' },
                                { id: 'resort', label: 'Resorts & Villas' },
                                { id: 'boutique', label: 'Boutique & Inn' },
                                { id: 'nearby', label: 'Closest to Venue' }
                            ]" :key="cat.id" @click="selectedAccommodationCategory = cat.id" :class="[
                                'px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 cursor-pointer',
                                selectedAccommodationCategory === cat.id
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-toast-100 dark:bg-toast-800 text-toast-700 dark:text-toast-300 hover:bg-toast-200 dark:hover:bg-toast-700'
                            ]">
                                {{ cat.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Custom hotel option if user typed a search query -->
                    <div v-if="accommodationSearchQuery.trim()"
                        class="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <span class="text-xs font-semibold text-blue-800 dark:text-blue-300 block">
                                Can't find your hotel?
                            </span>
                            <span class="text-xs text-toast-700 dark:text-toast-300 truncate block">
                                Select "<strong>{{ accommodationSearchQuery }}</strong>" as a custom hotel near {{
                                    websiteData.whereToStayLocation || 'venue' }}
                            </span>
                        </div>
                        <UButton size="xs" color="blue" variant="solid" icon="i-lucide-plus"
                            class="shrink-0 cursor-pointer" @click="selectAccommodationForSlot({
                                name: accommodationSearchQuery.trim(),
                                rating: '4.8 ★',
                                distance: 'Near venue',
                                description: `Custom accommodation in ${websiteData.whereToStayLocation || 'the area'}`
                            })">
                            Use Custom
                        </UButton>
                    </div>

                    <!-- List of Top Accommodations -->
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between text-xs text-toast-500 font-semibold px-0.5">
                            <span>TOP SUGGESTIONS FOR {{ (websiteData.whereToStayLocation || 'AREA').toUpperCase()
                                }}</span>
                            <span>{{ displayAccommodationsList.length }} stays available</span>
                        </div>

                        <div v-if="displayAccommodationsList.length === 0"
                            class="text-center py-6 text-sm text-toast-500 italic">
                            No hotels matching "{{ accommodationSearchQuery }}". You can click "Use Custom" above to add
                            it.
                        </div>

                        <div v-for="(hotel, hIdx) in displayAccommodationsList" :key="hIdx"
                            @click="selectAccommodationForSlot(hotel)"
                            class="p-3.5 rounded-xl border border-toast-200/90 dark:border-toast-700/80 bg-white dark:bg-toast-800/80 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div class="flex items-start gap-3 min-w-0 flex-1">
                                <div
                                    class="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-toast-200 dark:border-toast-700 bg-toast-100 dark:bg-toast-800 shadow-xs group-hover:scale-105 transition-transform">
                                    <img :src="getAccommodationImage(hotel)" :alt="hotel.name"
                                        class="w-full h-full object-cover" />
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <h4
                                            class="font-bold text-sm text-toast-900 dark:text-toast-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {{ hotel.name }}
                                        </h4>
                                        <span v-if="hotel.badge"
                                            class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                            {{ hotel.badge }}
                                        </span>
                                    </div>
                                    <div
                                        class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-toast-600 dark:text-toast-400 mt-1">
                                        <span
                                            class="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                            <UIcon name="i-lucide-star"
                                                class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            {{ hotel.rating }}
                                        </span>
                                        <span v-if="hotel.reviewsCount" class="text-toast-500">
                                            ({{ hotel.reviewsCount }})
                                        </span>
                                        <span class="text-toast-300 dark:text-toast-600">•</span>
                                        <span
                                            class="flex items-center gap-0.5 text-toast-600 dark:text-toast-400 font-medium">
                                            <UIcon name="i-lucide-map-pin"
                                                class="w-3.5 h-3.5 text-toast-400 shrink-0" />
                                            {{ hotel.distance }}
                                        </span>
                                    </div>
                                    <p class="text-xs text-toast-500 dark:text-toast-400 mt-1 line-clamp-2">
                                        {{ hotel.description }}
                                    </p>
                                    <div v-if="hotel.tags && hotel.tags.length" class="flex flex-wrap gap-1.5 mt-2">
                                        <span v-for="tag in hotel.tags" :key="tag"
                                            class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-toast-100 dark:bg-toast-700/60 text-toast-600 dark:text-toast-300">
                                            {{ tag }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Action / Select Button -->
                            <div
                                class="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-toast-100 dark:border-toast-700">
                                <UButton size="xs" color="blue" variant="solid" icon="i-lucide-check"
                                    class="cursor-pointer">
                                    Select for Slot {{ activeAccommodationSlotIndex + 1 }}
                                </UButton>
                                <a :href="getAccommodationGoogleUrl(hotel, websiteData.whereToStayLocation)"
                                    target="_blank" rel="noopener noreferrer" @click.stop
                                    class="text-[11px] text-toast-500 hover:text-blue-600 dark:hover:text-blue-400 underline inline-flex items-center gap-1 cursor-pointer">
                                    Google Reviews
                                    <UIcon name="i-lucide-external-link" class="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div
                    class="px-5 py-3 border-t border-toast-200 dark:border-toast-700 bg-toast-50/70 dark:bg-toast-900 flex items-center justify-between gap-3 shrink-0">
                    <span class="text-xs text-toast-500">
                        Targeting Slot {{ activeAccommodationSlotIndex + 1 }}
                    </span>
                    <UButton color="neutral" variant="outline" size="sm" class="cursor-pointer"
                        @click="isAccommodationPickerOpen = false">
                        Cancel
                    </UButton>
                </div>
            </div>
        </template>
    </UModal>
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