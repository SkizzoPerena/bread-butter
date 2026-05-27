<script lang="ts" setup>
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { TabsItem } from '@nuxt/ui'
import { mapEventTypeToApi } from '~/types/event'
import { EVENT_CREATION_FEE_PHP } from '~/types/payment'
import { getApiErrorMessage } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'user-navbar',
})

const toast = useToast()
const router = useRouter()
const { user } = useAuth()
const { createEvent } = useEvents()

const isModalOpen = ref(false)
const isSubmitting = ref(false)

const eventTypes = ['Wedding', 'Engagement', 'Baptism', 'Birthday Party', 'Family Reunion', 'Gender Reveal Party']

const form = reactive({
  eventName: '',
  eventType: 'Wedding',
  description: '',
  venue: '',
  payLater: false,
  transactionId: '',
})

const coverImageFile = ref<File | null>(null)
const proofOfPaymentFile = ref<File | null>(null)
const coverImageInput = ref<HTMLInputElement | null>(null)
const proofOfPaymentInput = ref<HTMLInputElement | null>(null)

const minEventDate = today(getLocalTimeZone()).add({ months: 1 })
const modelValue = shallowRef(new CalendarDate(minEventDate.year, minEventDate.month, minEventDate.day))

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

const welcomeName = computed(() => user.value?.firstName ?? 'Jane')

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

const value = ref(50)

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
      coverImage: coverImageFile.value,
      payLater: form.payLater,
      transactionId: form.payLater ? undefined : form.transactionId.trim(),
      proofOfPayment: form.payLater ? undefined : proofOfPaymentFile.value ?? undefined,
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
    toast.add({
      title: 'Could not create event',
      description: getApiErrorMessage(error),
      color: 'error',
    })
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
                    Event creation fee: Php {{ EVENT_CREATION_FEE_PHP.toLocaleString() }}
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

    <UPageGrid class="">
      <div class="white-bread-container rounded-lg">
        <img
          src="../assets/bpb-images/wedding-1.jpg"
          class="w-full rounded-t-lg"
          width="600"
          height="400"
          fit="cover"
        >
        <div class="p-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <div class="text-lg font-semibold pb-1">
            Jane & John's Wedding
          </div>
          <UPageFeature
            icon="i-lucide-map-pin"
            title="Manila Cathedral"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-calendar-heart"
            title="May 03, 2026"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-piggy-bank"
            title="Php 5,000,000"
            :ui="{ title: 'font-normal' }"
          />
          <USeparator class="my-3" />
          <div class="flex justify-between">
            <div>Tasks Accomplished</div>
            <div>2/4</div>
          </div>
          <UProgress
            v-model="value"
            :max="100"
            class="mt-2"
          />
          <UButton
            block
            class="mt-6"
            to="/UserEventDashboard"
          >
            Open Dashboard
          </UButton>
        </div>
      </div>

      <div class=" white-bread-container rounded-lg">
        <img
          src="../assets/bpb-images/wedding-1.jpg"
          class="w-full rounded-t-lg"
          width="600"
          height="400"
          fit="cover"
        >
        <div class="p-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <div class="text-lg font-semibold pb-1">
            Jane & John's Wedding
          </div>
          <UPageFeature
            icon="i-lucide-map-pin"
            title="Manila Cathedral"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-calendar-heart"
            title="May 03, 2026"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-piggy-bank"
            title="Php 5,000,000"
            :ui="{ title: 'font-normal' }"
          />
          <USeparator class="my-3" />
          <div class="flex justify-between">
            <div>Tasks Accomplished</div>
            <div>2/4</div>
          </div>
          <UProgress
            v-model="value"
            :max="100"
            class="mt-2"
          />
          <UButton
            block
            class="mt-6"
            to="/UserEventDashboard"
          >
            Open Dashboard
          </UButton>
        </div>
      </div>

      <div class="white-bread-container rounded-lg">
        <img
          src="../assets/bpb-images/wedding-1.jpg"
          class="w-full rounded-t-lg"
          width="600"
          height="400"
          fit="cover"
        >
        <div class="p-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <div class="text-lg font-semibold pb-1">
            Jane & John's Wedding
          </div>
          <UPageFeature
            icon="i-lucide-map-pin"
            title="Manila Cathedral"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-calendar-heart"
            title="May 03, 2026"
            :ui="{ title: 'font-normal' }"
          />
          <UPageFeature
            icon="i-lucide-piggy-bank"
            title="Php 5,000,000"
            :ui="{ title: 'font-normal' }"
          />
          <USeparator class="my-3 " />
          <div class="flex justify-between">
            <div>Tasks Accomplished</div>
            <div>2/4</div>
          </div>
          <UProgress
            v-model="value"
            :max="100"
            class="mt-2"
          />
          <UButton
            block
            class="mt-6"
            to="/UserEventDashboard"
          >
            Open Dashboard
          </UButton>
        </div>
      </div>
    </UPageGrid>

    <div class="h-1000" />
  </UContainer>
</template>

<style></style>
