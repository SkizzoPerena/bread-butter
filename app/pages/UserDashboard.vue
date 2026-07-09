<script lang="ts" setup>
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { mapEventTypeToApi, EVENT_TYPE_OPTIONS, isWeddingEventType, formatEventPriceTier, type EventTypeLabel } from '~/types/event'
import type { PriceTierRecord } from '~/types/priceTier'
import { EVENT_CREATION_FEE_PHP, getEventBalanceDue, isEventFullyPaid } from '~/types/payment'
import { reportApiError, getApiErrorMessage } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { usePriceTiers } from '~/composables/usePriceTiers'
import { defaultCover, resolveEventCoverImageUrl } from '~/utils/eventImage'

definePageMeta({
  layout: 'user-navbar',
})

const toast = useToast()
const router = useRouter()
const { user } = useAuth()
const { createEvent, fetchUserEvents } = useEvents()
const { fetchAvailablePriceTiers } = usePriceTiers()
const { loadPageData } = useApiMode()

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const isLoadingTiers = ref(false)
const availableTiers = ref<PriceTierRecord[]>([])
const selectedTierId = ref('')

const eventTypes = EVENT_TYPE_OPTIONS

const form = reactive<{
  eventName: string
  eventType: EventTypeLabel
  description: string
  venue: string
  payLater: boolean
  transactionId: string
  isCatholicWedding: boolean
}>({
  eventName: '',
  eventType: 'Wedding',
  description: '',
  venue: '',
  payLater: false,
  transactionId: '',
  isCatholicWedding: false,
})

const isWeddingEvent = computed(() => isWeddingEventType(form.eventType))

const selectedTier = computed(() =>
  availableTiers.value.find((tier) => tier._id === selectedTierId.value) ?? null
)

const selectedTierPrice = computed(() => selectedTier.value?.pricePhp ?? EVENT_CREATION_FEE_PHP)

watch(
  () => form.eventType,
  (nextType) => {
    if (!isWeddingEventType(nextType)) {
      form.isCatholicWedding = false
    }
  }
)

async function loadPriceTiers() {
  isLoadingTiers.value = true
  try {
    const tiers = await fetchAvailablePriceTiers()
    availableTiers.value = tiers
    if (tiers.length > 0) {
      const stillValid = tiers.some((tier) => tier._id === selectedTierId.value)
      if (!stillValid) {
        selectedTierId.value = tiers[0]._id
      }
    } else {
      selectedTierId.value = ''
    }
  } catch (error) {
    availableTiers.value = []
    selectedTierId.value = ''
    reportApiError(toast, { title: 'Could not load price tiers', error })
  } finally {
    isLoadingTiers.value = false
  }
}

watch(isModalOpen, (open) => {
  if (open) {
    loadPriceTiers()
  }
})

const coverImageFile = ref<File | null>(null)
const proofOfPaymentFile = ref<File | null>(null)
const coverImageInput = ref<HTMLInputElement | null>(null)
const proofOfPaymentInput = ref<HTMLInputElement | null>(null)

const minEventDate = computed(() =>
  isWeddingEvent.value
    ? today(getLocalTimeZone()).add({ years: 1 })
    : today(getLocalTimeZone()).add({ months: 1 })
)

const modelValue = shallowRef(
  new CalendarDate(minEventDate.value.year, minEventDate.value.month, minEventDate.value.day)
)

watch(minEventDate, (nextMin) => {
  const current = modelValue.value
  if (current.compare(nextMin) < 0) {
    modelValue.value = new CalendarDate(nextMin.year, nextMin.month, nextMin.day)
  }
})

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

const welcomeName = computed(() => user.value?.firstName ?? 'Jane')

const userEvents = ref<EventRecord[]>([])
const isLoadingEvents = ref(false)

async function loadUserEvents() {
  isLoadingEvents.value = true
  try {
    userEvents.value = await loadPageData({
      mock: () => [],
      fetch: () => fetchUserEvents(),
    })
  } catch (error) {
    userEvents.value = []
    reportApiError(toast, { title: 'Could not load events', error })
  } finally {
    isLoadingEvents.value = false
  }
}

function formatEventDateLabel(iso: string): string {
  return df.format(new Date(iso))
}

function getPaymentStatusLabel(event: EventRecord): string {
  if (isEventFullyPaid(event)) {
    return 'Paid'
  }
  const status = event.latestPayment?.status
  if (status === 'PENDING') {
    return 'Pending review'
  }
  const balanceDue = getEventBalanceDue(event)
  if (status === 'APPROVED' && balanceDue > 0) {
    return `Partially paid — Php ${balanceDue.toLocaleString()} due`
  }
  if (status === 'DENIED') {
    return 'Denied'
  }
  if (!status) {
    return 'Payment required'
  }
  return `Balance due: Php ${balanceDue.toLocaleString()}`
}

function onCoverImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

onMounted(() => {
  loadUserEvents()
})

const cards = ref([
  {
    title: 'Upcoming Events',
    icon: 'i-lucide-calendars',
    to: '/docs/getting-started/integrations/icons',
    number: '50',
  },
  {
    title: 'Tasks Completed',
    icon: 'i-lucide-list-checks',
    to: '/docs/getting-started/integrations/fonts',
    number: '10 / 12',
  },
  {
    title: 'Total Budget',
    icon: 'i-lucide-piggy-bank',
    to: '/docs/getting-started/integrations/color-mode',
    number: 'Php 500,000',
  }
])

function onCoverImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  coverImageFile.value = input.files?.[0] ?? null
}

function onProofOfPaymentChange(event: Event) {
  const input = event.target as HTMLInputElement
  proofOfPaymentFile.value = input.files?.[0] ?? null
}

function calendarDateToUtcIso(date: CalendarDate): string {
  // Store date-only values at UTC midnight to avoid timezone drift.
  const utcMs = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0, 0)
  return new Date(utcMs).toISOString()
}

async function handleCreateEvent() {
  if (!form.eventName.trim()) {
    toast.add({ title: 'Missing event name', color: 'error' })
    return
  }
  if (!form.venue.trim()) {
    toast.add({ title: 'Missing venue', color: 'error' })
    return
  }
  if (!form.description.trim()) {
    toast.add({ title: 'Missing description', color: 'error' })
    return
  }
  if (!coverImageFile.value) {
    toast.add({ title: 'Cover image required', description: 'Please upload a cover image for your event.', color: 'error' })
    return
  }
  if (!selectedTierId.value) {
    toast.add({ title: 'Price tier required', description: 'Please select a price tier for your event.', color: 'error' })
    return
  }
  if (!form.payLater) {
    if (!form.transactionId.trim()) {
      toast.add({ title: 'Transaction ID required', description: 'Please enter your payment transaction ID.', color: 'error' })
      return
    }
    if (!proofOfPaymentFile.value) {
      toast.add({ title: 'Proof of payment required', description: 'Please upload proof of your payment.', color: 'error' })
      return
    }
  }

  isSubmitting.value = true
  try {
    const event = await createEvent({
      eventType: mapEventTypeToApi(form.eventType),
      eventName: form.eventName.trim(),
      description: form.description.trim(),
      venue: form.venue.trim(),
      eventDate: calendarDateToUtcIso(modelValue.value),
      priceTierId: selectedTierId.value,
      coverImage: coverImageFile.value,
      payLater: form.payLater,
      transactionId: form.payLater ? undefined : form.transactionId.trim(),
      proofOfPayment: form.payLater ? undefined : proofOfPaymentFile.value ?? undefined,
      isCatholicWedding: isWeddingEvent.value ? form.isCatholicWedding : false,
    })

    toast.add({
      title: 'Event created',
      description: form.payLater
        ? 'You can submit payment proof from your event dashboard.'
        : 'Your payment proof is pending admin review.',
    })

    isModalOpen.value = false
    await router.push({
      path: '/UserEventDashboard',
      query: { eventId: event._id },
    })
  } catch (error) {
    const message = getApiErrorMessage(error)
    reportApiError(toast, { title: 'Could not create event', error })
    if (message.toLowerCase().includes('disabled')) {
      const previousSelection = selectedTierId.value
      await loadPriceTiers()
      const stillEnabled = availableTiers.value.some((tier) => tier._id === previousSelection)
      if (!stillEnabled) {
        selectedTierId.value = availableTiers.value[0]?._id ?? ''
      }
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UContainer class="space-y-8">
    <UPageCard
      title=""
      class="bread-container pt-5"
      :ui="{ title: 'text-3xl text-pretty font-bold text-highlighted font-serif' }"
    >
      <template #title>
        Welcome back, {{ welcomeName }}!
      </template>

      <div class="flex justify-between items-center">
        <div class="text-lg text-pretty text-muted">
          Let's get this bread!
        </div>
        <div>
          <UButton
            class="mx-3"
            icon="i-lucide-search"
            variant="outline"
          >
            Search Events
          </UButton>
          <UModal
            v-model="isModalOpen"
            title="Create New Event"
            :ui="{
              header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
              content: 'border-none ring-transparent w-1/4',
              overlay: 'bg-toast-900/30'
            }"
            :close="{
              variant: 'link',
              class: 'rounded-full text-white'
            }"
            :dismissible="false"
          >
            <UButton
              icon="i-lucide-user-plus"
              @click="isModalOpen = true"
            >
              Create New Event
            </UButton>
            <template #body>
              <UForm
                class="space-y-4"
                @submit.prevent="handleCreateEvent"
              >
                <UFormField
                  label="Event Name"
                  name="name"
                  required
                >
                  <UInput
                    v-model="form.eventName"
                    class="w-full"
                    placeholder="Jane & John's Wedding"
                  />
                </UFormField>
                <UFormField
                  label="Event Type"
                  name="type"
                  required
                >
                  <USelect
                    v-model="form.eventType"
                    :items="eventTypes"
                    class="w-full"
                  />
                </UFormField>
                <UCheckbox
                  v-if="isWeddingEvent"
                  v-model="form.isCatholicWedding"
                  label="Is this a Catholic Wedding?"
                />
                <UFormField
                  label="Event Date"
                  name="date"
                  required
                >
                  <UPopover>
                    <UButton
                      color="neutral"
                      variant="outline"
                      class="w-full"
                    >
                      {{ modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Select a date' }}
                    </UButton>

                    <template #content="{ close }">
                      <UCalendar
                        v-model="modelValue"
                        class="p-2"
                        :min-value="minEventDate"
                        @update:model-value="close"
                      />
                    </template>
                  </UPopover>
                </UFormField>
                <UFormField
                  label="Venue"
                  name="venue"
                  required
                >
                  <UInput
                    v-model="form.venue"
                    class="w-full"
                    placeholder="Manila Cathedral"
                  />
                </UFormField>
                <UFormField
                  label="Description"
                  name="description"
                  required
                >
                  <UTextarea
                    v-model="form.description"
                    class="w-full"
                    placeholder="Tell us more about your special day"
                  />
                </UFormField>
                <UFormField
                  label="Cover Image"
                  name="coverImage"
                  required
                >
                  <div class="flex items-center gap-3">
                    <UButton variant="solid" @click="coverImageInput?.click()">
                      Choose file
                    </UButton>
                    <span class="text-sm text-muted truncate">
                      {{ coverImageFile?.name || 'No file chosen' }}
                    </span>
                    <input
                      ref="coverImageInput"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      class="hidden"
                      @change="onCoverImageChange"
                    >
                  </div>
                </UFormField>

                <div class="rounded-lg border border-default p-3 space-y-3">
                  <div class="text-sm font-medium">
                    Choose your plan
                  </div>
                  <div v-if="isLoadingTiers" class="text-sm text-muted">
                    Loading price tiers...
                  </div>
                  <div v-else-if="availableTiers.length === 0" class="text-sm text-muted">
                    No price tiers are available right now.
                  </div>
                  <div v-else class="space-y-2">
                    <label
                      v-for="tier in availableTiers"
                      :key="tier._id"
                      class="flex cursor-pointer items-center justify-between rounded-md border border-default px-3 py-2"
                      :class="selectedTierId === tier._id ? 'border-primary bg-primary/5' : ''"
                    >
                      <div class="flex items-center gap-2">
                        <input
                          v-model="selectedTierId"
                          type="radio"
                          name="priceTier"
                          :value="tier._id"
                          class="accent-primary"
                        >
                        <span class="text-sm font-medium">{{ tier.name }}</span>
                      </div>
                      <span class="text-sm text-muted">
                        Php {{ tier.pricePhp.toLocaleString() }}
                      </span>
                    </label>
                  </div>
                </div>

                <div class="rounded-lg border border-default p-3 space-y-3">
                  <div class="text-sm font-medium">
                    Event creation fee: Php {{ selectedTierPrice.toLocaleString() }}
                  </div>
                  <UCheckbox
                    v-model="form.payLater"
                    label="Pay later (submit payment proof after creating the event)"
                  />
                  <template v-if="!form.payLater">
                    <UFormField
                      label="Payment Transaction ID"
                      name="transactionId"
                      required
                    >
                      <UInput
                        v-model="form.transactionId"
                        class="w-full"
                        placeholder="GCash / bank reference number"
                      />
                    </UFormField>
                    <UFormField
                      label="Proof of Payment"
                      name="proofOfPayment"
                      required
                    >
                      <div class="flex items-center gap-3">
                        <UButton variant="solid" @click="proofOfPaymentInput?.click()">
                          Choose file
                        </UButton>
                        <span class="text-sm text-muted truncate">
                          {{ proofOfPaymentFile?.name || 'No file chosen' }}
                        </span>
                        <input
                          ref="proofOfPaymentInput"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          class="hidden"
                          @change="onProofOfPaymentChange"
                        >
                      </div>
                    </UFormField>
                  </template>
                </div>

                <UButton
                  type="submit"
                  block
                  class="mt-4"
                  :loading="isSubmitting"
                >
                  Create Event
                </UButton>
              </UForm>
            </template>
          </UModal>
        </div>
      </div>
    </UPageCard>

    <UPageGrid>
      <template v-if="isLoadingEvents">
        <div
          v-for="n in 2"
          :key="`skeleton-${n}`"
          class="white-bread-container rounded-lg overflow-hidden"
        >
          <USkeleton class="aspect-[3/2] w-full rounded-none" />
          <div class="space-y-3 p-4">
            <USkeleton class="h-6 w-3/4" />
            <USkeleton class="h-4 w-1/2" />
            <USkeleton class="h-4 w-1/2" />
            <USkeleton class="h-10 w-full mt-4" />
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-for="event in userEvents"
          :key="event._id"
          class="white-bread-container rounded-lg"
        >
        <div class="aspect-[3/2] w-full overflow-hidden rounded-t-lg">
          <img
            :src="resolveEventCoverImageUrl(event.coverImageURL)"
            :alt="event.eventName"
            class="h-full w-full object-cover"
            @error="onCoverImageError"
          >
        </div>
        <div class="p-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <div class="flex items-start justify-between gap-2 pb-1 min-w-0">
            <div class="min-w-0 flex-1 text-lg font-semibold truncate">
              {{ event.eventName }}
            </div>
            <UBadge
              variant="subtle"
              size="sm"
              class="shrink-0"
            >
              {{ getPaymentStatusLabel(event) }}
            </UBadge>
          </div>
          <UPageFeature
            icon="i-lucide-tag"
            :title="formatEventPriceTier(event)"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-map-pin"
            :title="event.venue"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-calendar-heart"
            :title="formatEventDateLabel(event.eventDate)"
            :ui="{ title: 'font-normal' }"
          />
          <UButton
            block
            class="mt-6"
            :to="{ path: '/UserEventDashboard', query: { eventId: event._id } }"
          >
            Open Dashboard
          </UButton>
        </div>
        </div>
      </template>
    </UPageGrid>

    <p
      v-if="!isLoadingEvents && userEvents.length === 0"
      class="text-center text-sm text-muted"
    >
      No events yet — create one above.
    </p>

  </UContainer>
</template>

<style></style>
