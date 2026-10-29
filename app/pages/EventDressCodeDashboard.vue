<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { EventRecord } from '~/types/event'
import type {
  AttireFormality,
  DressCodePaletteColors,
  DressCodeRecord,
  UploadedDressCodeImage,
} from '~/types/dressCode'
import { defaultDressCodeData, useDressCode } from '~/composables/useDressCode'
import { colorPalettes } from '~/utils/websiteTheme'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Colors & Dress Code',
  bgClass: 'bg-rose-50',
  alias: ['/event/dress-code', '/event/colors-dress-code'],
})

useWeddingFonts()

useHead({
  title: 'Colors & Dress Code - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Curate event color palettes, upload attire moodboards, and define guest dress code guidelines.',
    },
  ],
})

const route = useRoute()
const toast = useToast()
const { finishPageTransition } = usePageTransition()
const { fetchEvent } = useEvents()
const { setActiveEvent } = useActiveEvent()
const { fetchDressCode, saveDressCode } = useDressCode()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)
const isLoadingData = ref(false)
const isSaving = ref(false)
const isPreviewing = ref(false)

// Active Step in left sidebar (once an option is selected)
const currentStep = ref(0)
const paletteTab = ref<'templates' | 'custom'>('templates')

// Dress Code reactive model
const dressCode = reactive<DressCodeRecord>({
  event: '',
  mode: 'prompt',
  hasPreMadeColor: null,
  paletteType: 'editor',
  paletteImage: null,
  presetPaletteName: 'Gilded Flora',
  invertColors: false,
  colors: {
    primary: '#FDFBF7',
    secondary: '#D4AF37',
    accent: '#9CA986',
    neutral: '#3A4A29',
  },
  formality: 'Formal / Black Tie Optional',
  guestNotes:
    'We request our guests dress in tones celebrating our color palette. Elegant suits, formal dresses, or modern Filipiniana / Barong are warmly encouraged.',
  menAttire:
    'Dark suit, tuxedo, or formal Barong Tagalog with dress trousers and polished dress shoes.',
  womenAttire:
    'Floor-length evening gown, midi cocktail dress, or chic formal attire complementing the palette.',
  avoidColors:
    'Kindly refrain from wearing solid white, ivory, or bridal blush shades reserved for the bride.',
  images: [],
})

// HSL state for custom colors
const customColorState = reactive({
  primary: { h: 40, s: 60, l: 98, hex: '#FDFBF7' },
  secondary: { h: 45, s: 65, l: 52, hex: '#D4AF37' },
  accent: { h: 80, s: 18, l: 59, hex: '#9CA986' },
  neutral: { h: 90, s: 22, l: 23, hex: '#3A4A29' },
})

const activeColorPickerKey = ref<'primary' | 'secondary' | 'accent' | 'neutral'>('primary')

// Lightbox modal for uploaded images
const selectedPreviewImage = ref<UploadedDressCodeImage | null>(null)
const isImageModalOpen = ref(false)

// Drag and drop state for moodboard photos
const isDraggingOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Drag and drop state for palette image
const isDraggingPaletteImage = ref(false)
const paletteFileInputRef = ref<HTMLInputElement | null>(null)

// Curated wedding palette templates
const weddingPaletteTemplates: Array<{
  name: string
  colors: DressCodePaletteColors
  category: string
}> = [
    {
      name: 'Gilded Flora',
      colors: { primary: '#FDFBF7', secondary: '#D4AF37', accent: '#9CA986', neutral: '#3A4A29' },
      category: 'Botanical Gold',
    },
    {
      name: 'Sirocco Earth',
      colors: { primary: '#FBF6EB', secondary: '#F4C7AB', accent: '#C25934', neutral: '#5C2816' },
      category: 'Terracotta Warmth',
    },
    {
      name: 'Coastal Maritime',
      colors: { primary: '#F0F6FC', secondary: '#BDDDFC', accent: '#3E7BBE', neutral: '#112236' },
      category: 'Serene Blue',
    },
    {
      name: 'Blush & Cabernet',
      colors: { primary: '#FAF2F4', secondary: '#F2D0D9', accent: '#9E3245', neutral: '#3B1015' },
      category: 'Romantic Berry',
    },
    {
      name: 'Eucalyptus & Sage',
      colors: { primary: '#F6F8F5', secondary: '#C8D6C0', accent: '#62805A', neutral: '#233320' },
      category: 'Garden Botanical',
    },
    {
      name: 'Deco Monolith',
      colors: { primary: '#FFFFFF', secondary: '#E6DFD3', accent: '#6E675F', neutral: '#1A1A1A' },
      category: 'Timeless Minimal',
    },
    {
      name: 'Midnight Glamour',
      colors: { primary: '#0D1424', secondary: '#C5A059', accent: '#4F709C', neutral: '#FFFFFF' },
      category: 'Starry Evening',
    },
    {
      name: 'Sunset Terracotta',
      colors: { primary: '#FFF8F4', secondary: '#E9A178', accent: '#A84420', neutral: '#38160B' },
      category: 'Autumn Glow',
    },
  ]

// Formality options
const formalityOptions: AttireFormality[] = [
  'Black Tie',
  'Black Tie Optional',
  'Formal / Black Tie Optional',
  'Cocktail Attire',
  'Semi-Formal / Garden Formal',
  'Beach Formal',
  'Philippine Formal (Barong & Filipiniana)',
  'Casual / Smart Casual',
  'Custom',
]

interface StepItem {
  id: string
  label: string
  shortName: string
  icon: string
  description: string
}

const fallbackStep: StepItem = {
  id: 'palette',
  label: 'Color Palette',
  shortName: 'Palette',
  icon: 'i-lucide-palette',
  description: 'Upload a pre-made palette image, design with the interactive editor, or both.',
}

// Step rail with unified steps
const stepsList = computed<StepItem[]>(() => {
  return [
    {
      id: 'palette',
      label: 'Color Palette',
      shortName: 'Palette',
      icon: 'i-lucide-palette',
      description: 'Upload a pre-made palette image, design with the interactive editor, or both.',
    },
    {
      id: 'guidelines',
      label: 'Attire Guidelines & Moodboard',
      shortName: 'Attire',
      icon: 'i-lucide-shirt',
      description: 'Set formality, attire notes, colors to avoid, and inspiration photos.',
    },
    {
      id: 'lookbook',
      label: 'Lookbook & Share',
      shortName: 'Review',
      icon: 'i-lucide-eye',
      description: 'Review the live showcase and share with guests.',
    },
  ]
})

const currentStepData = computed<StepItem>(() => stepsList.value[currentStep.value] ?? stepsList.value[0] ?? fallbackStep)

// Color conversion helpers
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
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
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  const toHex = (n: number) => {
    const hexVal = Math.round((n + m) * 255).toString(16)
    return hexVal.length === 1 ? '0' + hexVal : hexVal
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function syncAllHslStates() {
  const keys: Array<'primary' | 'secondary' | 'accent' | 'neutral'> = [
    'primary',
    'secondary',
    'accent',
    'neutral',
  ]
  keys.forEach((k) => {
    const hex = dressCode.colors[k]
    const hsl = hexToHsl(hex)
    customColorState[k] = { ...hsl, hex }
  })
}

function onHueChange(key: 'primary' | 'secondary' | 'accent' | 'neutral', hue: number) {
  customColorState[key].h = hue
  const newHex = hslToHex(hue, customColorState[key].s, customColorState[key].l)
  customColorState[key].hex = newHex
  dressCode.colors[key] = newHex
  dressCode.presetPaletteName = 'Custom'
}

function onSaturationChange(key: 'primary' | 'secondary' | 'accent' | 'neutral', saturation: number) {
  customColorState[key].s = saturation
  const newHex = hslToHex(customColorState[key].h, saturation, customColorState[key].l)
  customColorState[key].hex = newHex
  dressCode.colors[key] = newHex
  dressCode.presetPaletteName = 'Custom'
}

function onLightnessChange(key: 'primary' | 'secondary' | 'accent' | 'neutral', lightness: number) {
  customColorState[key].l = lightness
  const newHex = hslToHex(customColorState[key].h, customColorState[key].s, lightness)
  customColorState[key].hex = newHex
  dressCode.colors[key] = newHex
  dressCode.presetPaletteName = 'Custom'
}

function onHexInput(key: 'primary' | 'secondary' | 'accent' | 'neutral', raw: string) {
  const formatted = raw.startsWith('#') ? raw : `#${raw}`
  if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
    dressCode.colors[key] = formatted.toUpperCase()
    const hsl = hexToHsl(formatted)
    customColorState[key] = { ...hsl, hex: formatted.toUpperCase() }
    dressCode.presetPaletteName = 'Custom'
  }
}

function selectPresetTemplate(preset: { name: string; colors: DressCodePaletteColors }) {
  dressCode.presetPaletteName = preset.name
  dressCode.colors = { ...preset.colors }
  syncAllHslStates()
  toast.add({
    title: `Applied "${preset.name}"`,
    description: 'Palette updated successfully.',
    color: 'rose',
  })
}

// Choice handlers for initial question
function chooseHasPreMadeColor() {
  dressCode.hasPreMadeColor = true
  dressCode.paletteType = 'image'
  dressCode.mode = 'palette'
  currentStep.value = 0
  toast.add({
    title: 'Pre-made Palette Image Selected',
    description: 'Upload your pre-made color palette graphic directly.',
    color: 'rose',
  })
}

function chooseNeedsPaletteGenerator() {
  dressCode.hasPreMadeColor = false
  dressCode.paletteType = 'editor'
  dressCode.mode = 'palette'
  currentStep.value = 0
  toast.add({
    title: 'Palette Editor Opened',
    description: 'Explore curated presets or design custom colors with HSL sliders.',
    color: 'rose',
  })
}

function setPaletteType(type: 'image' | 'editor' | 'both') {
  dressCode.paletteType = type
  if (type === 'image') {
    dressCode.hasPreMadeColor = true
  } else if (type === 'editor') {
    dressCode.hasPreMadeColor = false
  } else {
    dressCode.hasPreMadeColor = true
  }
}

function resetToChoicePrompt() {
  dressCode.hasPreMadeColor = null
  dressCode.mode = 'prompt'
  currentStep.value = 0
}

// Dedicated Color Palette Image Upload handling (Option 1)
function triggerPaletteFileInput() {
  paletteFileInputRef.value?.click()
}

function handlePaletteFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processPaletteImageFile(target.files[0])
    target.value = ''
  }
}

function handlePaletteImageDrop(e: DragEvent) {
  isDraggingPaletteImage.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    processPaletteImageFile(e.dataTransfer.files[0])
  }
}

function processPaletteImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Invalid file',
      description: 'Please upload an image file (PNG, JPG, WEBP).',
      color: 'error',
    })
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    dressCode.paletteImage = reader.result as string
    toast.add({
      title: 'Color Palette Image Uploaded',
      description: 'Your pre-made palette graphic has been loaded.',
      color: 'rose',
    })
  }
  reader.readAsDataURL(file)
}

function removePaletteImage() {
  dressCode.paletteImage = null
  toast.add({
    title: 'Palette Image Removed',
    color: 'neutral',
  })
}

// File upload handling (Multiple images)
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    processFiles(Array.from(target.files))
    target.value = ''
  }
}

function handleDrop(e: DragEvent) {
  isDraggingOver.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    processFiles(Array.from(e.dataTransfer.files))
  }
}

function processFiles(files: File[]) {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'))
  if (imageFiles.length === 0) {
    toast.add({
      title: 'Invalid file',
      description: 'Please upload image files (PNG, JPG, WEBP).',
      color: 'error',
    })
    return
  }

  let count = 0
  imageFiles.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        dressCode.images.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          dataUrl,
          tag: dressCode.images.length === 0 ? 'Moodboard' : 'Inspiration',
          uploadedAt: new Date().toISOString(),
        })
        count++
        if (count === imageFiles.length) {
          toast.add({
            title: `Uploaded ${count} image${count > 1 ? 's' : ''}`,
            description: 'Moodboard lookbook updated.',
            color: 'rose',
          })
        }
      }
    }
    reader.readAsDataURL(file)
  })
}

function removeImage(id: string) {
  dressCode.images = dressCode.images.filter((img) => img.id !== id)
  toast.add({
    title: 'Image removed',
    description: 'Item removed from your attire moodboard.',
    color: 'neutral',
  })
}

function openImageLightbox(img: UploadedDressCodeImage) {
  selectedPreviewImage.value = img
  isImageModalOpen.value = true
}

function openImageLightboxUrl(url: string, title = 'Color Palette Image') {
  selectedPreviewImage.value = {
    id: 'palette-image-lightbox',
    name: title,
    size: 0,
    dataUrl: url,
    tag: 'Color Swatches',
    uploadedAt: new Date().toISOString(),
  }
  isImageModalOpen.value = true
}

// Save & Actions
async function handleSave() {
  if (!eventId.value) {
    toast.add({
      title: 'No event selected',
      description: 'Please open this page from your active event.',
      color: 'error',
    })
    return
  }

  isSaving.value = true
  try {
    dressCode.isPublished = true
    dressCode.updatedAt = new Date().toISOString()
    await saveDressCode(eventId.value, { ...dressCode })
    toast.add({
      title: 'Colors & Dress Code Published!',
      description: 'Your palette, attire guidelines, and moodboard are published and synced to Website Maker.',
      color: 'rose',
    })
  } catch (err) {
    toast.add({
      title: 'Publish failed',
      description: 'Could not save dress code. Please try again.',
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

function copyHex(hex: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(hex)
    toast.add({
      title: `Copied ${hex}`,
      description: 'Hex code copied to clipboard.',
      color: 'rose',
    })
  }
}

function copySummaryText() {
  const summary = `
💍 ${eventRecord.value?.eventName || 'Wedding'} - Dress Code & Colors
----------------------------------------
✨ Formality: ${dressCode.formality}
🎨 Color Palette: ${dressCode.presetPaletteName}
- Primary: ${dressCode.colors.primary}
- Secondary: ${dressCode.colors.secondary}
- Accent: ${dressCode.colors.accent}
- Neutral: ${dressCode.colors.neutral}

👔 Gentlemen: ${dressCode.menAttire}
👗 Ladies: ${dressCode.womenAttire}

📌 Important Note: ${dressCode.guestNotes}
🚫 Please Avoid: ${dressCode.avoidColors}
`.trim()

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(summary)
    toast.add({
      title: 'Dress Code Summary Copied!',
      description: 'Text ready to paste into invitations, emails, or chat.',
      color: 'rose',
    })
  }
}

// Initialize on mount
onMounted(async () => {
  finishPageTransition()
  isLoadingData.value = true
  try {
    if (eventId.value) {
      isLoadingEvent.value = true
      try {
        const ev = await fetchEvent(eventId.value)
        if (ev && 'event' in ev) {
          eventRecord.value = ev.event as EventRecord
          setActiveEvent(eventRecord.value)
        }
      } catch (err) {
        console.warn('[EventDressCode] Failed to fetch event record', err)
      } finally {
        isLoadingEvent.value = false
      }

      const loaded = await fetchDressCode(eventId.value)
      if (loaded && (loaded.hasPreMadeColor !== null || loaded.paletteType || loaded.paletteImage)) {
        Object.assign(dressCode, loaded)
        if (!dressCode.paletteType) {
          dressCode.paletteType = dressCode.paletteImage ? 'image' : (dressCode.hasPreMadeColor ? 'image' : 'editor')
        }
        currentStep.value = 0
      } else {
        // Initial state: ask the user first
        dressCode.hasPreMadeColor = null
        dressCode.mode = 'prompt'
        currentStep.value = 0
      }
    }
    syncAllHslStates()
  } finally {
    isLoadingData.value = false
  }
})
</script>

<template>
  <div class="w-full min-h-[calc(100vh-64px)]">
    <!-- Navbar Teleport Actions (Only visible in the Maker Interface) -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div v-if="dressCode.hasPreMadeColor !== null" class="flex items-center gap-2 sm:gap-3">
          <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-arrow-left-right" class="text-xs"
            @click="resetToChoicePrompt">
            Change Option
          </UButton>

          <UButton :icon="isPreviewing ? 'i-lucide-edit' : 'i-lucide-eye'" variant="outline" color="rose" size="sm"
            class="hidden md:inline-flex text-xs" @click="isPreviewing = !isPreviewing">
            {{ isPreviewing ? 'Editor View' : 'Preview Only' }}
          </UButton>

          <UButton icon="i-lucide-check-circle" color="rose" size="sm"
            class="font-semibold text-xs sm:text-sm text-white" :loading="isSaving"
            :disabled="isLoadingData || isSaving" @click="handleSave">
            Publish Changes
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ============================================================ -->
    <!-- 1. INITIAL VIEW: Only 2 options (Pre-made vs Built-in Maker) -->
    <!-- ============================================================ -->
    <div v-if="dressCode.hasPreMadeColor === null"
      class="w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] animate-fade-in">
      <!-- Header Container -->
      <div
        class="white-bread-container w-full p-6 sm:p-8 mb-6 sm:mb-8 text-center border border-toast-200/80 shadow-xs relative overflow-hidden bg-white/95">
        <div class="max-w-xl mx-auto space-y-3 relative z-10">


          <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-toast-900 leading-tight">
            Dress Code & Colors
          </h1>

          <p class="text-xs sm:text-sm text-toast-600 leading-relaxed max-w-lg mx-auto">
            How would you like to set up the color palette and attire guidance for your event?
            Select an option below to begin.
          </p>
        </div>
      </div>

      <!-- 2 Clean Option Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 w-full">
        <!-- Option 1: Pre-made Color Palette Image -->
        <div
          class="relative rounded-2xl border-2 border-toast-200 hover:border-rose-400 bg-white p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          @click="chooseHasPreMadeColor">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div
                class="size-13 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-xs">
                <UIcon name="i-lucide-image" class="size-7" />
              </div>
              <UBadge color="rose" variant="subtle" size="xs">
                Image Upload
              </UBadge>
            </div>

            <div>
              <h2
                class="text-lg sm:text-xl font-bold font-serif text-toast-900 group-hover:text-rose-600 transition-colors">
                Pre-made Color Palette Image
              </h2>
              <p class="text-xs text-toast-600 mt-1.5 leading-relaxed">
                Already have a color palette image, swatch board, or graphic from Canva, Pinterest, or your designer?
                Upload it directly so you don't have to fiddle with color sliders.
              </p>
            </div>

            <ul class="space-y-2 text-xs text-toast-700 pt-2 border-t border-toast-100">
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-rose-500 shrink-0" />
                <span>Upload pre-made color swatch graphic (PNG, JPG)</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-rose-500 shrink-0" />
                <span>Shows cleanly on your website &amp; lookbook</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-rose-500 shrink-0" />
                <span>Can also add custom swatches anytime</span>
              </li>
            </ul>
          </div>

          <div class="pt-6">
            <UButton color="rose" size="md" block
              class="font-semibold text-xs sm:text-sm text-white group-hover:shadow-md transition-all justify-center">
              <span>Upload Palette Image</span>
              <UIcon name="i-lucide-arrow-right" class="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </UButton>
          </div>
        </div>

        <!-- Option 2: Built-in Palette Maker -->
        <div
          class="relative rounded-2xl border-2 border-toast-200 hover:border-blue-400 bg-white p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          @click="chooseNeedsPaletteGenerator">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div
                class="size-13 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xs">
                <UIcon name="i-lucide-palette" class="size-7" />
              </div>
              <UBadge color="blue" variant="subtle" size="xs">
                Interactive Creator
              </UBadge>
            </div>

            <div>
              <h2
                class="text-lg sm:text-xl font-bold font-serif text-toast-900 group-hover:text-blue-600 transition-colors">
                Color Palette Editor
              </h2>
              <p class="text-xs text-toast-600 mt-1.5 leading-relaxed">
                Design your event color palette with our interactive creator.
                Explore curated wedding presets or customize exact tones using HSL sliders.
              </p>
            </div>

            <ul class="space-y-2 text-xs text-toast-700 pt-2 border-t border-toast-100">
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-blue-500 shrink-0" />
                <span>Curated designer templates &amp; presets</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-blue-500 shrink-0" />
                <span>Hue, saturation &amp; tone range sliders</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-blue-500 shrink-0" />
                <span>Interactive hex swatches with copy-to-clipboard</span>
              </li>
            </ul>
          </div>

          <div class="pt-6">
            <UButton color="blue" size="md" block
              class="font-semibold text-xs sm:text-sm text-white group-hover:shadow-md transition-all justify-center">
              <span>Use Palette Editor</span>
              <UIcon name="i-lucide-arrow-right" class="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </UButton>
          </div>
        </div>
      </div>

      <!-- Pick One or Both Banner -->
      <div class="mt-6 w-full p-4 rounded-xl border border-rose-200/80 bg-rose-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-950">
        <div class="flex items-center gap-2.5 text-left">
          <UIcon name="i-lucide-sparkles" class="size-5 text-rose-600 shrink-0" />
          <span>
            <strong>Pick one or both:</strong> You can upload a pre-made graphic, use the interactive editor, or showcase both together on your website!
          </span>
        </div>
        <button type="button"
          class="font-bold text-rose-700 hover:text-rose-900 underline shrink-0 cursor-pointer flex items-center gap-1"
          @click="chooseHasPreMadeColor(); setPaletteType('both')">
          <span>Choose Both (Image &amp; Editor)</span>
          <UIcon name="i-lucide-arrow-right" class="size-3.5" />
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 2. MAKER INTERFACE (Shown only AFTER selecting an option)    -->
    <!-- Layout division similar to WebsiteMaker (1/3 sidebar, 2/3)   -->
    <!-- ============================================================ -->
    <div v-else class="w-full items-start" :class="isPreviewing ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-3'">
      <!-- LEFT SIDE: Step Navigation & Editor Controls -->
      <UDashboardSidebar v-if="!isPreviewing" id="dress-code-sidebar" :resizable="false" :collapsible="false"
        :toggle="false"
        class="col-span-1 lg:col-span-1 w-full rounded-none overflow-hidden flex flex-row lg:sticky lg:top-16 h-145 sm:h-160 lg:h-[calc(100vh-64px)] z-20"
        :ui="{
          root: '!flex !flex-row !w-full h-145 sm:h-160 lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 bg-white border-r border-toast-200/80 rounded-none z-20 min-h-0 shadow-none overflow-hidden',
          header: 'hidden',
          body: 'p-0 overflow-hidden flex flex-row flex-1 min-h-0 w-full h-full bg-white',
          footer: 'hidden',
        }">
        <!-- 1. Leftmost Vertical Step Rail -->
        <div
          class="w-14 -mr-4 sm:w-16 shrink-0 h-full border-r border-bread-400 bg-white flex flex-col items-center justify-start py-4 select-none z-10 font-sans">
          <div
            class="w-full max-h-full overflow-y-auto px-1 flex flex-col items-center justify-start gap-2 scrollbar-none">
            <template v-for="(step, idx) in stepsList" :key="step.id">
              <button type="button" :title="step.label"
                class="w-full aspect-square flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-150 cursor-pointer relative group text-center font-sans shrink-0"
                :class="currentStep === idx
                  ? 'bg-rose-500 text-white font-semibold shadow-xs hover:bg-rose-600'
                  : 'text-toast-600 hover:text-rose-600 hover:bg-rose-50/70'
                  " @click="currentStep = idx">
                <div class="relative flex items-center justify-center">
                  <UIcon :name="step.icon"
                    class="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                  <span v-if="currentStep === idx"
                    class="absolute -top-1 -right-2 size-3.5 rounded-full bg-white text-rose-600 text-[8px] font-bold flex items-center justify-center shadow-xs">
                    {{ idx + 1 }}
                  </span>
                </div>
                <span class="text-[9px] sm:text-[10px] font-sans leading-tight mt-1 truncate max-w-12 sm:max-w-14">
                  {{ step.shortName }}
                </span>
              </button>
            </template>
          </div>
        </div>

        <!-- 2. Right Part of Sidebar: Header + Content + Footer -->
        <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white m-0 p-0">
          <!-- Step Header -->
          <div class="px-5 pt-5 pb-3 shrink-0 bg-white border-b border-toast-200/60">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span
                class="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Step {{ currentStep + 1 }} of {{ stepsList.length }}
              </span>
              <span class="text-[10px] font-medium text-toast-500 capitalize">
                {{ dressCode.hasPreMadeColor ? 'Pre-made Upload' : 'Palette Maker' }}
              </span>
            </div>
            <h3 class="text-base font-bold font-serif text-toast-900 leading-tight">
              {{ currentStepData?.label }}
            </h3>
            <p class="text-xs text-toast-600 mt-0.5 line-clamp-2">
              {{ currentStepData?.description }}
            </p>
          </div>

          <!-- Step Sub-tabs for Color Palette (Image, Editor, or Both) -->
          <div v-if="stepsList[currentStep]?.id === 'palette'"
            class="px-4 py-2.5 bg-white border-b border-toast-200/60 shrink-0 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-toast-800 uppercase tracking-wide text-[10px]">Palette Display Mode</span>
              <span class="text-[10px] text-toast-500 font-medium">Pick one or both</span>
            </div>
            <div class="grid grid-cols-3 p-1 bg-toast-100/70 rounded-lg text-xs font-medium gap-1">
              <button type="button"
                class="py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                :class="dressCode.paletteType === 'image'
                  ? 'bg-white text-rose-600 font-bold shadow-xs'
                  : 'text-toast-600 hover:text-toast-900'"
                @click="setPaletteType('image')">
                <UIcon name="i-lucide-image" class="size-3.5" />
                <span>Upload Image</span>
              </button>
              <button type="button"
                class="py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                :class="dressCode.paletteType === 'editor'
                  ? 'bg-white text-rose-600 font-bold shadow-xs'
                  : 'text-toast-600 hover:text-toast-900'"
                @click="setPaletteType('editor')">
                <UIcon name="i-lucide-palette" class="size-3.5" />
                <span>Palette Editor</span>
              </button>
              <button type="button"
                class="py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                :class="dressCode.paletteType === 'both'
                  ? 'bg-white text-rose-600 font-bold shadow-xs'
                  : 'text-toast-600 hover:text-toast-900'"
                @click="setPaletteType('both')">
                <UIcon name="i-lucide-layers" class="size-3.5" />
                <span>Both (1 &amp; 2)</span>
              </button>
            </div>

            <!-- Sub-tabs for Editor when editor or both is selected -->
            <div v-if="dressCode.paletteType === 'editor' || dressCode.paletteType === 'both'"
              class="grid grid-cols-2 p-1 bg-toast-50 rounded-lg text-xs font-medium pt-1 border-t border-toast-100">
              <button type="button"
                class="py-1 px-2.5 rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                :class="paletteTab === 'templates'
                  ? 'bg-white text-rose-600 font-bold shadow-xs'
                  : 'text-toast-600 hover:text-toast-900'"
                @click="paletteTab = 'templates'">
                <UIcon name="i-lucide-layout-grid" class="size-3" />
                <span>Presets</span>
              </button>
              <button type="button"
                class="py-1 px-2.5 rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                :class="paletteTab === 'custom'
                  ? 'bg-white text-rose-600 font-bold shadow-xs'
                  : 'text-toast-600 hover:text-toast-900'"
                @click="paletteTab = 'custom'">
                <UIcon name="i-lucide-sliders" class="size-3" />
                <span>Custom HSL</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Editor Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-toast-900">
            <!-- ================= STEP: COLOR PALETTE ================= -->
            <div v-if="stepsList[currentStep]?.id === 'palette'" class="space-y-4">
              <!-- OPTION 1: Pre-made Palette Image Section -->
              <div v-if="dressCode.paletteType === 'image' || dressCode.paletteType === 'both'"
                class="space-y-3 p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/40">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-image" class="size-4 text-rose-600" />
                    <span class="text-xs font-bold text-toast-900 uppercase tracking-wide">
                      Pre-made Palette Image
                    </span>
                  </div>
                  <UBadge color="rose" variant="subtle" size="xs">
                    {{ dressCode.paletteType === 'both' ? 'Option 1 of 2' : 'Active Mode' }}
                  </UBadge>
                </div>
                <p class="text-[11px] text-toast-600 leading-relaxed">
                  Upload an image of your color palette or swatches (from Canva, Pinterest, or your designer).
                </p>

                <!-- If no image uploaded yet -->
                <div v-if="!dressCode.paletteImage"
                  class="border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer bg-white"
                  :class="isDraggingPaletteImage
                    ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-300'
                    : 'border-toast-300 hover:border-rose-400 hover:bg-rose-50/20'"
                  @dragover.prevent="isDraggingPaletteImage = true"
                  @dragleave.prevent="isDraggingPaletteImage = false"
                  @drop.prevent="handlePaletteImageDrop"
                  @click="triggerPaletteFileInput">
                  <input ref="paletteFileInputRef" type="file" accept="image/*" class="hidden"
                    @change="handlePaletteFileInputChange" />
                  <div class="flex flex-col items-center justify-center gap-2">
                    <div class="size-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <UIcon name="i-lucide-upload-cloud" class="size-5" />
                    </div>
                    <div>
                      <p class="text-xs font-bold text-toast-900">
                        Drop color palette image here
                      </p>
                      <p class="text-[10px] text-toast-500 mt-0.5">
                        PNG, JPG, or WEBP (Max 5MB)
                      </p>
                    </div>
                    <UButton size="xs" color="rose" variant="subtle" class="mt-1 font-semibold">
                      Browse Image
                    </UButton>
                  </div>
                </div>

                <!-- If image uploaded -->
                <div v-else class="space-y-2">
                  <div class="relative rounded-xl overflow-hidden border border-toast-200 bg-white shadow-xs group">
                    <img :src="dressCode.paletteImage" alt="Palette Preview"
                      class="w-full max-h-48 object-contain bg-toast-50/50 p-1" />
                    <div
                      class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <UButton icon="i-lucide-zoom-in" size="xs" color="neutral" variant="solid"
                        class="text-white bg-black/60 hover:bg-black/80"
                        @click="openImageLightboxUrl(dressCode.paletteImage, 'Color Palette Image')">
                        Enlarge
                      </UButton>
                      <UButton icon="i-lucide-refresh-cw" size="xs" color="neutral" variant="solid"
                        class="text-white bg-black/60 hover:bg-black/80"
                        @click="triggerPaletteFileInput">
                        Replace
                      </UButton>
                      <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="solid"
                        @click="removePaletteImage">
                        Remove
                      </UButton>
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-toast-600 px-1">
                    <span class="flex items-center gap-1 text-emerald-700 font-medium">
                      <UIcon name="i-lucide-check-circle" class="size-3.5" />
                      Palette graphic active
                    </span>
                    <button type="button" @click="triggerPaletteFileInput"
                      class="text-rose-600 hover:underline cursor-pointer font-medium">
                      Change image
                    </button>
                  </div>
                  <input ref="paletteFileInputRef" type="file" accept="image/*" class="hidden"
                    @change="handlePaletteFileInputChange" />
                </div>
              </div>

              <!-- OPTION 2: Palette Editor Section -->
              <div v-if="dressCode.paletteType === 'editor' || dressCode.paletteType === 'both'" class="space-y-3">
                <div v-if="dressCode.paletteType === 'both'" class="flex items-center justify-between pt-2 border-t border-toast-200">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-palette" class="size-4 text-blue-600" />
                    <span class="text-xs font-bold text-toast-900 uppercase tracking-wide">
                      Color Palette Editor
                    </span>
                  </div>
                  <UBadge color="blue" variant="subtle" size="xs">Option 2 of 2</UBadge>
                </div>
              <!-- Tab 1: Designer Templates -->
              <div v-if="paletteTab === 'templates'" class="space-y-3">
                <div class="flex items-center justify-between text-xs text-toast-600">
                  <span>Select a curated wedding palette</span>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-medium">Invert Preview</span>
                    <USwitch v-model="dressCode.invertColors" color="rose" size="xs" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2.5">
                  <div v-for="preset in weddingPaletteTemplates" :key="preset.name"
                    class="p-2.5 rounded-xl border transition-all cursor-pointer group bg-white shadow-xs" :class="dressCode.presetPaletteName === preset.name
                      ? 'border-rose-500 ring-2 ring-rose-300 shadow-sm'
                      : 'border-toast-200 hover:border-rose-300'
                      " @click="selectPresetTemplate(preset)">
                    <!-- 4-Swatch Bar -->
                    <div class="h-10 rounded-lg overflow-hidden flex border border-black/10 shadow-inner">
                      <div class="w-1/4 h-full" :style="{ backgroundColor: preset.colors.primary }" title="Primary" />
                      <div class="w-1/4 h-full" :style="{ backgroundColor: preset.colors.secondary }"
                        title="Secondary" />
                      <div class="w-1/4 h-full" :style="{ backgroundColor: preset.colors.accent }" title="Accent" />
                      <div class="w-1/4 h-full" :style="{ backgroundColor: preset.colors.neutral }" title="Neutral" />
                    </div>

                    <div class="mt-2 flex items-center justify-between">
                      <span class="text-xs font-bold text-toast-900 truncate">
                        {{ preset.name }}
                      </span>
                      <UIcon v-if="dressCode.presetPaletteName === preset.name" name="i-lucide-check-circle"
                        class="size-3.5 text-rose-500 shrink-0" />
                    </div>
                    <span class="text-[10px] text-toast-500 block truncate">
                      {{ preset.category }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Tab 2: Custom Colors HSL Sliders -->
              <div v-if="paletteTab === 'custom'" class="space-y-4">
                <!-- Color selector pills -->
                <div class="grid grid-cols-4 gap-1 p-1 bg-toast-50 rounded-lg text-center text-xs">
                  <button type="button" class="py-1 px-1.5 rounded font-semibold transition-all truncate cursor-pointer"
                    :class="activeColorPickerKey === 'primary'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-toast-600 hover:text-toast-900'
                      " @click="activeColorPickerKey = 'primary'">
                    Primary
                  </button>
                  <button type="button" class="py-1 px-1.5 rounded font-semibold transition-all truncate cursor-pointer"
                    :class="activeColorPickerKey === 'secondary'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-toast-600 hover:text-toast-900'
                      " @click="activeColorPickerKey = 'secondary'">
                    Secondary
                  </button>
                  <button type="button" class="py-1 px-1.5 rounded font-semibold transition-all truncate cursor-pointer"
                    :class="activeColorPickerKey === 'accent'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-toast-600 hover:text-toast-900'
                      " @click="activeColorPickerKey = 'accent'">
                    Accent
                  </button>
                  <button type="button" class="py-1 px-1.5 rounded font-semibold transition-all truncate cursor-pointer"
                    :class="activeColorPickerKey === 'neutral'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-toast-600 hover:text-toast-900'
                      " @click="activeColorPickerKey = 'neutral'">
                    Neutral
                  </button>
                </div>

                <!-- Active Color Card with Sliders -->
                <div class="p-4 bg-white rounded-xl border border-toast-200 shadow-xs space-y-3.5">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-bold text-toast-900 capitalize">
                        {{ activeColorPickerKey }} Color
                      </h4>
                      <p class="text-[10px] text-toast-500">
                        {{
                          activeColorPickerKey === 'primary'
                            ? 'Lookbook Canvas / Backdrop'
                            : activeColorPickerKey === 'secondary'
                              ? 'Suits, Gowns & Main Attire'
                              : activeColorPickerKey === 'accent'
                                ? 'Accessories, Florals & Highlights'
                                : 'Text & Deep Contrasts'
                        }}
                      </p>
                    </div>

                    <div class="flex items-center gap-2">
                      <label class="relative cursor-pointer">
                        <span class="block size-7 rounded-lg border border-black/15 shadow-xs"
                          :style="{ backgroundColor: dressCode.colors[activeColorPickerKey] }" />
                        <input type="color" :value="dressCode.colors[activeColorPickerKey]"
                          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" @input="
                            (e) =>
                              onHexInput(activeColorPickerKey, (e.target as HTMLInputElement).value)
                          " />
                      </label>
                      <input type="text" :value="dressCode.colors[activeColorPickerKey]" maxlength="7"
                        class="w-20 px-2 py-1 text-xs font-mono uppercase bg-toast-50 border border-toast-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                        @change="
                          (e) =>
                            onHexInput(activeColorPickerKey, (e.target as HTMLInputElement).value)
                        " />
                    </div>
                  </div>

                  <!-- Hue Spectrum Slider -->
                  <div class="space-y-1">
                    <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                      <span>Hue Spectrum</span>
                      <span class="font-mono text-[10px]">
                        {{ customColorState[activeColorPickerKey].h }}°
                      </span>
                    </div>
                    <input type="range" min="0" max="360" :value="customColorState[activeColorPickerKey].h"
                      class="custom-color-slider" style="
                        background: linear-gradient(
                          to right,
                          #ff0000 0%,
                          #ffff00 17%,
                          #00ff00 33%,
                          #00ffff 50%,
                          #0000ff 67%,
                          #ff00ff 83%,
                          #ff0000 100%
                        );
                      " @input="
                        (e) =>
                          onHueChange(
                            activeColorPickerKey,
                            Number((e.target as HTMLInputElement).value)
                          )
                      " />
                  </div>

                  <!-- Saturation Slider -->
                  <div class="space-y-1">
                    <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                      <span>Saturation</span>
                      <span class="font-mono text-[10px]">
                        {{ customColorState[activeColorPickerKey].s }}%
                      </span>
                    </div>
                    <input type="range" min="0" max="100" :value="customColorState[activeColorPickerKey].s"
                      class="custom-color-slider" :style="{
                        background: `linear-gradient(to right, hsl(${customColorState[activeColorPickerKey].h}, 0%, 50%), hsl(${customColorState[activeColorPickerKey].h}, 100%, 50%))`,
                      }" @input="
                        (e) =>
                          onSaturationChange(
                            activeColorPickerKey,
                            Number((e.target as HTMLInputElement).value)
                          )
                      " />
                  </div>

                  <!-- Lightness / Tone Slider -->
                  <div class="space-y-1">
                    <div class="flex justify-between text-[11px] text-toast-600 font-medium">
                      <span>Tone / Brightness</span>
                      <span class="font-mono text-[10px]">
                        {{ customColorState[activeColorPickerKey].l }}%
                      </span>
                    </div>
                    <input type="range" min="0" max="100" :value="customColorState[activeColorPickerKey].l"
                      class="custom-color-slider" :style="{
                        background: `linear-gradient(to right, #000000 0%, hsl(${customColorState[activeColorPickerKey].h}, ${customColorState[activeColorPickerKey].s}%, 50%) 50%, #ffffff 100%)`,
                      }" @input="
                        (e) =>
                          onLightnessChange(
                            activeColorPickerKey,
                            Number((e.target as HTMLInputElement).value)
                          )
                      " />
                  </div>
                </div>

                <!-- Live Palette Harmony Preview -->
                <div class="p-3.5 rounded-xl border border-toast-200 bg-white space-y-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-toast-500">
                    Live Palette Harmony
                  </span>
                  <div class="grid grid-cols-4 gap-2">
                    <div v-for="(hex, keyName) in dressCode.colors" :key="keyName"
                      class="p-2 rounded-lg text-center border border-black/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:scale-105 transition-transform"
                      :style="{ backgroundColor: hex }" @click="copyHex(hex)">
                      <span class="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-black/40 text-white">
                        {{ hex }}
                      </span>
                      <span class="text-[9px] font-semibold capitalize px-1 rounded bg-white/70 text-black">
                        {{ keyName }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <!-- ================= STEP: ATTIRE GUIDELINES ================= -->
            <div v-else-if="stepsList[currentStep]?.id === 'guidelines'" class="space-y-4">
              <!-- Formality Selector -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-toast-800">Attire Formality</label>
                <select v-model="dressCode.formality"
                  class="w-full text-xs py-2 px-3 rounded-lg border border-toast-200 bg-white text-toast-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500">
                  <option v-for="f in formalityOptions" :key="f" :value="f">
                    {{ f }}
                  </option>
                </select>
              </div>

              <!-- General Guest Notes -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-toast-800">
                  Guest Attire Notes
                </label>
                <textarea v-model="dressCode.guestNotes" rows="3"
                  class="w-full text-xs p-2.5 rounded-lg border border-toast-200 bg-white text-toast-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. We warmly invite our guests to wear shades from our color palette..." />
              </div>

              <!-- Gentlemen Attire -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-toast-800 flex items-center gap-1.5">
                  <UIcon name="i-lucide-user" class="size-3.5 text-toast-500" />
                  Gentlemen / Men's Attire
                </label>
                <textarea v-model="dressCode.menAttire" rows="2"
                  class="w-full text-xs p-2.5 rounded-lg border border-toast-200 bg-white text-toast-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. Classic suit, tuxedo, or Barong Tagalog with leather dress shoes." />
              </div>

              <!-- Ladies Attire -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-toast-800 flex items-center gap-1.5">
                  <UIcon name="i-lucide-heart" class="size-3.5 text-rose-500" />
                  Ladies / Women's Attire
                </label>
                <textarea v-model="dressCode.womenAttire" rows="2"
                  class="w-full text-xs p-2.5 rounded-lg border border-toast-200 bg-white text-toast-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. Floor-length evening gown, midi cocktail dress, or elegant modern dress." />
              </div>

              <!-- Colors to Avoid -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-red-600 flex items-center gap-1.5">
                  <UIcon name="i-lucide-alert-circle" class="size-3.5 text-red-500" />
                  Colors to Avoid
                </label>
                <textarea v-model="dressCode.avoidColors" rows="2"
                  class="w-full text-xs p-2.5 rounded-lg border border-red-200 bg-red-50/40 text-toast-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="e.g. Please avoid solid white, ivory, champagne, or black." />
              </div>

              <!-- Attire Inspiration & Moodboard Uploads Section -->
              <div class="pt-4 border-t border-toast-200/80 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-image" class="size-4 text-rose-600" />
                    <span class="text-xs font-bold text-toast-900 uppercase tracking-wide">
                      Attire Lookbook &amp; Moodboard Photos
                    </span>
                  </div>
                  <span class="text-[10px] font-semibold text-toast-500">
                    {{ dressCode.images.length }} photo{{ dressCode.images.length === 1 ? '' : 's' }}
                  </span>
                </div>
                <p class="text-[11px] text-toast-600 leading-relaxed">
                  Upload visual inspiration, outfit samples, and moodboard boards for your guests and entourage.
                </p>

                <!-- Drag and drop zone -->
                <div class="border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer" :class="isDraggingOver
                  ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-300'
                  : 'border-toast-300 hover:border-rose-400 bg-toast-50/40 hover:bg-rose-50/30'"
                  @dragover.prevent="isDraggingOver = true" @dragleave.prevent="isDraggingOver = false"
                  @drop.prevent="handleDrop" @click="triggerFileInput">
                  <input ref="fileInputRef" type="file" multiple accept="image/*" class="hidden"
                    @change="handleFileInputChange" />
                  <div class="flex flex-col items-center justify-center gap-1.5">
                    <div class="size-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <UIcon name="i-lucide-upload" class="size-5" />
                    </div>
                    <div>
                      <p class="text-xs font-bold text-toast-900">
                        Drop moodboard or attire photos here
                      </p>
                      <p class="text-[10px] text-toast-500">
                        Supports multiple PNG, JPG, or WEBP images
                      </p>
                    </div>
                    <UButton size="xs" color="rose" variant="subtle" class="mt-0.5 font-semibold">
                      Browse Photos
                    </UButton>
                  </div>
                </div>

                <!-- Uploaded files list -->
                <div v-if="dressCode.images.length > 0" class="space-y-2">
                  <div class="flex items-center justify-between text-xs font-semibold text-toast-700">
                    <span>Uploaded Moodboard ({{ dressCode.images.length }})</span>
                    <span class="text-[10px] text-toast-500">Tap to enlarge</span>
                  </div>

                  <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                    <div v-for="img in dressCode.images" :key="img.id"
                      class="p-2 bg-white rounded-xl border border-toast-200/80 shadow-xs flex items-center gap-2.5 hover:border-rose-300 transition-all group">
                      <div
                        class="size-12 rounded-lg overflow-hidden bg-toast-100 shrink-0 border border-black/10 cursor-pointer relative"
                        @click="openImageLightbox(img)">
                        <img :src="img.dataUrl" :alt="img.name" class="w-full h-full object-cover" />
                        <div
                          class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <UIcon name="i-lucide-zoom-in" class="size-3.5" />
                        </div>
                      </div>

                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-toast-900 truncate" :title="img.name">
                          {{ img.name }}
                        </p>
                        <div class="mt-0.5 flex items-center gap-1">
                          <select v-model="img.tag"
                            class="text-[10px] py-0.5 px-1 rounded border border-toast-200 bg-toast-50 text-toast-700 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500">
                            <option value="Moodboard">Moodboard</option>
                            <option value="Color Swatches">Color Swatches</option>
                            <option value="Bride & Groom">Bride & Groom</option>
                            <option value="Entourage">Entourage</option>
                            <option value="Guests">Guests</option>
                            <option value="Inspiration">Inspiration</option>
                          </select>
                        </div>
                      </div>

                      <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" size="xs" aria-label="Remove image"
                        class="text-toast-400 hover:text-red-500" @click="removeImage(img.id)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ================= STEP: LOOKBOOK & SHARE ================= -->
            <div v-else-if="stepsList[currentStep]?.id === 'lookbook'" class="space-y-4">
              <div class="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-sparkles" class="size-5 text-rose-600" />
                  <h4 class="font-bold text-sm text-toast-900">
                    Your Dress Code is Ready!
                  </h4>
                </div>
                <p class="text-xs text-toast-700 leading-relaxed">
                  Your event palette and attire guidelines are styled and synced with your live lookbook.
                  You can copy the summary text to share directly in RSVP emails or wedding invitations.
                </p>
                <div class="pt-1 flex flex-col sm:flex-row gap-2">
                  <UButton icon="i-lucide-copy" color="rose" size="sm"
                    class="font-semibold text-xs flex-1 justify-center text-white" @click="copySummaryText">
                    Copy Text Summary
                  </UButton>
                  <UButton icon="i-lucide-eye" variant="outline" color="neutral" size="sm"
                    class="text-xs justify-center" @click="isPreviewing = true">
                    Full Screen Lookbook
                  </UButton>
                </div>
              </div>

              <div class="p-3.5 bg-white rounded-xl border border-toast-200 space-y-2 text-xs">
                <span class="font-bold text-toast-900">Summary Snapshot:</span>
                <div class="grid grid-cols-2 gap-2 text-[11px] text-toast-600">
                  <div>
                    <span class="text-toast-400 block">Formality:</span>
                    <span class="font-medium text-toast-900">{{ dressCode.formality }}</span>
                  </div>
                  <div>
                    <span class="text-toast-400 block">Palette:</span>
                    <span class="font-medium text-toast-900">{{ dressCode.presetPaletteName }}</span>
                  </div>
                  <div>
                    <span class="text-toast-400 block">Moodboard Photos:</span>
                    <span class="font-medium text-toast-900">{{ dressCode.images.length }} uploaded</span>
                  </div>
                  <div>
                    <span class="text-toast-400 block">Custom Colors:</span>
                    <span class="font-medium text-toast-900">4 swatches synced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sticky Sidebar Footer: Back / Next Navigation -->
          <div class="w-full p-3 border-t border-bread-400 bg-white flex items-center gap-2 shrink-0">
            <UButton v-if="currentStep > 0" icon="i-lucide-arrow-left" variant="outline" color="neutral"
              class="flex-1 justify-center cursor-pointer text-xs sm:text-sm" @click="currentStep--">
              Back
            </UButton>

            <UButton v-if="currentStep < stepsList.length - 1" icon="i-lucide-arrow-right" color="rose"
              class="flex-1 font-semibold justify-center cursor-pointer text-xs sm:text-sm text-white"
              @click="currentStep++">
              Next
            </UButton>

            <UButton v-else icon="i-lucide-check-circle" color="rose"
              class="flex-1 font-semibold justify-center cursor-pointer text-xs sm:text-sm text-white"
              :loading="isSaving" @click="handleSave">
              Save & Finish
            </UButton>
          </div>
        </div>
      </UDashboardSidebar>

      <!-- RIGHT SIDE: Live Dress Code Lookbook Canvas (Spans 2 cols on desktop) -->
      <div :class="isPreviewing
        ? 'col-span-full w-full p-4 sm:p-6 lg:p-10 flex flex-col justify-start'
        : 'col-span-1 lg:col-span-2 w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-start min-h-[calc(100vh-70px)]'
        ">
        <UPageCard
          class="w-full rounded-2xl shadow-lg border border-toast-200/80 ring-1 ring-black/5 overflow-hidden transition-colors duration-500"
          :ui="{ container: 'p-0 sm:p-0 lg:p-0 flex flex-col' }">
          <!-- Live Lookbook Showcase Canvas -->
          <div class="w-full flex-1 flex flex-col p-6 sm:p-8 lg:p-10 transition-colors duration-500 relative min-h-125"
            :style="{
              backgroundColor: dressCode.invertColors
                ? dressCode.colors.neutral
                : dressCode.colors.primary,
              color: dressCode.invertColors
                ? dressCode.colors.primary
                : dressCode.colors.neutral,
            }">
            <!-- Lookbook Top Bar: Event Title, Formality & Date -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/10">
              <div>
                <span
                  class="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-2xs inline-block mb-1"
                  :style="{
                    borderColor: dressCode.colors.secondary,
                    backgroundColor: `${dressCode.colors.secondary}20`,
                    color: dressCode.invertColors
                      ? dressCode.colors.primary
                      : dressCode.colors.neutral,
                  }">
                  {{ dressCode.formality }}
                </span>
                <h1 class="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight">
                  {{ eventRecord?.eventName || 'Elena & Matthew Wedding' }}
                </h1>
                <p class="text-xs sm:text-sm opacity-80 mt-1 flex items-center gap-2">
                  <UIcon name="i-lucide-calendar" class="size-3.5" />
                  <span>{{ eventRecord?.eventDate || 'Saturday, December 14, 2024' }}</span>
                  <span v-if="eventRecord?.venue" class="inline-flex items-center gap-1">
                    &bull;
                    <UIcon name="i-lucide-map-pin" class="size-3.5" /> {{ eventRecord.venue }}
                  </span>
                </p>
              </div>

              <!-- Action buttons in lookbook -->
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button type="button"
                  class="px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-90 bg-rose-600 text-white"
                  :disabled="isSaving"
                  @click="handleSave">
                  <UIcon name="i-lucide-sparkles" class="size-3.5" />
                  <span>{{ isSaving ? 'Publishing...' : 'Publish to Website' }}</span>
                </button>

                <button type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-90 border border-black/15"
                  :style="{
                    backgroundColor: dressCode.colors.secondary,
                    color: '#ffffff',
                  }" @click="copySummaryText">
                  <UIcon name="i-lucide-share-2" class="size-3.5" />
                  <span>Share Guide</span>
                </button>
              </div>
            </div>

            <!-- Website Maker integration banner -->
            <div class="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div class="flex items-start sm:items-center gap-2 text-rose-950">
                <UIcon name="i-lucide-palette" class="size-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong>Synced with Website Maker:</strong> Insert the <strong>"Color &amp; Dress Code"</strong> component in Website Maker to showcase this palette and attire guidelines to your guests.
                </span>
              </div>
              <NuxtLink :to="'/event/website-maker' + (eventId ? '?eventId=' + eventId : '')"
                class="inline-flex items-center gap-1 font-bold text-rose-700 hover:text-rose-800 underline shrink-0">
                <span>Open Website Maker</span>
                <UIcon name="i-lucide-arrow-right" class="size-3" />
              </NuxtLink>
            </div>

            <!-- SECTION 1: Event Color Palette (Image, Editor, or Both) -->
            <div class="py-6 border-b border-black/10">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-90 flex items-center gap-2">
                  <UIcon name="i-lucide-swatch-book" class="size-4" />
                  <span>Event Color Palette</span>
                </h2>
                <span class="text-xs font-medium opacity-75">
                  {{ (dressCode.paletteType === 'image' && dressCode.paletteImage) ? 'Pre-made Palette Graphic' : dressCode.presetPaletteName }}
                </span>
              </div>

              <!-- Option 1: Pre-made Palette Graphic (Image or Both) -->
              <div v-if="(dressCode.paletteType === 'image' || dressCode.paletteType === 'both') && dressCode.paletteImage"
                class="mb-4">
                <div
                  class="relative rounded-2xl overflow-hidden border border-black/15 shadow-sm bg-white cursor-pointer group flex items-center justify-center p-2"
                  @click="openImageLightboxUrl(dressCode.paletteImage, 'Event Color Palette')">
                  <img :src="dressCode.paletteImage" alt="Event Color Palette Graphic"
                    class="w-full max-h-72 object-contain rounded-xl" />
                  <div
                    class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium backdrop-blur-2xs">
                    <UIcon name="i-lucide-zoom-in" class="size-4" />
                    <span>Click to view full palette graphic</span>
                  </div>
                </div>
              </div>

              <!-- Prompt if image mode selected but no image uploaded yet -->
              <div v-else-if="dressCode.paletteType === 'image' && !dressCode.paletteImage"
                class="p-6 rounded-2xl border-2 border-dashed border-toast-300 bg-toast-50/50 text-center space-y-2 mb-4">
                <UIcon name="i-lucide-image" class="size-8 text-toast-400 mx-auto" />
                <p class="text-xs font-medium text-toast-700">No color palette image uploaded yet.</p>
                <UButton size="xs" color="rose" variant="subtle" @click="currentStep = 0">
                  Upload Palette Graphic
                </UButton>
              </div>

              <!-- Option 2: 4 Interactive Swatches (Editor or Both) -->
              <div v-if="dressCode.paletteType === 'editor' || dressCode.paletteType === 'both'">
                <div v-if="dressCode.paletteType === 'both' && dressCode.paletteImage"
                  class="text-[11px] font-bold uppercase tracking-wider opacity-75 mb-2.5 flex items-center gap-1.5">
                  <UIcon name="i-lucide-palette" class="size-3.5" />
                  <span>Color Swatch Breakdown</span>
                </div>
                <!-- 4 Interactive Swatches -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <!-- Primary -->
                  <div
                    class="p-3 rounded-xl border border-black/10 shadow-xs flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-0.5 cursor-pointer"
                    :style="{ backgroundColor: dressCode.colors.primary }" @click="copyHex(dressCode.colors.primary)">
                    <span
                      class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-white w-max">
                      Primary
                    </span>
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 text-black">
                        {{ dressCode.colors.primary }}
                      </span>
                      <UIcon name="i-lucide-copy" class="size-3 text-black/60" />
                    </div>
                  </div>

                  <!-- Secondary -->
                  <div
                    class="p-3 rounded-xl border border-black/10 shadow-xs flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-0.5 cursor-pointer"
                    :style="{ backgroundColor: dressCode.colors.secondary }" @click="copyHex(dressCode.colors.secondary)">
                    <span
                      class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-white w-max">
                      Secondary
                    </span>
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 text-black">
                        {{ dressCode.colors.secondary }}
                      </span>
                      <UIcon name="i-lucide-copy" class="size-3 text-black/60" />
                    </div>
                  </div>

                  <!-- Accent -->
                  <div
                    class="p-3 rounded-xl border border-black/10 shadow-xs flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-0.5 cursor-pointer"
                    :style="{ backgroundColor: dressCode.colors.accent }" @click="copyHex(dressCode.colors.accent)">
                    <span
                      class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-white w-max">
                      Accent
                    </span>
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 text-black">
                        {{ dressCode.colors.accent }}
                      </span>
                      <UIcon name="i-lucide-copy" class="size-3 text-black/60" />
                    </div>
                  </div>

                  <!-- Neutral -->
                  <div
                    class="p-3 rounded-xl border border-black/10 shadow-xs flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-0.5 cursor-pointer"
                    :style="{ backgroundColor: dressCode.colors.neutral }" @click="copyHex(dressCode.colors.neutral)">
                    <span
                      class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-white w-max">
                      Neutral
                    </span>
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 text-black">
                        {{ dressCode.colors.neutral }}
                      </span>
                      <UIcon name="i-lucide-copy" class="size-3 text-black/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SECTION 2: Attire Moodboard Gallery (Multiple images preview) -->
            <div class="py-6 border-b border-black/10">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-90 flex items-center gap-2">
                  <UIcon name="i-lucide-image" class="size-4" />
                  <span>Attire Inspiration & Moodboard</span>
                </h2>
                <span v-if="dressCode.images.length > 0" class="text-xs opacity-75">
                  {{ dressCode.images.length }} photo{{ dressCode.images.length > 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Has uploaded images -->
              <div v-if="dressCode.images.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                <div v-for="img in dressCode.images" :key="img.id"
                  class="group relative aspect-4/5 rounded-xl overflow-hidden bg-black/5 border border-black/10 shadow-sm cursor-pointer"
                  @click="openImageLightbox(img)">
                  <img :src="img.dataUrl" :alt="img.name"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div
                    class="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                    <span class="text-[10px] font-bold text-white uppercase tracking-wider">
                      {{ img.tag }}
                    </span>
                    <span class="text-[10px] text-white/80 truncate">
                      {{ img.name }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty moodboard state with quick action -->
              <div v-else
                class="p-6 rounded-xl border-2 border-dashed border-black/15 text-center flex flex-col items-center justify-center gap-2">
                <div class="size-10 rounded-full bg-black/5 flex items-center justify-center">
                  <UIcon name="i-lucide-images" class="size-5 opacity-60" />
                </div>
                <p class="text-sm font-semibold opacity-90">
                  No moodboard photos uploaded yet
                </p>
                <p class="text-xs opacity-70 max-w-sm">
                  Upload photos, swatches, or outfit inspiration to enrich your lookbook.
                </p>
                <button type="button" class="mt-1 text-xs font-bold underline cursor-pointer hover:opacity-80"
                  @click="currentStep = 0; dressCode.mode = 'upload'; dressCode.hasPreMadeColor = true">
                  Upload Photos Now
                </button>
              </div>
            </div>

            <!-- SECTION 3: Attire Guidelines Cards -->
            <div class="pt-6 space-y-4">
              <h2 class="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-90 flex items-center gap-2">
                <UIcon name="i-lucide-shirt" class="size-4" />
                <span>Attire Guidelines & Guest Advice</span>
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Gentlemen -->
                <div class="p-4 rounded-xl border border-black/10 shadow-xs flex flex-col justify-between"
                  :style="{ backgroundColor: 'rgba(255, 255, 255, 0.45)' }">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="size-7 rounded-lg bg-black/10 flex items-center justify-center">
                      <UIcon name="i-lucide-user" class="size-4" />
                    </div>
                    <h3 class="text-xs font-bold uppercase tracking-wide">
                      Gentlemen / Men's Attire
                    </h3>
                  </div>
                  <p class="text-xs leading-relaxed opacity-90">
                    {{ dressCode.menAttire || 'Formal suit, tuxedo, or Barong Tagalog with dress shoes.' }}
                  </p>
                </div>

                <!-- Ladies -->
                <div class="p-4 rounded-xl border border-black/10 shadow-xs flex flex-col justify-between"
                  :style="{ backgroundColor: 'rgba(255, 255, 255, 0.45)' }">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="size-7 rounded-lg bg-black/10 flex items-center justify-center">
                      <UIcon name="i-lucide-heart" class="size-4 text-rose-500" />
                    </div>
                    <h3 class="text-xs font-bold uppercase tracking-wide">
                      Ladies / Women's Attire
                    </h3>
                  </div>
                  <p class="text-xs leading-relaxed opacity-90">
                    {{ dressCode.womenAttire || 'Floor-length evening gown, midi cocktail dress, or formal wear.' }}
                  </p>
                </div>
              </div>

              <!-- General Notes -->
              <div class="p-4 rounded-xl border border-black/10 shadow-xs"
                :style="{ backgroundColor: 'rgba(255, 255, 255, 0.45)' }">
                <div class="flex items-start gap-2.5">
                  <UIcon name="i-lucide-info" class="size-4 shrink-0 mt-0.5 opacity-80" />
                  <div class="text-xs leading-relaxed">
                    <p class="font-bold mb-0.5">Guest Notes:</p>
                    <p class="opacity-90">{{ dressCode.guestNotes }}</p>
                  </div>
                </div>
              </div>

              <!-- Colors to Avoid -->
              <div v-if="dressCode.avoidColors"
                class="p-3.5 rounded-xl border border-red-300 bg-red-50/70 text-red-950 flex items-start gap-2.5">
                <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 shrink-0 mt-0.5" />
                <div class="text-xs leading-relaxed">
                  <span class="font-bold text-red-900">Colors to Avoid: </span>
                  <span class="text-red-800">{{ dressCode.avoidColors }}</span>
                </div>
              </div>
            </div>
          </div>
        </UPageCard>
      </div>
    </div>

    <!-- Image Lightbox Modal -->
    <UModal v-model="isImageModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div v-if="selectedPreviewImage" class="p-4 sm:p-6 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-toast-200">
            <div>
              <h3 class="text-sm font-bold text-toast-900 truncate max-w-sm">
                {{ selectedPreviewImage.name }}
              </h3>
              <span class="text-[11px] font-medium text-rose-600">
                {{ selectedPreviewImage.tag }}
              </span>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isImageModalOpen = false" />
          </div>

          <div class="w-full max-h-[70vh] overflow-hidden rounded-xl bg-toast-100 flex items-center justify-center">
            <img :src="selectedPreviewImage.dataUrl" :alt="selectedPreviewImage.name"
              class="max-h-[65vh] w-auto object-contain rounded-lg" />
          </div>

          <div class="flex items-center justify-between pt-1 text-xs text-toast-500">
            <span>Size: {{ (selectedPreviewImage.size / 1024).toFixed(1) }} KB</span>
            <UButton icon="i-lucide-trash-2" color="error" variant="subtle" size="xs"
              @click="removeImage(selectedPreviewImage.id); isImageModalOpen = false">
              Delete Photo
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Color Spectrum Range Sliders matching WebsiteMaker */
.custom-color-slider {
  width: 100%;
  height: 0.625rem;
  border-radius: 0.5rem;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  outline: none;
}

.custom-color-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  background-color: #ffffff;
  border: 2px solid #5d1f00;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.15);
}

.custom-color-slider::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  background-color: #ffffff;
  border: 2px solid #5d1f00;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.15);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
