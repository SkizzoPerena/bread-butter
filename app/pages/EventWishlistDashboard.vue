<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Gifts',
  bgClass: 'bg-pink-50',
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

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

const eventTitle = computed(() => eventRecord.value?.eventName ?? 'Gifts')
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
  openDeleteGiftModal,
  confirmDeleteGift,
} = useEventWishlist({ eventId, mutationsDisabled })

const isPageLoading = computed(() => isLoadingEvent.value || isLoadingWishlist.value)

const modalUi = {
  content: 'border-none ring-transparent max-w-md',
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
  await loadEventData()
  await loadWishlist(eventId.value || 'mock-event-id')
}

watch(eventId, () => {
  reloadPageData()
})

onMounted(() => {
  reloadPageData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">
    <div
      v-if="isPageLoading"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading wishlist...</span>
    </div>

    <template v-else>
      <UPageCard class="white-bread-container">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0 flex-1">
            <div class="mb-2 flex flex-wrap items-center gap-2 md:gap-3">
              <h1 class="text-xl font-bold text-highlighted md:text-2xl">
                {{ eventTitle }}
              </h1>
              <UBadge color="pink" variant="subtle">
                Gifts &amp; Registry
              </UBadge>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm text-muted md:gap-4">
              <span
                v-if="eventDateLabel"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon name="i-lucide-calendar" class="size-4" />
                {{ eventDateLabel }}
              </span>
              <span v-if="eventDateLabel && eventRecord?.venue">•</span>
              <span
                v-if="eventRecord?.venue"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon name="i-lucide-map-pin" class="size-4" />
                {{ eventRecord.venue }}
              </span>
            </div>
          </div>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">QR Codes</h2>
            <p class="text-sm text-muted">
              E-wallet and bank account details for monetary gifts.
            </p>
          </div>
          <UButton
            icon="i-lucide-plus"
            color="pink"
            :disabled="mutationsDisabled"
            @click="openCreateQrModal"
          >
            Add QR code
          </UButton>
        </div>

        <div
          v-if="qrCodes.length === 0"
          class="rounded-lg border border-dashed border-default bg-muted/20 px-6 py-12 text-center"
        >
          <UIcon name="i-lucide-qr-code" class="mx-auto size-10 text-muted" />
          <p class="mt-4 text-base font-medium">No QR codes yet</p>
          <p class="mt-1 text-sm text-muted">
            Add payment QR codes so guests can send monetary gifts.
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="entry in qrCodes"
            :key="entry._id"
            class="flex flex-col gap-4 rounded-lg border border-default bg-muted/10 p-4 sm:flex-row sm:items-center"
          >
            <img
              v-if="entry.qrCodeUrl"
              :src="entry.qrCodeUrl"
              alt="QR code"
              class="size-24 shrink-0 rounded-md border border-default object-cover"
            >
            <div
              v-else
              class="flex size-24 shrink-0 items-center justify-center rounded-md border border-dashed border-default bg-muted/30"
            >
              <UIcon name="i-lucide-qr-code" class="size-8 text-muted" />
            </div>

            <div class="min-w-0 flex-1 space-y-1">
              <p v-if="entry.bankType" class="font-medium text-highlighted">
                {{ entry.bankType }}
              </p>
              <p v-if="entry.accountName" class="text-sm text-muted">
                {{ entry.accountName }}
              </p>
              <p class="text-sm font-mono text-highlighted">
                {{ entry.accountNumber }}
              </p>
            </div>

            <div class="flex shrink-0 gap-2">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="outline"
                :disabled="mutationsDisabled"
                @click="openEditQrModal(entry)"
              >
                Edit
              </UButton>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="outline"
                :loading="deletingQrId === entry._id"
                :disabled="mutationsDisabled || Boolean(deletingQrId)"
                @click="openDeleteQrModal(entry)"
              >
                Delete
              </UButton>
            </div>
          </div>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">Gift Items</h2>
            <p class="text-sm text-muted">
              Physical items your guests can choose to give.
            </p>
          </div>
          <UButton
            icon="i-lucide-plus"
            color="pink"
            :disabled="mutationsDisabled"
            @click="openCreateGiftModal"
          >
            Add gift
          </UButton>
        </div>

        <div
          v-if="giftItems.length === 0"
          class="rounded-lg border border-dashed border-default bg-muted/20 px-6 py-12 text-center"
        >
          <UIcon name="i-lucide-gift" class="mx-auto size-10 text-muted" />
          <p class="mt-4 text-base font-medium">No gift items yet</p>
          <p class="mt-1 text-sm text-muted">
            Add items to your wishlist with optional store links.
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="entry in giftItems"
            :key="entry._id"
            class="flex flex-col gap-4 rounded-lg border border-default bg-muted/10 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0 flex-1 space-y-2">
              <p class="font-medium text-highlighted">
                {{ entry.name }}
              </p>
              <a
                v-if="entry.url"
                :href="entry.url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <UIcon name="i-lucide-external-link" class="size-3.5" />
                View link
              </a>
            </div>

            <div class="flex shrink-0 flex-wrap gap-2">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="outline"
                size="sm"
                :disabled="mutationsDisabled"
                @click="openEditGiftModal(entry)"
              >
                Edit
              </UButton>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="outline"
                size="sm"
                :loading="deletingGiftId === entry._id"
                :disabled="mutationsDisabled || Boolean(deletingGiftId)"
                @click="openDeleteGiftModal(entry)"
              >
                Delete
              </UButton>
            </div>
          </div>
        </div>
      </UPageCard>
    </template>

    <UModal
      v-model:open="isQrModalOpen"
      :title="qrModalMode === 'create' ? 'Add QR code' : 'Edit QR code'"
      :dismissible="!isSubmitting"
      :ui="modalUi"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="submitQrModal">
          <UFormField label="Bank / e-wallet type" name="bankType">
            <UInput
              v-model="qrForm.bankType"
              class="w-full"
              placeholder="GCash, Maya, BPI..."
              :disabled="isSubmitting || mutationsDisabled"
            />
          </UFormField>

          <UFormField label="Account name" name="accountName">
            <UInput
              v-model="qrForm.accountName"
              class="w-full"
              placeholder="Account holder name"
              :disabled="isSubmitting || mutationsDisabled"
            />
          </UFormField>

          <UFormField label="Account number" name="accountNumber" required>
            <UInput
              v-model="qrForm.accountNumber"
              class="w-full"
              placeholder="09171234567"
              :disabled="isSubmitting || mutationsDisabled"
            />
          </UFormField>

          <UFormField
            label="QR code image"
            name="qrCode"
            :required="qrModalMode === 'create'"
          >
            <input
              ref="qrImageInput"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              class="block w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-pink-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-pink-700 hover:file:bg-pink-100"
              :disabled="isSubmitting || mutationsDisabled"
              @change="onQrImageChange"
            >
            <p
              v-if="qrModalMode === 'edit'"
              class="mt-1 text-xs text-muted"
            >
              Leave empty to keep the current image.
            </p>
          </UFormField>

          <div
            v-if="qrImagePreview"
            class="flex justify-center"
          >
            <img
              :src="qrImagePreview"
              alt="QR preview"
              class="size-32 rounded-md border border-default object-cover"
            >
          </div>

          <div class="flex justify-end gap-2 pt-2">
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
              color="pink"
              :loading="isSubmitting"
              :disabled="isSubmitting || mutationsDisabled"
            >
              {{ qrModalMode === 'create' ? 'Add QR code' : 'Save changes' }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="isGiftModalOpen"
      :title="giftModalMode === 'create' ? 'Add gift item' : 'Edit gift item'"
      :dismissible="!isSubmitting"
      :ui="modalUi"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="submitGiftModal">
          <UFormField label="Name" name="name" required>
            <UInput
              v-model="giftForm.name"
              class="w-full"
              placeholder="Kitchen stand mixer"
              :disabled="isSubmitting || mutationsDisabled"
            />
          </UFormField>

          <UFormField label="Link" name="url">
            <UInput
              v-model="giftForm.url"
              type="url"
              class="w-full"
              placeholder="https://..."
              :disabled="isSubmitting || mutationsDisabled"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
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
              color="pink"
              :loading="isSubmitting"
              :disabled="isSubmitting || mutationsDisabled"
            >
              {{ giftModalMode === 'create' ? 'Add gift' : 'Save changes' }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteQrModalOpen"
      title="Delete QR code"
      :dismissible="!deletingQrId"
      :ui="modalUi"
    >
      <template #body>
        <p class="text-sm text-muted">
          Are you sure you want to delete this QR code entry
          <span v-if="qrToDelete?.bankType" class="font-medium text-highlighted">
            ({{ qrToDelete.bankType }})
          </span>?
        </p>
        <div class="mt-6 flex justify-end gap-2">
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
            Delete
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteGiftModalOpen"
      title="Delete gift item"
      :dismissible="!deletingGiftId"
      :ui="modalUi"
    >
      <template #body>
        <p class="text-sm text-muted">
          Are you sure you want to delete
          <span class="font-medium text-highlighted">{{ giftToDelete?.name }}</span>?
        </p>
        <div class="mt-6 flex justify-end gap-2">
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
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
