<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { EventRecord } from '~/types/event'
import type { GalleryLayout, GalleryPhoto, GalleryRecord } from '~/types/gallery'
import {
  defaultGalleryRecord,
  defaultGallerySuggestions,
  sampleGalleryPhotos,
  useEventGallery,
} from '~/composables/useEventGallery'
import { compressImageFiles, failedImagesMessage, fitImagesToBudget } from '~/utils/imageCompression'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Photo Gallery',
  bgClass: 'bg-rose-50',
  alias: ['/event/gallery', '/event/photo-gallery'],
})

useWeddingFonts()

useHead({
  title: 'Photo Gallery - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Curate your event photo gallery with layout suggestions and drag-to-swap ordering.',
    },
  ],
})

const route = useRoute()
const toast = useToast()
const { finishPageTransition } = usePageTransition()
const { fetchEvent } = useEvents()
const { setActiveEvent } = useActiveEvent()
const { fetchGallery, saveGallery, swapPhotos } = useEventGallery()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const activeEvent = ref<EventRecord | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isAddingPhotos = ref(false)
const isPreviewing = ref(false)
const isDraggingFile = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Step navigation: 0 = Layout, 1 = Photos, 2 = Publish
const currentStep = ref(0)
const stepsList = [
  { id: 'layout', shortName: 'Layout', label: 'Layout & Style', icon: 'i-lucide-layout-grid', description: 'Choose from curated gallery layout suggestions and set titles.' },
  { id: 'photos', shortName: 'Photos', label: 'Manage & Swap', icon: 'i-lucide-images', description: 'Upload photos, edit captions, and drag photos to swap order.' },
  { id: 'publish', shortName: 'Showcase', label: 'Review & Publish', icon: 'i-lucide-sparkles', description: 'Review your live gallery lookbook and sync with your website.' },
]
const currentStepData = computed(() => stepsList[currentStep.value])

// Gallery state
const gallery = reactive<GalleryRecord>({
  title: defaultGalleryRecord.title,
  subtitle: defaultGalleryRecord.subtitle,
  layout: defaultGalleryRecord.layout,
  columns: defaultGalleryRecord.columns,
  photos: [...defaultGalleryRecord.photos],
  enableLightbox: true,
})

// Drag-to-swap state
const draggedPhotoIndex = ref<number | null>(null)
const dragOverPhotoIndex = ref<number | null>(null)

// Lightbox state
const selectedLightboxPhoto = ref<GalleryPhoto | null>(null)
const isLightboxOpen = ref(false)

onMounted(async () => {
  try {
    if (eventId.value) {
      const ev = await fetchEvent(eventId.value)
      if (ev) {
        activeEvent.value = ev
        setActiveEvent(ev)
      }
      const loaded = await fetchGallery(eventId.value)
      if (loaded) {
        gallery.title = loaded.title || defaultGalleryRecord.title
        gallery.subtitle = loaded.subtitle !== undefined ? loaded.subtitle : defaultGalleryRecord.subtitle
        gallery.layout = loaded.layout || defaultGalleryRecord.layout
        gallery.columns = loaded.columns || defaultGalleryRecord.columns
        gallery.photos = Array.isArray(loaded.photos) && loaded.photos.length > 0 ? [...loaded.photos] : [...sampleGalleryPhotos]
        gallery.enableLightbox = loaded.enableLightbox !== false
      }
    }
  } catch (err) {
    console.error('Failed to load gallery data:', err)
  } finally {
    isLoading.value = false
    finishPageTransition()
  }
})

// Layout selection
function selectLayout(layoutId: GalleryLayout) {
  gallery.layout = layoutId
  toast.add({
    title: 'Layout Updated',
    description: `Switched gallery layout to ${layoutId}.`,
    color: 'neutral',
  })
}

// Drag & Drop swap logic
function onDragStartPhoto(index: number, e: DragEvent) {
  draggedPhotoIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOverPhoto(index: number, e: DragEvent) {
  e.preventDefault()
  if (draggedPhotoIndex.value !== null && draggedPhotoIndex.value !== index) {
    dragOverPhotoIndex.value = index
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }
}

function onDragLeavePhoto(index: number) {
  if (dragOverPhotoIndex.value === index) {
    dragOverPhotoIndex.value = null
  }
}

function onDropPhoto(targetIndex: number, e: DragEvent) {
  e.preventDefault()
  if (draggedPhotoIndex.value !== null && draggedPhotoIndex.value !== targetIndex) {
    const fromIdx = draggedPhotoIndex.value
    gallery.photos = swapPhotos(gallery.photos, fromIdx, targetIndex)
    toast.add({
      title: 'Photos Swapped',
      description: `Photo #${fromIdx + 1} swapped with Photo #${targetIndex + 1}.`,
      color: 'success',
    })
  }
  draggedPhotoIndex.value = null
  dragOverPhotoIndex.value = null
}

function onDragEndPhoto() {
  draggedPhotoIndex.value = null
  dragOverPhotoIndex.value = null
}

// Manual swap buttons (accessibility / mobile alternative)
function movePhoto(index: number, direction: 'prev' | 'next') {
  const targetIndex = direction === 'prev' ? index - 1 : index + 1
  if (targetIndex >= 0 && targetIndex < gallery.photos.length) {
    gallery.photos = swapPhotos(gallery.photos, index, targetIndex)
  }
}

// File uploading
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    processFiles(Array.from(input.files))
    input.value = ''
  }
}

function handleFileDrop(e: DragEvent) {
  isDraggingFile.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    processFiles(Array.from(e.dataTransfer.files))
  }
}

async function processFiles(files: File[]) {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'))
  if (imageFiles.length === 0) {
    toast.add({ title: 'Invalid File', description: 'Please select valid image files.', color: 'error' })
    return
  }

  isAddingPhotos.value = true
  try {
    const { images, failedNames } = await compressImageFiles(imageFiles)
    for (const { file, dataUrl } of images) {
      gallery.photos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: dataUrl,
        name: file.name.replace(/\.[^/.]+$/, ''),
        caption: '',
        alt: file.name,
      })
    }
    if (images.length > 0) {
      toast.add({
        title: 'Photos Added',
        description: `Added ${images.length} photo${images.length > 1 ? 's' : ''} to gallery.`,
        color: 'success',
      })
    }
    if (failedNames.length > 0) {
      toast.add({ title: 'Some photos were not added', description: failedImagesMessage(failedNames), color: 'warning' })
    }
  } finally {
    isAddingPhotos.value = false
  }
}

function removePhoto(id: string) {
  gallery.photos = gallery.photos.filter((p) => p.id !== id)
}

function resetToSamplePhotos() {
  gallery.photos = [...sampleGalleryPhotos]
  toast.add({
    title: 'Samples Restored',
    description: 'Loaded 6 sample wedding photos.',
    color: 'neutral',
  })
}

function openLightbox(photo: GalleryPhoto) {
  selectedLightboxPhoto.value = photo
  isLightboxOpen.value = true
}

// Save & Website integration
async function handleSave() {
  isSaving.value = true
  try {
    const id = eventId.value || 'mock-event-id'
    const fittedUrls = await fitImagesToBudget(gallery.photos.map((photo) => photo.url))
    gallery.photos = gallery.photos.map((photo, index) => ({ ...photo, url: fittedUrls[index] ?? photo.url }))
    await saveGallery(id, {
      title: gallery.title.trim() || 'Captured Moments',
      subtitle: gallery.subtitle?.trim() || '',
      layout: gallery.layout,
      columns: gallery.columns,
      photos: [...gallery.photos],
      enableLightbox: gallery.enableLightbox,
    })
    toast.add({
      title: 'Gallery Saved',
      description: 'Your gallery layout and photos have been successfully updated.',
      color: 'success',
    })
  } catch (err) {
    console.error('Error saving gallery:', err)
    toast.add({
      title: 'Save Failed',
      description: 'Could not save gallery. Please try again.',
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

function openWebsiteMaker() {
  const q: Record<string, string> = {}
  if (eventId.value) q.eventId = eventId.value
  navigateTo({ path: '/website-maker', query: q })
}
</script>

<template>
  <div class="w-full min-h-[calc(100vh-64px)] flex flex-col font-sans select-text">
    <!-- Navbar Teleport Actions (Moved to the right of the event subnavbar) -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex items-center gap-2 sm:gap-3">
          <UButton
            :icon="isPreviewing ? 'i-lucide-edit' : 'i-lucide-eye'"
            variant="outline"
            color="rose"
            size="sm"
            class="hidden md:inline-flex text-xs cursor-pointer"
            @click="isPreviewing = !isPreviewing">
            {{ isPreviewing ? 'Editor View' : 'Preview Only' }}
          </UButton>

          <UButton
            icon="i-lucide-globe"
            variant="outline"
            color="neutral"
            size="sm"
            class="hidden sm:inline-flex text-xs cursor-pointer"
            @click="openWebsiteMaker">
            Website Maker
          </UButton>

          <UButton
            icon="i-lucide-check-circle"
            color="rose"
            size="sm"
            class="font-semibold text-xs sm:text-sm text-white cursor-pointer"
            :loading="isSaving || isAddingPhotos"
            @click="handleSave">
            Save Gallery
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Main Workspace: Retains the layout style of Website Maker & Dress Code Dashboard -->
    <div
      class="w-full items-start"
      :class="isPreviewing ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]'">
      <!-- LEFT SIDE: Step Navigation & Controls (UDashboardSidebar with locked width) -->
      <UDashboardSidebar
        v-if="!isPreviewing"
        id="gallery-sidebar"
        :resizable="false"
        :collapsible="false"
        :toggle="false"
        class="w-full lg:w-[400px] xl:w-[420px] lg:min-w-[400px] lg:max-w-[400px] xl:min-w-[420px] xl:max-w-[420px] shrink-0 rounded-none overflow-hidden flex flex-row lg:sticky lg:top-16 h-145 sm:h-160 lg:h-[calc(100vh-64px)] z-20"
        :ui="{
          root: '!flex !flex-row !w-full lg:!w-[400px] xl:!w-[420px] shrink-0 h-145 sm:h-160 lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 bg-white border-r border-toast-200/80 rounded-none z-20 min-h-0 shadow-none overflow-hidden',
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
              <button
                type="button"
                :title="step.label"
                class="w-full aspect-square flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-150 cursor-pointer relative group text-center font-sans shrink-0"
                :class="currentStep === idx
                  ? 'bg-rose-500 text-white font-semibold shadow-xs hover:bg-rose-600'
                  : 'text-toast-600 hover:text-rose-600 hover:bg-rose-50/70'"
                @click="currentStep = idx">
                <div class="relative flex items-center justify-center">
                  <UIcon
                    :name="step.icon"
                    class="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                  <span
                    v-if="currentStep === idx"
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
          <div class="px-5 pt-4 pb-3 border-b border-toast-200/80 shrink-0">
            <div class="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-rose-500 mb-1">
              <span>Step {{ currentStep + 1 }} of {{ stepsList.length }}</span>
              <span class="text-toast-400 font-medium lowercase font-sans">{{ gallery.photos.length }} photos</span>
            </div>
            <h2 class="text-sm font-bold text-toast-900">{{ currentStepData?.label }}</h2>
            <p class="text-xs text-toast-500 mt-0.5">{{ currentStepData?.description }}</p>
          </div>

          <!-- Scrollable Step Controls -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          <!-- ================= STEP 0: LAYOUT & STYLE ================= -->
          <div v-if="currentStep === 0" class="space-y-4">
            <!-- Title & Subtitle inputs -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-toast-800 mb-1">Gallery Title</label>
                <UInput v-model="gallery.title" placeholder="e.g. Captured Moments" size="sm" class="w-full" />
              </div>
              <div>
                <label class="block text-xs font-bold text-toast-800 mb-1">Subtitle / Narrative</label>
                <UInput v-model="gallery.subtitle" placeholder="A glimpse into our favorite moments..." size="sm" class="w-full" />
              </div>
            </div>

            <!-- Layout Suggestions Cards -->
            <div class="space-y-2 pt-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-toast-800 uppercase tracking-wide">Layout Suggestions</label>
                <span class="text-[11px] text-rose-600 font-medium">5 curated styles</span>
              </div>

              <div class="space-y-2">
                <div
                  v-for="sugg in defaultGallerySuggestions"
                  :key="sugg.id"
                  class="p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group"
                  :class="gallery.layout === sugg.id
                    ? 'border-rose-400 bg-rose-50/50 shadow-xs ring-1 ring-rose-300'
                    : 'border-toast-200 hover:border-toast-300 hover:bg-toast-50/60'"
                  @click="selectLayout(sugg.id)">
                  <div
                    class="size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    :class="gallery.layout === sugg.id ? 'bg-rose-500 text-white' : 'bg-toast-100 text-toast-700 group-hover:bg-rose-100 group-hover:text-rose-600'">
                    <UIcon :name="sugg.icon" class="size-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-toast-900">{{ sugg.name }}</span>
                      <span v-if="gallery.layout === sugg.id" class="text-[10px] font-bold text-rose-600 bg-white px-1.5 py-0.5 rounded border border-rose-200">
                        Active
                      </span>
                    </div>
                    <span class="text-[11px] text-toast-500 font-medium block">{{ sugg.tagline }}</span>
                    <p class="text-[11px] text-toast-600 mt-1 leading-snug">{{ sugg.description }}</p>

                    <!-- Expandable Column Options (only for layouts with column options: grid & masonry) -->
                    <transition
                      enter-active-class="transition-all duration-200 ease-out"
                      enter-from-class="opacity-0 -translate-y-1"
                      enter-to-class="opacity-100 translate-y-0"
                      leave-active-class="transition-all duration-150 ease-in"
                      leave-from-class="opacity-100 translate-y-0"
                      leave-to-class="opacity-0 -translate-y-1">
                      <div
                        v-if="gallery.layout === sugg.id && (sugg.id === 'grid' || sugg.id === 'masonry')"
                        class="mt-2.5 pt-2.5 border-t border-rose-200/80 space-y-1.5"
                        @click.stop>
                        <div class="flex items-center justify-between">
                          <label class="text-[11px] font-bold text-toast-800">Column Count</label>
                          <span class="text-[10px] font-medium text-rose-600">{{ gallery.columns }} columns per row</span>
                        </div>
                        <div class="grid grid-cols-3 gap-1.5">
                          <button
                            v-for="cols in [2, 3, 4] as const"
                            :key="cols"
                            type="button"
                            class="py-1 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer"
                            :class="gallery.columns === cols
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-white border-rose-200 text-toast-700 hover:bg-rose-50/70'"
                            @click.stop="gallery.columns = cols">
                            {{ cols }} Cols
                          </button>
                        </div>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>
            </div>

            <!-- Lightbox Toggle -->
            <div class="pt-2 flex items-center justify-between p-3 rounded-xl border border-toast-200 bg-toast-50/50">
              <div>
                <span class="text-xs font-bold text-toast-900 block">Full Screen Lightbox</span>
                <span class="text-[11px] text-toast-500">Allow guests to click any photo to expand</span>
              </div>
              <UToggle v-model="gallery.enableLightbox" />
            </div>
          </div>

          <!-- ================= STEP 1: MANAGE PHOTOS & DRAG TO SWAP ================= -->
          <div v-else-if="currentStep === 1" class="space-y-4">
            <!-- Dropzone uploader -->
            <div
              class="border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer bg-toast-50/40"
              :class="isDraggingFile
                ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-300'
                : 'border-toast-300 hover:border-rose-400 hover:bg-rose-50/20'"
              @dragover.prevent="isDraggingFile = true"
              @dragleave.prevent="isDraggingFile = false"
              @drop.prevent="handleFileDrop"
              @click="triggerFileInput">
              <input ref="fileInputRef" type="file" multiple accept="image/*" class="hidden" @change="handleFileInputChange" />
              <div class="flex flex-col items-center justify-center gap-1.5">
                <div class="size-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <UIcon name="i-lucide-upload-cloud" class="size-4" />
                </div>
                <div>
                  <p class="text-xs font-bold text-toast-900">Upload New Photos</p>
                  <p class="text-[10px] text-toast-500">{{ isAddingPhotos ? 'Preparing your photos...' : 'Click or drop multiple image files here' }}</p>
                </div>
              </div>
            </div>

            <!-- Drag to Swap Hint Banner -->
            <div class="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center gap-2 text-xs text-blue-900">
              <UIcon name="i-lucide-move" class="size-4 text-blue-600 shrink-0" />
              <span>
                <strong>Drag to Swap:</strong> Click &amp; drag any photo card over another to swap their positions instantly.
              </span>
            </div>

            <!-- Photos List (Draggable Cards) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-toast-800 uppercase tracking-wide">
                  Photos in Gallery ({{ gallery.photos.length }})
                </span>
                <button
                  type="button"
                  class="text-[11px] text-rose-600 font-semibold hover:underline cursor-pointer"
                  @click="resetToSamplePhotos">
                  Load Samples
                </button>
              </div>

              <div v-if="gallery.photos.length === 0" class="p-8 text-center border rounded-xl border-toast-200 bg-white">
                <UIcon name="i-lucide-image" class="size-8 text-toast-300 mx-auto mb-2" />
                <p class="text-xs font-semibold text-toast-700">No photos added yet</p>
                <p class="text-[11px] text-toast-500 mt-0.5">Upload photos or load sample memories</p>
                <UButton size="xs" color="rose" variant="subtle" class="mt-3 cursor-pointer" @click="resetToSamplePhotos">
                  Load Sample Photos
                </UButton>
              </div>

              <div
                v-for="(photo, idx) in gallery.photos"
                :key="photo.id"
                draggable="true"
                class="p-2.5 rounded-xl border bg-white flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing group select-none"
                :class="[
                  draggedPhotoIndex === idx ? 'opacity-40 scale-98 border-dashed border-rose-400' : 'border-toast-200 hover:border-toast-300 shadow-2xs',
                  dragOverPhotoIndex === idx ? 'ring-2 ring-rose-500 bg-rose-50/60 border-rose-500 -translate-y-0.5' : '',
                ]"
                @dragstart="onDragStartPhoto(idx, $event)"
                @dragover="onDragOverPhoto(idx, $event)"
                @dragleave="onDragLeavePhoto(idx)"
                @drop="onDropPhoto(idx, $event)"
                @dragend="onDragEndPhoto">
                <!-- Drag Handle & Order Badge -->
                <div class="flex flex-col items-center justify-center gap-1 text-toast-400 group-hover:text-toast-600">
                  <UIcon name="i-lucide-grip-vertical" class="size-4" />
                  <span class="text-[9px] font-bold text-toast-400 font-mono">#{{ idx + 1 }}</span>
                </div>

                <!-- Thumbnail -->
                <div
                  class="size-14 rounded-lg overflow-hidden bg-toast-100 shrink-0 border border-black/10 relative cursor-pointer"
                  @click="openLightbox(photo)">
                  <img :src="photo.url" :alt="photo.alt || photo.name" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <UIcon name="i-lucide-zoom-in" class="size-3.5" />
                  </div>
                </div>

                <!-- Caption Input & Controls -->
                <div class="flex-1 min-w-0 space-y-1">
                  <input
                    v-model="photo.caption"
                    type="text"
                    placeholder="Add a photo caption..."
                    class="w-full text-xs py-1 px-2 rounded border border-toast-200 bg-toast-50 text-toast-800 placeholder-toast-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white" />
                  <div class="flex items-center justify-between text-[10px] text-toast-400">
                    <span class="truncate max-w-32">{{ photo.name || `Photo ${idx + 1}` }}</span>
                    <div class="flex items-center gap-1">
                      <button
                        v-if="idx > 0"
                        type="button"
                        title="Move Up"
                        class="p-0.5 hover:text-rose-600 cursor-pointer"
                        @click.stop="movePhoto(idx, 'prev')">
                        <UIcon name="i-lucide-arrow-up" class="size-3" />
                      </button>
                      <button
                        v-if="idx < gallery.photos.length - 1"
                        type="button"
                        title="Move Down"
                        class="p-0.5 hover:text-rose-600 cursor-pointer"
                        @click.stop="movePhoto(idx, 'next')">
                        <UIcon name="i-lucide-arrow-down" class="size-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Delete Button -->
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="text-toast-400 hover:text-red-500 cursor-pointer shrink-0"
                  @click="removePhoto(photo.id)" />
              </div>
            </div>
          </div>

          <!-- ================= STEP 2: REVIEW & PUBLISH ================= -->
          <div v-else-if="currentStep === 2" class="space-y-4">
            <div class="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-sparkles" class="size-5 text-rose-600" />
                <h3 class="font-bold text-sm text-toast-900">Your Gallery is Ready!</h3>
              </div>
              <p class="text-xs text-toast-700 leading-relaxed">
                You have curated <strong>{{ gallery.photos.length }} photos</strong> with the <strong>{{ gallery.layout }}</strong> layout suggestion.
                Save your changes to sync this gallery directly into your website.
              </p>
              <div class="pt-1 flex flex-col gap-2">
                <UButton icon="i-lucide-save" color="rose" size="sm" class="font-semibold text-xs justify-center text-white cursor-pointer" :loading="isSaving || isAddingPhotos" @click="handleSave">
                  Save Gallery
                </UButton>
                <UButton icon="i-lucide-globe" variant="outline" color="neutral" size="sm" class="text-xs justify-center cursor-pointer" @click="openWebsiteMaker">
                  Open in Website Maker
                </UButton>
              </div>
            </div>

            <!-- Summary card -->
            <div class="p-3.5 bg-white rounded-xl border border-toast-200 space-y-2 text-xs">
              <span class="font-bold text-toast-900">Gallery Snapshot:</span>
              <div class="grid grid-cols-2 gap-2 text-[11px] text-toast-600">
                <div>
                  <span class="text-toast-400 block">Layout:</span>
                  <span class="font-semibold text-toast-900 capitalize">{{ gallery.layout }}</span>
                </div>
                <div>
                  <span class="text-toast-400 block">Columns:</span>
                  <span class="font-semibold text-toast-900">{{ gallery.columns }} columns</span>
                </div>
                <div>
                  <span class="text-toast-400 block">Photos:</span>
                  <span class="font-semibold text-toast-900">{{ gallery.photos.length }} items</span>
                </div>
                <div>
                  <span class="text-toast-400 block">Lightbox:</span>
                  <span class="font-semibold text-toast-900">{{ gallery.enableLightbox ? 'Enabled' : 'Disabled' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Sidebar Footer -->
        <div class="p-3 border-t border-toast-200/80 bg-white flex items-center gap-2 shrink-0">
          <UButton v-if="currentStep > 0" icon="i-lucide-arrow-left" variant="outline" color="neutral" size="sm" class="flex-1 justify-center cursor-pointer text-xs" @click="currentStep--">
            Back
          </UButton>
          <UButton v-if="currentStep < stepsList.length - 1" icon="i-lucide-arrow-right" color="rose" size="sm" class="flex-1 font-semibold justify-center text-white cursor-pointer text-xs" @click="currentStep++">
            Next
          </UButton>
          <UButton v-else icon="i-lucide-check-circle" color="rose" size="sm" class="flex-1 font-semibold justify-center text-white cursor-pointer text-xs" :loading="isSaving || isAddingPhotos" @click="handleSave">
            Save &amp; Finish
          </UButton>
        </div>
      </div>
    </UDashboardSidebar>

    <!-- RIGHT SIDE: Live Interactive Showcase Canvas -->
    <main
      class="w-full min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start min-h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden"
      :class="isPreviewing ? 'max-w-5xl mx-auto' : ''">
        <UPageCard class="w-full min-w-0 max-w-full rounded-2xl shadow-lg border border-toast-200/80 ring-1 ring-black/5 overflow-hidden bg-white" :ui="{ container: 'p-0 flex flex-col min-w-0' }">
          <!-- Canvas Gallery Content Area -->
          <div class="p-6 sm:p-10 lg:p-14 space-y-8 bg-white min-h-125 min-w-0 w-full">
            <!-- Gallery Title & Subtitle Header -->
            <div class="max-w-3xl mx-auto text-center space-y-3">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200">
                <UIcon name="i-lucide-sparkles" class="size-3.5" />
                Wedding Memories
              </span>
              <h2 class="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-toast-900 leading-tight">
                {{ gallery.title || 'Captured Moments' }}
              </h2>
              <p v-if="gallery.subtitle" class="text-sm sm:text-base text-toast-600 max-w-xl mx-auto leading-relaxed">
                {{ gallery.subtitle }}
              </p>
            </div>

            <!-- Empty State -->
            <div v-if="gallery.photos.length === 0" class="py-16 text-center border-2 border-dashed border-toast-200 rounded-2xl max-w-xl mx-auto p-8">
              <UIcon name="i-lucide-images" class="size-12 text-toast-300 mx-auto mb-3" />
              <h4 class="text-base font-bold text-toast-800">Your Gallery is Currently Empty</h4>
              <p class="text-xs text-toast-500 mt-1">Upload your favorite memories or load sample wedding photos.</p>
              <UButton size="sm" color="rose" class="mt-4 text-white font-semibold cursor-pointer" @click="resetToSamplePhotos">
                Load Sample Photos
              </UButton>
            </div>

            <!-- LAYOUT 1: MODERN GRID -->
            <div
              v-else-if="gallery.layout === 'grid'"
              class="grid gap-4 sm:gap-6 max-w-5xl mx-auto"
              :class="{
                'grid-cols-1 sm:grid-cols-2': gallery.columns === 2,
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': gallery.columns === 3,
                'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4': gallery.columns === 4,
              }">
              <div
                v-for="(photo, idx) in gallery.photos"
                :key="photo.id"
                draggable="true"
                class="group relative aspect-4/3 rounded-2xl overflow-hidden bg-toast-100 border border-black/10 shadow-xs cursor-grab active:cursor-grabbing transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                :class="[
                  draggedPhotoIndex === idx ? 'opacity-30 scale-95 border-dashed border-rose-500' : '',
                  dragOverPhotoIndex === idx ? 'ring-4 ring-rose-500 scale-102 z-10' : '',
                ]"
                @dragstart="onDragStartPhoto(idx, $event)"
                @dragover="onDragOverPhoto(idx, $event)"
                @dragleave="onDragLeavePhoto(idx)"
                @drop="onDropPhoto(idx, $event)"
                @dragend="onDragEndPhoto"
                @click="openLightbox(photo)">
                <img :src="photo.url" :alt="photo.alt || photo.caption || 'Gallery photo'" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                  <p v-if="photo.caption" class="text-xs sm:text-sm font-medium line-clamp-2">{{ photo.caption }}</p>
                  <span class="text-[10px] text-white/70 font-mono mt-0.5">Drag to swap position</span>
                </div>
              </div>
            </div>

            <!-- LAYOUT 2: EDITORIAL MASONRY -->
            <div
              v-else-if="gallery.layout === 'masonry'"
              class="gap-4 sm:gap-6 max-w-5xl mx-auto space-y-4 sm:space-y-6"
              :class="{
                'columns-1 sm:columns-2': gallery.columns === 2,
                'columns-1 sm:columns-2 lg:columns-3': gallery.columns === 3,
                'columns-2 sm:columns-3 lg:columns-4': gallery.columns === 4,
              }">
              <div
                v-for="(photo, idx) in gallery.photos"
                :key="photo.id"
                draggable="true"
                class="break-inside-avoid mb-4 sm:mb-6 group relative rounded-2xl overflow-hidden bg-toast-100 border border-black/10 shadow-xs cursor-grab active:cursor-grabbing transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                :class="[
                  draggedPhotoIndex === idx ? 'opacity-30 border-dashed border-rose-500' : '',
                  dragOverPhotoIndex === idx ? 'ring-4 ring-rose-500 z-10' : '',
                ]"
                @dragstart="onDragStartPhoto(idx, $event)"
                @dragover="onDragOverPhoto(idx, $event)"
                @dragleave="onDragLeavePhoto(idx)"
                @drop="onDropPhoto(idx, $event)"
                @dragend="onDragEndPhoto"
                @click="openLightbox(photo)">
                <img :src="photo.url" :alt="photo.alt || photo.caption || 'Gallery photo'" class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-103" loading="lazy" />
                <div class="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                  <p v-if="photo.caption" class="text-xs sm:text-sm font-medium">{{ photo.caption }}</p>
                  <span class="text-[10px] text-white/70 font-mono mt-0.5">Drag to swap</span>
                </div>
              </div>
            </div>

            <!-- LAYOUT 3: HERO SPOTLIGHT / COLLAGE -->
            <div v-else-if="gallery.layout === 'collage'" class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <!-- Featured Hero (First Photo) -->
              <div
                v-if="gallery.photos[0]"
                draggable="true"
                class="lg:col-span-2 group relative aspect-4/3 lg:aspect-auto lg:h-full min-h-80 rounded-2xl overflow-hidden bg-toast-100 border border-black/10 shadow-md cursor-grab active:cursor-grabbing transition-all hover:shadow-xl"
                :class="[
                  draggedPhotoIndex === 0 ? 'opacity-30 border-dashed border-rose-500' : '',
                  dragOverPhotoIndex === 0 ? 'ring-4 ring-rose-500 z-10' : '',
                ]"
                @dragstart="onDragStartPhoto(0, $event)"
                @dragover="onDragOverPhoto(0, $event)"
                @dragleave="onDragLeavePhoto(0)"
                @drop="onDropPhoto(0, $event)"
                @dragend="onDragEndPhoto"
                @click="openLightbox(gallery.photos[0])">
                <img :src="gallery.photos[0].url" :alt="gallery.photos[0].alt || 'Hero photo'" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div class="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5">
                  <UIcon name="i-lucide-star" class="size-3.5 fill-amber-400 text-amber-400" />
                  <span>Featured Hero Moment</span>
                </div>
                <div class="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <p v-if="gallery.photos[0].caption" class="text-base sm:text-lg font-serif font-bold">{{ gallery.photos[0].caption }}</p>
                  <span class="text-xs text-white/70">Drag another photo here to make it the featured hero</span>
                </div>
              </div>

              <!-- Remaining Smaller Photos Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div
                  v-for="(photo, idx) in gallery.photos.slice(1, 5)"
                  :key="photo.id"
                  draggable="true"
                  class="group relative aspect-4/3 rounded-xl overflow-hidden bg-toast-100 border border-black/10 shadow-xs cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                  :class="[
                    draggedPhotoIndex === (idx + 1) ? 'opacity-30 border-dashed border-rose-500' : '',
                    dragOverPhotoIndex === (idx + 1) ? 'ring-4 ring-rose-500 z-10' : '',
                  ]"
                  @dragstart="onDragStartPhoto(idx + 1, $event)"
                  @dragover="onDragOverPhoto(idx + 1, $event)"
                  @dragleave="onDragLeavePhoto(idx + 1)"
                  @drop="onDropPhoto(idx + 1, $event)"
                  @dragend="onDragEndPhoto"
                  @click="openLightbox(photo)">
                  <img :src="photo.url" :alt="photo.caption || 'Thumbnail photo'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                    <p v-if="photo.caption" class="text-xs font-medium truncate">{{ photo.caption }}</p>
                    <span class="text-[10px] text-white/70 font-mono">Drag to swap</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- LAYOUT 4: FILMSTRIP CAROUSEL -->
            <div v-else-if="gallery.layout === 'filmstrip'" class="w-full min-w-0 max-w-5xl mx-auto space-y-3">
              <div class="flex items-center justify-between text-xs text-toast-500">
                <span class="inline-flex items-center gap-1.5 font-medium">
                  <UIcon name="i-lucide-arrow-left-right" class="size-3.5" />
                  Scroll horizontally &bull; Drag to swap photo sequence
                </span>
                <span class="font-mono">{{ gallery.photos.length }} photos</span>
              </div>

              <div class="w-full min-w-0 flex gap-4 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory scrollbar-thin">
                <div
                  v-for="(photo, idx) in gallery.photos"
                  :key="photo.id"
                  draggable="true"
                  class="snap-start shrink-0 w-64 sm:w-72 aspect-3/4 group relative rounded-2xl overflow-hidden bg-toast-100 border border-black/10 shadow-xs cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-1"
                  :class="[
                    draggedPhotoIndex === idx ? 'opacity-30 border-dashed border-rose-500' : '',
                    dragOverPhotoIndex === idx ? 'ring-4 ring-rose-500 z-10' : '',
                  ]"
                  @dragstart="onDragStartPhoto(idx, $event)"
                  @dragover="onDragOverPhoto(idx, $event)"
                  @dragleave="onDragLeavePhoto(idx)"
                  @drop="onDropPhoto(idx, $event)"
                  @dragend="onDragEndPhoto"
                  @click="openLightbox(photo)">
                  <img :src="photo.url" :alt="photo.caption || 'Filmstrip photo'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div class="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-mono backdrop-blur-2xs">
                    #{{ idx + 1 }}
                  </div>
                  <div class="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                    <p v-if="photo.caption" class="text-xs sm:text-sm font-medium leading-snug">{{ photo.caption }}</p>
                    <span class="text-[10px] text-white/60 font-mono mt-0.5">Drag to swap</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- LAYOUT 5: POLAROID KEEPSAKES -->
            <div
              v-else-if="gallery.layout === 'polaroid'"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto pt-2">
              <div
                v-for="(photo, idx) in gallery.photos"
                :key="photo.id"
                draggable="true"
                class="bg-white p-3 sm:p-4 pb-6 rounded-sm shadow-md border border-toast-200/80 transform hover:-translate-y-2 hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing group select-none"
                :class="[
                  idx % 3 === 0 ? '-rotate-1 hover:rotate-0' : (idx % 3 === 1 ? 'rotate-1 hover:rotate-0' : '-rotate-0.5 hover:rotate-0'),
                  draggedPhotoIndex === idx ? 'opacity-30 border-dashed border-rose-500' : '',
                  dragOverPhotoIndex === idx ? 'ring-4 ring-rose-500 scale-103 z-10' : '',
                ]"
                @dragstart="onDragStartPhoto(idx, $event)"
                @dragover="onDragOverPhoto(idx, $event)"
                @dragleave="onDragLeavePhoto(idx)"
                @drop="onDropPhoto(idx, $event)"
                @dragend="onDragEndPhoto"
                @click="openLightbox(photo)">
                <div class="aspect-square w-full overflow-hidden bg-toast-100 relative mb-3">
                  <img :src="photo.url" :alt="photo.caption || 'Polaroid moment'" class="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" loading="lazy" />
                  <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <UIcon name="i-lucide-zoom-in" class="size-5" />
                  </div>
                </div>
                <div class="text-center px-1">
                  <p class="font-serif italic text-xs sm:text-sm text-toast-800 line-clamp-1">
                    {{ photo.caption || photo.name || 'Cherished Memory' }}
                  </p>
                  <span class="text-[9px] text-toast-400 font-mono mt-0.5 block">#{{ idx + 1 }} &bull; Drag to swap</span>
                </div>
              </div>
            </div>
          </div>
        </UPageCard>
      </main>
    </div>

    <!-- Full-screen Lightbox Modal -->
    <UModal v-model:open="isLightboxOpen">
      <template #content>
        <div v-if="selectedLightboxPhoto" class="p-4 sm:p-6 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-toast-200">
            <div>
              <h3 class="text-sm font-bold text-toast-900 truncate max-w-sm">
                {{ selectedLightboxPhoto.caption || selectedLightboxPhoto.name || 'Photo Showcase' }}
              </h3>
              <span class="text-[11px] font-medium text-rose-600">
                Photo Gallery Lightbox
              </span>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isLightboxOpen = false" />
          </div>
          <div class="w-full max-h-[75vh] overflow-hidden rounded-xl bg-stone-900 flex items-center justify-center">
            <img :src="selectedLightboxPhoto.url" :alt="selectedLightboxPhoto.alt || 'Full photo'" class="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
