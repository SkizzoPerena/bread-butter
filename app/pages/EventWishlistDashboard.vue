<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import type { GiftItemEntry, QrCodeEntry } from '~/types/wishlist'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Gifts',
  bgClass: 'bg-bread-50/30',
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { finishPageTransition } = usePageTransition()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const mutationsDisabled = computed(
  () => isEventCancelled.value || (!eventId.value && !isUiOnlyMode.value)
)

const eventTitle = computed(() => eventRecord.value?.eventName ?? 'Jane & John\'s Wedding')
const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  return dateValue ? df.format(new Date(dateValue)) : ''
})

const {
  isLoading: isLoadingWishlist,
  isSubmitting,
  qrCodes,
  giftItems,
  isQrModalOpen,
  qrModalMode,
  qrForm,
  qrImageInput,
  qrImagePreview,
  isGiftModalOpen,
  giftModalMode,
  giftForm,
  isDeleteQrModalOpen,
  qrToDelete,
  isDeleteGiftModalOpen,
  giftToDelete,
  deletingQrId,
  deletingGiftId,
  togglingGiftId,
  loadWishlist,
  openCreateQrModal,
  openEditQrModal,
  closeQrModal,
  onQrImageChange,
  submitQrModal,
  openDeleteQrModal,
  confirmDeleteQr,
  openCreateGiftModal,
  openEditGiftModal,
  closeGiftModal,
  submitGiftModal,
  toggleGiftFulfilled,
  openDeleteGiftModal,
  confirmDeleteGift,
} = useEventWishlist({ eventId, mutationsDisabled })

const isPageLoading = computed(() => isLoadingEvent.value || isLoadingWishlist.value)

// Tab state: 'gifts' | 'qrs' | 'preview'
type DashboardTab = 'gifts' | 'qrs' | 'preview'
const activeTab = ref<DashboardTab>('gifts')
const searchQuery = ref('')
const giftFilter = ref<'all' | 'available' | 'claimed'>('all')

const tabs = computed(() => [
  {
    label: 'Gift Items',
    value: 'gifts',
    icon: 'i-lucide-gift',
    badge: String(giftItems.value.length),
  },
  {
    label: 'Payment QRs',
    value: 'qrs',
    icon: 'i-lucide-qr-code',
    badge: String(qrCodes.value.length),
  },
  {
    label: 'Website Preview',
    value: 'preview',
    icon: 'i-lucide-globe',
    badge: 'Live',
  },
])

// Metrics calculations
const totalGiftCount = computed(() => giftItems.value.length)
const fulfilledGiftCount = computed(() => giftItems.value.filter((g) => g.isFulfilled).length)
const availableGiftCount = computed(() => totalGiftCount.value - fulfilledGiftCount.value)
const totalQrCount = computed(() => qrCodes.value.length)
const totalRegistryItems = computed(() => totalGiftCount.value + totalQrCount.value)
const fulfillmentPercentage = computed(() => {
  if (totalGiftCount.value === 0) return 0
  return Math.round((fulfilledGiftCount.value / totalGiftCount.value) * 100)
})

// Search & Filtering for Gift Items
const filteredGiftItems = computed(() => {
  let list = giftItems.value

  if (giftFilter.value === 'available') {
    list = list.filter((item) => !item.isFulfilled)
  } else if (giftFilter.value === 'claimed') {
    list = list.filter((item) => item.isFulfilled)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list

  return list.filter((item) => {
    return (
      item.name.toLowerCase().includes(q) ||
      (item.url && item.url.toLowerCase().includes(q))
    )
  })
})

// Search & Filtering for QR codes
const filteredQrCodes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return qrCodes.value

  return qrCodes.value.filter((item) => {
    return (
      (item.bankType && item.bankType.toLowerCase().includes(q)) ||
      (item.accountName && item.accountName.toLowerCase().includes(q)) ||
      item.accountNumber.toLowerCase().includes(q)
    )
  })
})

// Quick copy helper
async function copyAccountNumber(accountNumber: string, bankType?: string) {
  try {
    await navigator.clipboard.writeText(accountNumber)
    toast.add({
      title: 'Copied to clipboard',
      description: `${bankType ? bankType + ' ' : ''}Account #${accountNumber} copied.`,
      color: 'success',
    })
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'Please copy the account number manually.',
      color: 'neutral',
    })
  }
}

// Lightbox modal for QR code preview
const isQrLightboxOpen = ref(false)
const selectedQrForLightbox = ref<QrCodeEntry | null>(null)

function openQrLightbox(entry: QrCodeEntry) {
  selectedQrForLightbox.value = entry
  isQrLightboxOpen.value = true
}

// Bank type suggestions
const BANK_SUGGESTIONS = [
  'GCash',
  'Maya',
  'BPI',
  'BDO',
  'UnionBank',
  'Metrobank',
  'RCBC',
  'Security Bank',
  'PayPal',
]

function selectBankSuggestion(bank: string) {
  qrForm.bankType = bank
}

function getDisplayDomain(url?: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return 'Store Link'
  }
}

const modalUi = {
  content: 'border-none ring-transparent max-w-lg shadow-xl',
  body: 'p-0 overflow-y-auto max-h-[72vh] focus:outline-none',
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  isLoadingEvent.value = true

  try {
    const detail = await loadPageData({
      fetch: async () => fetchEvent(targetEventId),
      mock: () => ({
        event: {
          _id: targetEventId,
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
          coverImageURL: null,
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

async function reloadPageData() {
  try {
    await loadEventData()
    await loadWishlist(eventId.value || 'mock-event-id')
  } finally {
    finishPageTransition()
  }
}

watch(eventId, () => {
  reloadPageData()
})

onMounted(() => {
  reloadPageData()
})
</script>

<template>
  <div
    class="gifts-page-root w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden bg-bread-50/30"
  >
    <!-- Navbar Teleport Actions -->
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            :to="{ path: '/website-maker', query: { eventId } }"
            icon="i-lucide-globe"
            color="neutral"
            variant="outline"
            size="sm"
          >
            Website Maker
          </UButton>
          <UButton
            icon="i-lucide-qr-code"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="mutationsDisabled || isSubmitting"
            @click="openCreateQrModal"
          >
            Add QR Code
          </UButton>
          <UButton
            icon="i-lucide-gift"
            color="pink"
            size="sm"
            :disabled="mutationsDisabled || isSubmitting"
            @click="openCreateGiftModal"
          >
            Add Gift Item
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ================= LEFT DIVISION (col-span-1): Event Details & Registry Metrics ================= -->
    <aside
      class="col-span-1 lg:col-span-1 w-full bg-white border-b lg:border-b-0 lg:border-r border-bread-200/80 shadow-xs flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] z-20 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6"
    >
      <div class="space-y-6">
        <!-- 1. Event Details -->
        <div class="space-y-2">
          <div>
            <h1
              class="font-serif text-xl sm:text-2xl font-bold text-highlighted leading-tight tracking-tight break-words"
            >
              {{ eventTitle }}
            </h1>
          </div>

          <div class="flex items-center gap-3 pt-1 text-xs text-toast-700 font-sans min-w-0">
            <div v-if="eventDateLabel" class="flex items-center gap-1.5 shrink-0">
              <UIcon name="i-lucide-calendar" class="size-3.5 text-toast-500 shrink-0" />
              <span>{{ eventDateLabel }}</span>
            </div>
            <span v-if="eventDateLabel && eventRecord?.venue" class="text-toast-300">•</span>
            <div v-if="eventRecord?.venue" class="flex items-center gap-1.5 min-w-0 truncate">
              <UIcon name="i-lucide-map-pin" class="size-3.5 text-toast-500 shrink-0" />
              <span class="truncate">{{ eventRecord.venue }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Gifts & Registry Overview -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-1">
            <h2 class="font-bold font-serif text-sm text-highlighted">
              Registry Overview
            </h2>
            <span class="text-xs text-muted font-sans font-medium">
              {{ totalRegistryItems }} items
            </span>
          </div>

          <!-- Total Items Card -->
          <div class="bg-pink-50/70 border border-pink-200/70 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-semibold text-pink-800 font-sans block">Total Registry Items</span>
              <span class="text-xl sm:text-2xl font-bold font-serif text-pink-950 tracking-tight mt-0.5 block">
                {{ totalRegistryItems }}
              </span>
            </div>
            <div class="size-9 rounded-lg bg-pink-100 flex items-center justify-center text-pink-700 shrink-0">
              <UIcon name="i-lucide-gift" class="size-5" />
            </div>
          </div>

          <!-- 3 Columns: Gift Items, Payment QRs, Claimed -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Gift Items -->
            <div class="bg-bread-50/70 border border-bread-200/70 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-toast-700 font-sans">Gifts</span>
                <UIcon name="i-lucide-package" class="size-3.5 text-toast-500" />
              </div>
              <span class="text-base sm:text-lg font-bold font-serif text-highlighted tracking-tight mt-1">
                {{ totalGiftCount }}
              </span>
            </div>

            <!-- Payment QRs -->
            <div class="bg-pink-50/50 border border-pink-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-pink-800 font-sans">QRs</span>
                <UIcon name="i-lucide-qr-code" class="size-3.5 text-pink-600" />
              </div>
              <span class="text-base sm:text-lg font-bold font-serif text-pink-950 tracking-tight mt-1">
                {{ totalQrCount }}
              </span>
            </div>

            <!-- Claimed / Fulfilled -->
            <div class="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-2.5 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-emerald-800 font-sans">Claimed</span>
                <UIcon name="i-lucide-check-circle" class="size-3.5 text-emerald-600" />
              </div>
              <span class="text-base sm:text-lg font-bold font-serif text-emerald-950 tracking-tight mt-1">
                {{ fulfilledGiftCount }}
              </span>
            </div>
          </div>

          <!-- Fulfillment Progress Card -->
          <div class="bg-toast-50/70 border border-bread-200/60 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-semibold text-toast-800">Gifts Claimed Rate</span>
              <span class="font-bold font-serif text-pink-950 text-sm">{{ fulfillmentPercentage }}%</span>
            </div>
            <UProgress :model-value="fulfillmentPercentage" color="pink" size="xs" />
            <div class="flex items-center justify-between text-[11px] text-muted font-sans pt-0.5">
              <span>{{ fulfilledGiftCount }} of {{ totalGiftCount }} claimed</span>
              <span v-if="availableGiftCount > 0" class="text-pink-800 font-medium">
                {{ availableGiftCount }} available
              </span>
              <span v-else-if="totalGiftCount > 0" class="text-emerald-700 font-medium">
                All fulfilled!
              </span>
              <span v-else class="text-muted">
                No gift items
              </span>
            </div>
          </div>
        </div>

        <!-- 3. Website Maker Custom Component Link -->
        <div class="bg-gradient-to-br from-pink-50/60 to-bread-50/60 border border-pink-200/70 rounded-xl p-3.5 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-sparkles" class="size-4 text-pink-600" />
              <span class="text-xs font-bold font-serif text-highlighted">Website Maker Sync</span>
            </div>
            <UBadge color="pink" variant="subtle" size="xs">
              Live Component
            </UBadge>
          </div>
          <p class="text-[11px] text-muted leading-relaxed">
            This registry powers the <strong>Gifts</strong> section on your custom wedding website. Any gifts and QR codes added here automatically display for your guests.
          </p>
          <UButton
            :to="{ path: '/website-maker', query: { eventId } }"
            target="_blank"
            icon="i-lucide-external-link"
            color="pink"
            variant="soft"
            size="xs"
            class="w-full justify-center"
          >
            Customize in Website Maker
          </UButton>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="space-y-2 pt-4 border-t border-bread-200/60">
        <UButton
          icon="i-lucide-gift"
          color="pink"
          class="w-full justify-center"
          :disabled="mutationsDisabled"
          @click="openCreateGiftModal"
        >
          Add Gift Item
        </UButton>
        <UButton
          icon="i-lucide-qr-code"
          color="neutral"
          variant="outline"
          class="w-full justify-center"
          :disabled="mutationsDisabled"
          @click="openCreateQrModal"
        >
          Add Payment QR
        </UButton>
      </div>
    </aside>

    <!-- ================= RIGHT DIVISION (col-span-3): Tabbed Content ================= -->
    <main class="col-span-1 lg:col-span-3 w-full h-full flex flex-col overflow-hidden bg-bread-50/30">
      <!-- Sticky Header Toolbar -->
      <div
        class="sticky top-0 z-10 shrink-0 bg-white/95 backdrop-blur-sm border-b border-bread-200/80 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <UTabs
          v-model="activeTab"
          :items="tabs"
          variant="pill"
          color="pink"
          class="w-full sm:w-auto"
        />

        <div class="flex items-center gap-2">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search gifts, banks, accounts..."
            class="w-full sm:w-64"
            size="sm"
            clearable
          />
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 focus:outline-none">
        <div v-if="isPageLoading" class="flex items-center justify-center py-20 text-muted">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-pink-600" />
          <span class="ml-2 text-sm font-medium">Loading gift registry...</span>
        </div>

        <template v-else>
          <!-- ================= TAB 1: GIFT ITEMS ================= -->
          <div v-if="activeTab === 'gifts'" class="space-y-4">
            <!-- Filter & Action Bar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <UButton
                  size="xs"
                  :variant="giftFilter === 'all' ? 'solid' : 'ghost'"
                  :color="giftFilter === 'all' ? 'pink' : 'neutral'"
                  @click="giftFilter = 'all'"
                >
                  All ({{ totalGiftCount }})
                </UButton>
                <UButton
                  size="xs"
                  :variant="giftFilter === 'available' ? 'solid' : 'ghost'"
                  :color="giftFilter === 'available' ? 'pink' : 'neutral'"
                  @click="giftFilter = 'available'"
                >
                  Available ({{ availableGiftCount }})
                </UButton>
                <UButton
                  size="xs"
                  :variant="giftFilter === 'claimed' ? 'solid' : 'ghost'"
                  :color="giftFilter === 'claimed' ? 'pink' : 'neutral'"
                  @click="giftFilter = 'claimed'"
                >
                  Claimed ({{ fulfilledGiftCount }})
                </UButton>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <UButton
                  icon="i-lucide-plus"
                  color="pink"
                  size="sm"
                  :disabled="mutationsDisabled"
                  @click="openCreateGiftModal"
                >
                  Add Gift Item
                </UButton>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="filteredGiftItems.length === 0"
              class="rounded-2xl border border-dashed border-bread-200/80 bg-white/70 px-6 py-16 text-center shadow-xs"
            >
              <div class="mx-auto size-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                <UIcon name="i-lucide-gift" class="size-6" />
              </div>
              <h3 class="mt-4 font-serif font-bold text-lg text-highlighted">
                {{ searchQuery ? 'No matching gifts found' : 'No gift items added yet' }}
              </h3>
              <p class="mt-1 text-xs text-muted max-w-sm mx-auto">
                {{
                  searchQuery
                    ? 'Try adjusting your search terms or filter criteria.'
                    : 'Add specific physical gifts or wishlist ideas that your guests can claim.'
                }}
              </p>
              <div class="mt-5">
                <UButton
                  icon="i-lucide-plus"
                  color="pink"
                  size="sm"
                  :disabled="mutationsDisabled"
                  @click="openCreateGiftModal"
                >
                  Add First Gift
                </UButton>
              </div>
            </div>

            <!-- Gift Items Grid -->
            <div
              v-else
              class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <div
                v-for="entry in filteredGiftItems"
                :key="entry._id"
                class="group bg-white rounded-xl border border-bread-200/80 p-4 shadow-xs hover:shadow-md hover:border-pink-300/80 transition-all duration-200 flex flex-col justify-between"
                :class="{ 'opacity-75 bg-muted/10': entry.isFulfilled }"
              >
                <div class="space-y-3">
                  <!-- Header: Status Badge & Fulfillment Toggle -->
                  <div class="flex items-center justify-between gap-2">
                    <UBadge
                      :color="entry.isFulfilled ? 'emerald' : 'pink'"
                      variant="subtle"
                      size="xs"
                    >
                      <UIcon
                        :name="entry.isFulfilled ? 'i-lucide-check-circle-2' : 'i-lucide-tag'"
                        class="size-3 mr-1"
                      />
                      {{ entry.isFulfilled ? 'Claimed' : 'Available' }}
                    </UBadge>

                    <UButton
                      size="xs"
                      :color="entry.isFulfilled ? 'neutral' : 'emerald'"
                      variant="ghost"
                      :loading="togglingGiftId === entry._id"
                      :disabled="mutationsDisabled || Boolean(togglingGiftId)"
                      @click="toggleGiftFulfilled(entry)"
                    >
                      <UIcon
                        :name="entry.isFulfilled ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
                        class="size-3.5 mr-1"
                      />
                      {{ entry.isFulfilled ? 'Mark Available' : 'Mark Claimed' }}
                    </UButton>
                  </div>

                  <!-- Gift Title: Wrapped in full with no truncation -->
                  <div>
                    <h3
                      class="font-serif font-bold text-base text-highlighted break-words whitespace-normal leading-snug"
                      :class="{ 'line-through text-muted': entry.isFulfilled }"
                    >
                      {{ entry.name }}
                    </h3>
                  </div>

                  <!-- Store Link -->
                  <div v-if="entry.url" class="pt-0.5">
                    <a
                      :href="entry.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium bg-bread-50/70 hover:bg-bread-100/70 px-2.5 py-1 rounded-md border border-bread-200/60 max-w-full truncate transition-colors"
                    >
                      <UIcon name="i-lucide-external-link" class="size-3 shrink-0" />
                      <span class="truncate">{{ getDisplayDomain(entry.url) }}</span>
                    </a>
                  </div>
                </div>

                <!-- Footer: Actions Row -->
                <div class="mt-4 pt-3 border-t border-bread-100 flex items-center justify-end gap-1.5">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :disabled="mutationsDisabled"
                    @click="openEditGiftModal(entry)"
                  >
                    Edit
                  </UButton>
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    :loading="deletingGiftId === entry._id"
                    :disabled="mutationsDisabled || Boolean(deletingGiftId)"
                    @click="openDeleteGiftModal(entry)"
                  >
                    Delete
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB 2: PAYMENT QRS ================= -->
          <div v-else-if="activeTab === 'qrs'" class="space-y-4">
            <!-- Header Bar -->
            <div class="flex items-center justify-between gap-3 pb-1">
              <div>
                <h2 class="font-serif font-bold text-base text-highlighted">
                  Payment QR Codes
                </h2>
                <p class="text-xs text-muted">
                  E-wallet and bank account QR codes for digital monetary gifts.
                </p>
              </div>

              <UButton
                icon="i-lucide-plus"
                color="pink"
                size="sm"
                :disabled="mutationsDisabled"
                @click="openCreateQrModal"
              >
                Add QR Code
              </UButton>
            </div>

            <!-- Empty State -->
            <div
              v-if="filteredQrCodes.length === 0"
              class="rounded-2xl border border-dashed border-bread-200/80 bg-white/70 px-6 py-16 text-center shadow-xs"
            >
              <div class="mx-auto size-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                <UIcon name="i-lucide-qr-code" class="size-6" />
              </div>
              <h3 class="mt-4 font-serif font-bold text-lg text-highlighted">
                {{ searchQuery ? 'No matching QR codes' : 'No QR codes uploaded yet' }}
              </h3>
              <p class="mt-1 text-xs text-muted max-w-sm mx-auto">
                {{
                  searchQuery
                    ? 'Try searching with a different bank name or account number.'
                    : 'Upload payment QR codes (e.g. GCash, Maya, BPI) for guests to send cash gifts directly.'
                }}
              </p>
              <div class="mt-5">
                <UButton
                  icon="i-lucide-plus"
                  color="pink"
                  size="sm"
                  :disabled="mutationsDisabled"
                  @click="openCreateQrModal"
                >
                  Upload First QR Code
                </UButton>
              </div>
            </div>

            <!-- QR Codes Grid -->
            <div
              v-else
              class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <div
                v-for="entry in filteredQrCodes"
                :key="entry._id"
                class="group bg-white rounded-xl border border-bread-200/80 p-4 shadow-xs hover:shadow-md hover:border-pink-300/80 transition-all duration-200 flex flex-col justify-between"
              >
                <div class="space-y-3.5">
                  <!-- QR Code Image Preview Container -->
                  <div
                    class="relative aspect-square w-full rounded-lg border border-bread-200/80 bg-bread-50/40 p-3 flex items-center justify-center overflow-hidden cursor-pointer group/qr"
                    @click="openQrLightbox(entry)"
                  >
                    <img
                      v-if="entry.qrCodeUrl"
                      :src="entry.qrCodeUrl"
                      :alt="`${entry.bankType || 'Payment'} QR code`"
                      class="max-h-full max-w-full object-contain rounded transition-transform duration-200 group-hover/qr:scale-105"
                    >
                    <div
                      v-else
                      class="flex flex-col items-center justify-center text-muted"
                    >
                      <UIcon name="i-lucide-qr-code" class="size-12 stroke-[1.5]" />
                      <span class="text-xs mt-1">No image attached</span>
                    </div>

                    <!-- Hover Zoom Pill -->
                    <div
                      v-if="entry.qrCodeUrl"
                      class="absolute inset-0 bg-black/30 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-xs font-medium text-highlighted shadow-md">
                        <UIcon name="i-lucide-zoom-in" class="size-3.5 text-pink-600" />
                        Click to enlarge
                      </span>
                    </div>
                  </div>

                  <!-- Details -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <UBadge color="pink" variant="subtle" size="xs">
                        {{ entry.bankType || 'Payment QR' }}
                      </UBadge>
                    </div>

                    <div v-if="entry.accountName" class="font-sans text-xs text-muted font-medium truncate">
                      {{ entry.accountName }}
                    </div>

                    <!-- Account Number with Copy Button -->
                    <div class="flex items-center justify-between gap-1.5 bg-bread-50/70 border border-bread-200/60 rounded-lg px-2.5 py-1.5">
                      <span class="font-mono text-xs font-semibold text-highlighted tracking-wider truncate">
                        {{ entry.accountNumber }}
                      </span>
                      <UButton
                        icon="i-lucide-copy"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        aria-label="Copy account number"
                        @click.stop="copyAccountNumber(entry.accountNumber, entry.bankType)"
                      />
                    </div>
                  </div>
                </div>

                <!-- Footer: Actions Row -->
                <div class="mt-4 pt-3 border-t border-bread-100 flex items-center justify-between gap-2">
                  <UButton
                    v-if="entry.qrCodeUrl"
                    icon="i-lucide-zoom-in"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="openQrLightbox(entry)"
                  >
                    View
                  </UButton>
                  <span v-else />

                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :disabled="mutationsDisabled"
                      @click="openEditQrModal(entry)"
                    >
                      Edit
                    </UButton>
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="xs"
                      :loading="deletingQrId === entry._id"
                      :disabled="mutationsDisabled || Boolean(deletingQrId)"
                      @click="openDeleteQrModal(entry)"
                    >
                      Delete
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB 3: WEBSITE PREVIEW ================= -->
          <div v-else-if="activeTab === 'preview'" class="space-y-6">
            <!-- Header / Status Card -->
            <div class="bg-white rounded-xl border border-bread-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h2 class="font-serif font-bold text-lg text-highlighted">
                    Website Gifts Lookbook Preview
                  </h2>
                  <UBadge color="emerald" variant="subtle" size="xs">
                    Live Component
                  </UBadge>
                </div>
                <p class="text-xs text-muted">
                  This preview renders how guests view your QR codes and wished items on your wedding website.
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <UButton
                  :to="{ path: '/website-maker', query: { eventId } }"
                  target="_blank"
                  icon="i-lucide-external-link"
                  color="pink"
                  size="sm"
                >
                  Edit in Website Maker
                </UButton>
              </div>
            </div>

            <!-- Simulated Custom Component Container -->
            <div class="rounded-2xl border border-bread-200/80 bg-white shadow-sm overflow-hidden">
              <div class="bg-bread-100/60 border-b border-bread-200/70 px-4 py-2.5 flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-mono text-muted">
                  <UIcon name="i-lucide-layout" class="size-3.5 text-pink-600" />
                  <span>section-gifts (CustomSiteGiftsSection)</span>
                </div>
                <span class="text-[11px] text-muted">
                  {{ totalRegistryItems }} items registered
                </span>
              </div>

              <div class="py-12 px-6 sm:px-12 text-center bg-pink-50/20 space-y-10 min-h-[350px] flex flex-col justify-center">
                <!-- Heading -->
                <div class="space-y-3 max-w-2xl mx-auto">
                  <h2 class="font-serif text-3xl sm:text-4xl font-bold text-highlighted tracking-tight">
                    Gifts &amp; Registry
                  </h2>
                  <div class="flex items-center justify-center gap-3 py-1.5" aria-hidden="true">
                    <div class="w-12 sm:w-20 h-px bg-toast-300 opacity-60" />
                    <div class="size-1.5 rotate-45 bg-pink-500 opacity-80" />
                    <div class="w-12 sm:w-20 h-px bg-toast-300 opacity-60" />
                  </div>
                  <p class="text-sm text-muted max-w-md mx-auto leading-relaxed">
                    Your presence at our wedding is the greatest gift of all. If you wish to honor us with a gift, we have prepared our registry below.
                  </p>
                </div>

                <!-- Empty State within preview -->
                <div
                  v-if="qrCodes.length === 0 && giftItems.length === 0"
                  class="py-8 text-sm text-muted italic"
                >
                  Gift details will be shared soon.
                </div>

                <!-- QR Codes Preview -->
                <div v-if="qrCodes.length > 0" class="space-y-4">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-toast-600 font-sans">
                    Monetary Gifts &amp; E-Wallets
                  </h4>
                  <div class="flex flex-wrap justify-center gap-6">
                    <div
                      v-for="(entry, index) in qrCodes"
                      :key="entry._id || index"
                      class="flex w-56 flex-col items-center gap-2 bg-white rounded-xl p-4 border border-bread-200/70 shadow-xs"
                    >
                      <div class="aspect-square w-full rounded-lg bg-bread-50/50 p-2 border border-bread-100 flex items-center justify-center">
                        <img
                          v-if="entry.qrCodeUrl"
                          :src="entry.qrCodeUrl"
                          :alt="`${entry.bankType || 'Payment'} QR code`"
                          class="max-h-full max-w-full object-contain rounded"
                        >
                        <UIcon v-else name="i-lucide-qr-code" class="size-10 text-muted" />
                      </div>
                      <div class="font-bold text-sm text-highlighted">{{ entry.bankType || 'Bank / E-Wallet' }}</div>
                      <div v-if="entry.accountName" class="text-xs text-muted">{{ entry.accountName }}</div>
                      <div class="font-mono text-xs font-semibold text-highlighted bg-bread-50 px-2 py-0.5 rounded">
                        {{ entry.accountNumber }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Gift Items Preview -->
                <div v-if="giftItems.length > 0" class="space-y-4">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-toast-600 font-sans">
                    Physical Wishlist Items
                  </h4>
                  <ul class="mx-auto grid w-full max-w-2xl grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    <li
                      v-for="(item, index) in giftItems"
                      :key="item._id || index"
                      class="flex items-center justify-between gap-3 bg-white border border-bread-200/70 rounded-xl px-4 py-3 shadow-2xs"
                      :class="{ 'opacity-60 bg-muted/10': item.isFulfilled }"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <UIcon
                          :name="item.isFulfilled ? 'i-lucide-check-circle-2' : 'i-lucide-gift'"
                          class="size-4 shrink-0"
                          :class="item.isFulfilled ? 'text-emerald-600' : 'text-pink-600'"
                        />
                        <div class="min-w-0">
                          <a
                            v-if="item.url"
                            :href="item.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-medium text-sm text-highlighted hover:underline truncate block"
                            :class="{ 'line-through': item.isFulfilled }"
                          >
                            {{ item.name }}
                          </a>
                          <span
                            v-else
                            class="font-medium text-sm text-highlighted truncate block"
                            :class="{ 'line-through': item.isFulfilled }"
                          >
                            {{ item.name }}
                          </span>
                        </div>
                      </div>

                      <UBadge
                        :color="item.isFulfilled ? 'emerald' : 'neutral'"
                        variant="subtle"
                        size="xs"
                        class="shrink-0"
                      >
                        {{ item.isFulfilled ? 'Taken' : 'Available' }}
                      </UBadge>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- ================= MODALS ================= -->

    <!-- Add / Edit Gift Modal -->
    <UModal
      v-model:open="isGiftModalOpen"
      :title="giftModalMode === 'create' ? 'Add Gift Item' : 'Edit Gift Item'"
      :dismissible="!isSubmitting"
      :ui="modalUi"
    >
      <template #body>
        <div class="p-6 space-y-4">
          <form id="gift-modal-form" class="space-y-4" @submit.prevent="submitGiftModal">
            <UFormField label="Gift Item Name" name="name" required>
              <UInput
                v-model="giftForm.name"
                class="w-full"
                placeholder="e.g. KitchenAid Stand Mixer, Dyson Vacuum..."
                :disabled="isSubmitting || mutationsDisabled"
                autofocus
              />
            </UFormField>

            <UFormField
              label="Store or Registry Link"
              name="url"
              description="Optional link to online store (Amazon, Shopee, Lazada, etc.)"
            >
              <UInput
                v-model="giftForm.url"
                type="url"
                class="w-full"
                placeholder="https://..."
                :disabled="isSubmitting || mutationsDisabled"
              />
            </UFormField>

            <div v-if="giftModalMode === 'edit'" class="pt-2">
              <div class="flex items-center justify-between rounded-lg border border-bread-200/80 bg-bread-50/50 p-3">
                <div class="space-y-0.5">
                  <span class="text-xs font-semibold text-highlighted block">Mark as Claimed / Fulfilled</span>
                  <span class="text-[11px] text-muted block">Guests will see this item is already taken.</span>
                </div>
                <USwitch
                  v-model="giftForm.isFulfilled"
                  color="pink"
                  :disabled="isSubmitting || mutationsDisabled"
                />
              </div>
            </div>
          </form>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="isSubmitting"
            @click="closeGiftModal"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            form="gift-modal-form"
            color="pink"
            :loading="isSubmitting"
            :disabled="isSubmitting || mutationsDisabled"
          >
            {{ giftModalMode === 'create' ? 'Add Gift Item' : 'Save Changes' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Add / Edit QR Modal -->
    <UModal
      v-model:open="isQrModalOpen"
      :title="qrModalMode === 'create' ? 'Add Payment QR Code' : 'Edit Payment QR Code'"
      :dismissible="!isSubmitting"
      :ui="modalUi"
    >
      <template #body>
        <div class="p-6 space-y-4">
          <form id="qr-modal-form" class="space-y-4" @submit.prevent="submitQrModal">
            <!-- Bank Suggestions -->
            <UFormField label="Bank / E-Wallet Type" name="bankType">
              <UInput
                v-model="qrForm.bankType"
                class="w-full"
                placeholder="GCash, Maya, BPI, BDO..."
                :disabled="isSubmitting || mutationsDisabled"
              />
              <div class="mt-2 flex flex-wrap gap-1.5">
                <UButton
                  v-for="bank in BANK_SUGGESTIONS"
                  :key="bank"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  class="text-[11px] px-2 py-0.5"
                  :disabled="isSubmitting || mutationsDisabled"
                  @click="selectBankSuggestion(bank)"
                >
                  {{ bank }}
                </UButton>
              </div>
            </UFormField>

            <UFormField label="Account Name" name="accountName" description="Name of the account holder">
              <UInput
                v-model="qrForm.accountName"
                class="w-full"
                placeholder="e.g. Jane Doe"
                :disabled="isSubmitting || mutationsDisabled"
              />
            </UFormField>

            <UFormField label="Account Number" name="accountNumber" required>
              <UInput
                v-model="qrForm.accountNumber"
                class="w-full font-mono"
                placeholder="e.g. 09171234567 or 1234-5678-90"
                :disabled="isSubmitting || mutationsDisabled"
              />
            </UFormField>

            <UFormField
              label="QR Code Image"
              name="qrCode"
              :required="qrModalMode === 'create'"
              description="Upload a high quality screenshot or photo of your QR code"
            >
              <input
                ref="qrImageInput"
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                class="block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-pink-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-pink-700 hover:file:bg-pink-100 cursor-pointer"
                :disabled="isSubmitting || mutationsDisabled"
                @change="onQrImageChange"
              >
              <p
                v-if="qrModalMode === 'edit'"
                class="mt-1 text-[11px] text-muted"
              >
                Leave empty to retain the current image.
              </p>
            </UFormField>

            <!-- Image Preview -->
            <div
              v-if="qrImagePreview"
              class="flex flex-col items-center justify-center p-3 rounded-xl border border-bread-200/80 bg-bread-50/50"
            >
              <span class="text-xs font-medium text-muted mb-2">QR Code Preview</span>
              <img
                :src="qrImagePreview"
                alt="QR Preview"
                class="size-36 rounded-lg border border-bread-200/80 object-contain bg-white p-2 shadow-2xs"
              >
            </div>
          </form>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="isSubmitting"
            @click="closeQrModal"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            form="qr-modal-form"
            color="pink"
            :loading="isSubmitting"
            :disabled="isSubmitting || mutationsDisabled"
          >
            {{ qrModalMode === 'create' ? 'Add QR Code' : 'Save Changes' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- QR Lightbox Modal -->
    <UModal
      v-model:open="isQrLightboxOpen"
      :title="selectedQrForLightbox?.bankType ? `${selectedQrForLightbox.bankType} QR Code` : 'Payment QR Code'"
      :ui="{ content: 'border-none ring-transparent max-w-sm', body: 'p-0 overflow-hidden' }"
    >
      <template #body>
        <div class="p-6 flex flex-col items-center space-y-4 text-center">
          <div
            v-if="selectedQrForLightbox?.qrCodeUrl"
            class="w-full aspect-square bg-white rounded-xl border border-bread-200/80 p-4 shadow-sm flex items-center justify-center"
          >
            <img
              :src="selectedQrForLightbox.qrCodeUrl"
              alt="Enlarged QR Code"
              class="max-h-full max-w-full object-contain"
            >
          </div>

          <div class="space-y-1 w-full">
            <UBadge color="pink" variant="subtle" size="sm">
              {{ selectedQrForLightbox?.bankType || 'E-Wallet / Bank' }}
            </UBadge>
            <p v-if="selectedQrForLightbox?.accountName" class="text-sm font-medium text-highlighted pt-1">
              {{ selectedQrForLightbox.accountName }}
            </p>
            <div
              v-if="selectedQrForLightbox?.accountNumber"
              class="flex items-center justify-center gap-2 pt-1"
            >
              <span class="font-mono text-sm font-bold text-highlighted bg-bread-50 px-3 py-1 rounded-md border border-bread-200/60">
                {{ selectedQrForLightbox.accountNumber }}
              </span>
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="copyAccountNumber(selectedQrForLightbox!.accountNumber, selectedQrForLightbox?.bankType)"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end w-full">
          <UButton
            color="neutral"
            variant="outline"
            @click="isQrLightboxOpen = false"
          >
            Close
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Gift Confirmation Modal -->
    <UModal
      v-model:open="isDeleteGiftModalOpen"
      title="Delete Gift Item"
      :dismissible="!deletingGiftId"
      :ui="{ content: 'border-none ring-transparent max-w-md', body: 'p-0' }"
    >
      <template #body>
        <div class="p-6 space-y-3">
          <p class="text-sm text-muted">
            Are you sure you want to remove
            <strong class="font-semibold text-highlighted">{{ giftToDelete?.name }}</strong>
            from your wishlist?
          </p>
          <p class="text-xs text-muted">
            Guests will no longer be able to see or claim this item on your wedding website.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="Boolean(deletingGiftId)"
            @click="isDeleteGiftModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="Boolean(deletingGiftId)"
            :disabled="Boolean(deletingGiftId)"
            @click="confirmDeleteGift"
          >
            Delete Item
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete QR Confirmation Modal -->
    <UModal
      v-model:open="isDeleteQrModalOpen"
      title="Delete QR Code"
      :dismissible="!deletingQrId"
      :ui="{ content: 'border-none ring-transparent max-w-md', body: 'p-0' }"
    >
      <template #body>
        <div class="p-6 space-y-3">
          <p class="text-sm text-muted">
            Are you sure you want to delete this QR code
            <strong v-if="qrToDelete?.bankType" class="font-semibold text-highlighted">
              ({{ qrToDelete.bankType }})
            </strong>?
          </p>
          <p class="text-xs text-muted">
            Guests will no longer be able to scan this payment QR on your website.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="Boolean(deletingQrId)"
            @click="isDeleteQrModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="Boolean(deletingQrId)"
            :disabled="Boolean(deletingQrId)"
            @click="confirmDeleteQr"
          >
            Delete QR Code
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.gifts-page-root {
  min-height: calc(100vh - 64px);
}
</style>
