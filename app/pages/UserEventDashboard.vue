<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import {
  isPaymentPendingReview,
  needsPaymentSubmission
} from '~/types/payment'
import { getApiErrorMessage } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { usePayments } from '~/composables/usePayments'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

definePageMeta({
  layout: 'event-navbar',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { submitEventPaymentProof } = usePayments()
const { isUiOnlyMode, loadPageData } = useApiMode()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)
const isSubmittingPayment = ref(false)

const paymentForm = reactive({
  transactionId: '',
})
const proofOfPaymentFile = ref<File | null>(null)
const proofOfPaymentInput = ref<HTMLInputElement | null>(null)

const showPaymentProofForm = computed(() =>
  eventRecord.value ? needsPaymentSubmission(eventRecord.value.latestPayment) : false
)

const paymentPendingReview = computed(() =>
  eventRecord.value ? isPaymentPendingReview(eventRecord.value.latestPayment) : false
)

const paymentDenialReason = computed(() =>
  eventRecord.value?.latestPayment?.status === 'DENIED'
    ? eventRecord.value.latestPayment.denialReason
    : ''
)

const useDemoFallbacks = computed(() => !eventId.value || isUiOnlyMode.value)

const eventTitle = computed(() => {
  if (eventRecord.value?.eventName) {
    return eventRecord.value.eventName
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return "Jane & John's Wedding"
  }
  return ''
})

const eventVenue = computed(() => {
  if (eventRecord.value?.venue) {
    return eventRecord.value.venue
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return 'Manila Cathedral'
  }
  return ''
})

const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  if (dateValue) {
    return df.format(new Date(dateValue))
  }
  if (eventId.value && isLoadingEvent.value) {
    return ''
  }
  if (useDemoFallbacks.value) {
    return 'May 18, 2026'
  }
  return ''
})

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }

  isLoadingEvent.value = true
  eventRecord.value = null
  try {
    eventRecord.value = await loadPageData({
      mock: () => ({
        _id: 'mock-event-id',
        eventType: 'WEDDING',
        eventName: "Jane & John's Wedding",
        description: 'Mock event',
        venue: 'Manila Cathedral',
        eventDate: '2026-05-18T00:00:00.000Z',
        status: 'ONGOING',
        latestPayment: null,
      }),
      fetch: async () => fetchEvent(eventId.value),
    })
  } catch (error) {
    toast.add({
      title: 'Could not load event',
      description: getApiErrorMessage(error),
      color: 'error',
    })
  } finally {
    isLoadingEvent.value = false
  }
}

function onProofOfPaymentChange(changeEvent: Event) {
  const input = changeEvent.target as HTMLInputElement
  proofOfPaymentFile.value = input.files?.[0] ?? null
}

async function handleSubmitPaymentProof() {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({ title: 'Missing event', description: 'Open an event from your dashboard first.', color: 'error' })
    return
  }
  if (!paymentForm.transactionId.trim()) {
    toast.add({ title: 'Transaction ID required', color: 'error' })
    return
  }
  if (!proofOfPaymentFile.value) {
    toast.add({ title: 'Proof of payment required', color: 'error' })
    return
  }

  isSubmittingPayment.value = true
  try {
    const updatedEvent = await submitEventPaymentProof(eventId.value || 'mock-event-id', {
      transactionId: paymentForm.transactionId.trim(),
      proofOfPayment: proofOfPaymentFile.value,
    })
    eventRecord.value = updatedEvent
    paymentForm.transactionId = ''
    proofOfPaymentFile.value = null
    toast.add({
      title: 'Payment proof submitted',
      description: 'An admin will review your payment shortly.',
    })
  } catch (error) {
    toast.add({
      title: 'Could not submit payment proof',
      description: getApiErrorMessage(error),
      color: 'error',
    })
  } finally {
    isSubmittingPayment.value = false
  }
}

onMounted(() => {
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})

const UBadge = resolveComponent('UBadge')

const columns: TableColumn<Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'guests', header: 'Attendants' },
  {
    accessorKey: 'rsvpStatus',
    header: 'RSVP Status',
    cell: ({ row }) => {
      const color = {
        Attending: 'success' as const,
        'Not Attending': 'error' as const,
        Pending: 'secondary' as const
      }[row.getValue('rsvpStatus') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('rsvpStatus')
      )
    }
  },
  { accessorKey: 'invitationSent', header: 'Invitation Sent' },
  { accessorKey: 'actions', header: '' }
]

const rsvpOptions = ['Attending', 'Pending', 'Not Attending'] as const

type Person = {
  name: string
  email: string
  guests: number
  rsvpStatus: typeof rsvpOptions[number]
  invitationSent: boolean
  phone: number
}

const people = ref<Person[]>([
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    guests: 2,
    rsvpStatus: 'Attending',
    invitationSent: true,
    phone: 1234567890,
  },
  {
    name: 'Emily White',
    email: 'emily.white@example.com',
    guests: 1,
    rsvpStatus: 'Pending',
    invitationSent: true,
    phone: 2345678901,
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    guests: 4,
    rsvpStatus: 'Not Attending',
    invitationSent: false,
    phone: 345 - 678 - 9012,
  }
])

const deleteUser = (userName: string) => alert(`This would delete ${userName}`)


const prefix = ref(['Mr.', 'Mrs.', 'Ms.', 'Mx.'])

const taskPriorities = ['Urgent', 'Medium', 'Low']

const modelValue = shallowRef(new CalendarDate(2015, 7, 23))

const tabItems = [
  {
    label: 'To Do',
    slot: 'todo'
  },
  {
    label: 'Ongoing',
    slot: 'ongoing'
  },
  {
    label: 'Completed',
    slot: 'completed'
  }
]

</script>

<template>
  <UContainer class="space-y-8 pb-8">
    <UPageHeader class="border-none font-serif my-0">
      <template #title>
        <div class="flex justify-between items-center">
          <USkeleton
            v-if="isLoadingEvent && eventId"
            class="h-10 w-64"
          />
          <h1
            v-else
            class="text-3xl sm:text-4xl font-bold"
          >
            {{ eventTitle }}
          </h1>
          <UModal title="Edit Event" :ui="{
            header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
            content: 'border-none ring-transparent w-1/4',
            overlay: 'bg-toast-900/30'
          }" :close="{
            variant: 'link',
            class: 'rounded-full text-white'
          }" :dismissible="false">
            <UButton icon="i-lucide-pen" variant="ghost" class=" mx-2"></UButton>
            <template #body>
              <UForm class="space-y-4">
                <UFormField label="Event Name" name="name" required>
                  <UInput class="w-full" placeholder="Jane & John's Wedding" />
                </UFormField>

                <UFieldGroup class="w-full space-x-3">
                  <UFormField label="Event Date" name="date" required class="w-1/2">
                    <UPopover>
                      <UButton color="neutral" variant="outline" class="w-full">
                        Select a date
                      </UButton>

                      <template #content="{ close }">
                        <UCalendar class="p-2" @update:model-value="close" />
                      </template>
                    </UPopover>
                  </UFormField>

                  <UFormField label="Budget" name="budget" required class="w-1/2">
                    <UInputNumber :increment="false" :decrement="false" class="w-full" />
                  </UFormField>
                </UFieldGroup>
                <UFormField label="Description" name="description" required>
                  <UTextarea class="w-full" placeholder="Tell us more about your special day" />
                </UFormField>

                <UButton to="/UserEventDashboard" block class="mt-4">
                  Save Changes
                </UButton>
              </UForm>
            </template>
          </UModal>
        </div>
      </template>
      <div class="flex gap-2 font-sans mt-2">
        <UButton icon="i-lucide-calendar" class="rounded-full px-4" variant="subtle" disabled
          :ui="{ base: 'disabled:cursor-default' }">{{ eventDateLabel }}</UButton>
        <UButton icon="i-lucide-map-pin" class="rounded-full px-4" variant="subtle" disabled
          :ui="{ base: 'disabled:cursor-default' }">{{ eventVenue }}</UButton>
      </div>
    </UPageHeader>

    <UPageCard
      v-if="showPaymentProofForm"
      class="white-bread-container border border-warning/30"
      title="Payment proof required"
      description="Submit your event creation fee payment to unlock all event features."
    >
      <UAlert
        v-if="paymentDenialReason"
        color="error"
        variant="subtle"
        title="Previous payment was denied"
        :description="paymentDenialReason"
        class="mb-4"
      />
      <UForm
        class="space-y-4 max-w-lg"
        @submit.prevent="handleSubmitPaymentProof"
      >
        <UFormField
          label="Payment Transaction ID"
          name="transactionId"
          required
        >
          <UInput
            v-model="paymentForm.transactionId"
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
        <UButton
          type="submit"
          :loading="isSubmittingPayment"
        >
          Submit payment proof
        </UButton>
      </UForm>
    </UPageCard>

    <UPageCard
      v-else-if="paymentPendingReview"
      class="white-bread-container border border-info/30"
      title="Payment pending review"
      description="Your payment proof has been submitted and is awaiting admin approval."
    />

    <UPageGrid>
      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-clipboard-check" size="xl" class="ring ring-inset ring-primary/25 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Task Tracker</div>
        <div class="flex items-center gap-2">
          <div class="font-bold text-2xl">2 / 4</div>
          <UBadge variant="subtle">50%</UBadge>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-wallet" size="xl" class="ring ring-inset ring-primary/25 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Budget Remaining</div>
        <div class="flex items-center gap-2">
          <div class="font-bold text-2xl">100,000</div>
          <UBadge variant="subtle">50%</UBadge>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-globe" size="xl" class="ring ring-inset ring-primary/25 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Website Manager</div>
        <div class="flex items-center gap-2">
          <div class="font-bold text-2xl">LIVE</div>
        </div>
      </UPageCard>
    </UPageGrid>

    <UPageCard class="white-bread-container space-y-4">
      <div class="flex justify-between">
        <div class="text-xl text-pretty font-semibold text-muted uppercase">Guest List</div>

        <div class="space-x-2">
          <UButton to="/RSVPMakerCopy"  icon="i-lucide-calendar">RSVP Maker</UButton>

        <!-- Add Guest Modal Start -->

          <UModal title="Add Guest" :ui="{
            header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
            content: 'border-none ring-transparent w-1/4',
            overlay: 'bg-toast-900/30'
          }" :close="{
          variant: 'link',
          class: 'rounded-full text-white'
        }" :dismissible="false">
            <UButton icon="i-lucide-user-plus">Add Guest</UButton>
            <template #body>
              <UForm class="space-y-4">
                <div class="mb-1 text-sm font-medium">Name <span class="text-error">*</span></div>
                <UFieldGroup label="Name" name="name" required class="w-full">
                  <USelect :items="prefix" />
                  <UInput placeholder="Juan Dela Cruz" class="w-full" />
                </UFieldGroup>
                <UFormField label="Email" name="email" required>
                  <UInput type="email" class="w-full" placeholder="jdelacruz@example.com" />
                </UFormField>
                <UFormField label="Phone Number" name="phone" required>
                  <UInputNumber type="tel" class="w-full" placeholder="09123456789" :increment="false"
                    :decrement="false" />
                </UFormField>

                <UButton type="submit" block class="mt-4">
                  Add Guest
                </UButton>
              </UForm>
            </template>
          </UModal>

          <!-- Add Guest Modal End -->
        </div>
      </div>
      <UPageGrid>
        <UPageCard class="bg-toast-50 ring ring-inset ring-primary/25" title="100" description="Total Invitations Sent"
          :ui="{ title: 'text-primary', description: 'text-toast-400' }">
          <template #title>
            <div class="text-2xl font-bold">100</div>
          </template>
        </UPageCard>
        <UPageCard class="bg-toast-50 ring ring-inset ring-primary/25" title="75" description="Total Responses"
          :ui="{ title: 'text-primary', description: 'text-toast-400' }">
          <template #title>
            <div class="text-2xl font-bold">75</div>
          </template>
        </UPageCard>
        <UPageCard class="bg-toast-50 ring ring-inset ring-primary/25" title="60" description="Total Attendees"
          :ui="{ title: 'text-primary', description: 'text-toast-400' }">
          <template #title>
            <div class="text-2xl font-bold">60</div>
          </template>
        </UPageCard>
      </UPageGrid>
      <UTable :data="people" :columns="columns">

      </UTable>
    </UPageCard>

    <!-- Tasks Container -->
    <UPageCard class="white-bread-container space-y-4">
      <div class="flex justify-between">
        <div class="text-xl text-pretty font-semibold text-muted uppercase">Tasks Checklist</div>

        <!-- Add Task Modal Start -->

        <UModal title="Add New Task" :ui="{
          header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
          content: 'border-none ring-transparent w-1/3',
          overlay: 'bg-toast-900/30'
        }" :close="{
          variant: 'link',
          class: 'rounded-full text-white'
        }" :dismissible="false">
          <UButton icon="i-lucide-list-plus">Add New Task</UButton>
          <template #body>
            <UForm class="space-y-4">
              <UFormField label="Task name" name="task-name" required>
                <UInput class="w-full" placeholder="Set an appointment" />
              </UFormField>
              <UFormField label="Description" name="description" required>
                <UTextarea class="w-full" placeholder="Drop your notes here" />
              </UFormField>
              <UFieldGroup class="w-full gap-2">
                <UFormField label="Priority" name="priority" required class="w-1/3">
                  <USelect :items="taskPriorities" placeholder="Select priority" class="w-full" />
                </UFormField>
                <UFormField label="Budget" name="budget" required class="w-1/3">
                  <UInputNumber :increment="false" :decrement="false" class="w-full" placeholder="in Php" />
                </UFormField>
                <UFormField label="Event Date" name="date" required class="w-1/3">
                  <UPopover>
                    <UButton color="neutral" variant="outline" class="w-full">
                      {{ modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Select a date' }}
                    </UButton>

                    <template #content="{ close }">
                      <UCalendar v-model="modelValue" class="p-2" @update:model-value="close" />
                    </template>
                  </UPopover>
                </UFormField>
              </UFieldGroup>

              <UFormField class="w-full" label="Supplementary File / Photo">
                <UFileUpload size="xl" variant="area" label="Drop your image here"
                  description="SVG, PNG, JPG or GIF (max. 2MB)" />
              </UFormField>
              <UButton type="submit" block class="mt-4">
                Add Task
              </UButton>
            </UForm>
          </template>
        </UModal>

        <!-- Add Task Modal End -->


      </div>
      <UTabs :items="tabItems" variant="link">
        <template #todo="{ item }">
          <div class="mt-4">
            <UPageColumns>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Book a photo booth</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Find and book a photo booth service for the reception. Get quotes from at least 3 vendors.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Jun 15, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 20,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Finalize catering menu</div>
                  <UBadge color="secondary" variant="subtle">Medium</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Confirm final menu choices with the caterer and provide a final guest count.
                </p>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Send out wedding invitations</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Design, print, and mail the wedding invitations to all guests on the list.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Jul 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 15,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Choose wedding cake flavor</div>
                  <UBadge color="secondary" variant="subtle">Medium</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Schedule a tasting with the bakery and decide on the final cake flavor and design.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Aug 10, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 10,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Arrange guest transportation</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>

                <p class="text-sm text-muted mt-1">
                  Look into shuttle services or carpooling options for out-of-town guests.
                </p>

                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Sep 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 5,000</span>
                  </div>
                </div>

                <UButton block>Mark as Ongoing</UButton>

              </UPageCard>
            </UPageColumns>
          </div>
        </template>
        <template #ongoing="{ item }">
          <div class="mt-4">
            <UPageColumns>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Coordinate with florist</div>
                  <UBadge color="secondary" variant="subtle">Medium</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Confirm flower arrangements, delivery schedule, and final payment with the florist.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Oct 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 30,000</span>
                  </div>
                </div>
                <UButton block class="mt-4">Mark as Complete</UButton>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Trial hair and makeup</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Schedule and attend hair and makeup trials for the bride and bridesmaids.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Sep 20, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 8,000</span>
                  </div>
                </div>
                <UButton block class="mt-4">Mark as Complete</UButton>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Purchase wedding rings</div>
                  <UBadge color="error" variant="subtle">Urgent</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Select and purchase wedding bands for the couple.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Due: Aug 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 100,000</span>
                  </div>
                </div>
                <UButton block class="mt-4">Mark as Complete</UButton>
              </UPageCard>
            </UPageColumns>
          </div>
        </template>
        <template #completed="{ item }">
          <div class="mt-4">
            <UPageColumns>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Book wedding venue</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Secured the main wedding venue and paid the deposit.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Completed: Jan 10, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 200,000</span>
                  </div>
                </div>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Create guest list draft</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Initial draft of the guest list has been compiled.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Completed: Feb 1, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 0</span>
                  </div>
                </div>
              </UPageCard>
              <UPageCard class="white-bread-container">
                <div class="flex justify-between items-start">
                  <div class="font-semibold">Engagement photoshoot</div>
                  <UBadge color="success" variant="subtle">Low</UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  Successfully completed the engagement photoshoot.
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-4">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-clock" class="text-muted" />
                    <span>Completed: Mar 5, 2025</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-wallet" class="text-muted" />
                    <span>Budget: Php 12,000</span>
                  </div>
                </div>
              </UPageCard>
            </UPageColumns>
          </div>
        </template>
      </UTabs>

    </UPageCard>

  </UContainer>

</template>

<style></style>