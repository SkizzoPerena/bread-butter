<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import type { EventRecord, GuestRecord, RsvpSummary } from '~/types/event'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { addGuestSchema } from '~/composables/useEventGuestsManager'

const props = defineProps<{
  eventId: string
  eventRecord: EventRecord | null
  isEventCancelled?: boolean
}>()

const rsvpSummary = defineModel<RsvpSummary | null>('rsvpSummary', { default: null })
const guestList = defineModel<GuestRecord[]>('guestList', { default: () => [] })
const isLoadingGuests = defineModel<boolean>('isLoadingGuests', { default: false })

const eventIdRef = toRef(props, 'eventId')
const eventRecordRef = toRef(props, 'eventRecord')
const isEventCancelledRef = toRef(props, 'isEventCancelled')

const UBadge = resolveComponent('UBadge')

const {
  isUiOnlyMode,
  isAddGuestModalOpen,
  isSubmittingGuest,
  sendingGuestId,
  isInvitingAll,
  deletingGuestId,
  isRemoveGuestModalOpen,
  guestToRemove,
  isNoQuestionsWarningOpen,
  addGuestState,
  mutationsDisabled,
  tableRows,
  isGuestListEmpty,
  invitationsSentCount,
  canInviteAll,
  rsvpStats,
  handleAddGuest,
  openRemoveGuestModal,
  closeRemoveGuestModal,
  handleRemoveGuest,
  handleInviteAll,
  handleSendGuestInvite,
  confirmInviteWithoutQuestions,
} = useEventGuestsManager({
  eventId: eventIdRef,
  eventRecord: eventRecordRef,
  isEventCancelled: isEventCancelledRef,
  rsvpSummary,
  guestList,
  isLoadingGuests,
  autoLoadGuests: false,
})

const guestModalUi = {
  header: 'bg-toast-400 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md',
  overlay: 'bg-toast-900/30',
}

const bulkAddLink = computed(() => ({
  path: '/AddGuestsBulk',
  query: props.eventId ? { eventId: props.eventId } : {},
}))

const rsvpMakerLink = computed(() => ({
  path: '/RSVPMaker',
  query: props.eventId ? { eventId: props.eventId } : {},
}))

const columns: TableColumn<GuestTableRow>[] = [
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
        Pending: 'secondary' as const,
      }[row.getValue('rsvpStatus') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('rsvpStatus')
      )
    },
  },
  {
    accessorKey: 'invitationSent',
    header: 'Invitation Sent',
    cell: ({ row }) => (row.getValue('invitationSent') ? 'Yes' : 'No'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const person = row.original
      const canSendInvite =
        !person.invitationSent && !mutationsDisabled.value
      const canRemove = !mutationsDisabled.value

      return h('div', { class: 'flex items-center justify-end gap-1' }, [
        canSendInvite
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'primary',
              icon: 'i-lucide-send',
              loading: sendingGuestId.value === person.guestId,
              disabled: isInvitingAll.value,
              'aria-label': 'Send invitation',
              onClick: () => handleSendGuestInvite(person.guestId),
            })
          : null,
        canRemove
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'error',
              icon: 'i-lucide-trash-2',
              loading: deletingGuestId.value === person.guestId,
              'aria-label': 'Remove guest',
              onClick: () => openRemoveGuestModal(person),
            })
          : null,
      ])
    },
  },
]
</script>

<template>
  <UPageCard class="white-bread-container space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="text-xl font-semibold uppercase text-muted">Guest List</div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          :to="rsvpMakerLink"
          icon="i-lucide-calendar"
          variant="outline"
        >
          RSVP Maker
        </UButton>
        <UButton
          :to="bulkAddLink"
          icon="i-lucide-users"
          variant="outline"
          :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
        >
          Bulk Add
        </UButton>
        <UButton
          icon="i-lucide-mail"
          variant="outline"
          :disabled="!canInviteAll"
          :loading="isInvitingAll"
          @click="handleInviteAll"
        >
          Invite All
        </UButton>
        <UButton
          icon="i-lucide-user-plus"
          :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
          @click="isAddGuestModalOpen = true"
        >
          Add Guest
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="mutationsDisabled"
      color="warning"
      variant="subtle"
      title="Event cancelled"
      description="The guest list cannot be modified for a cancelled event."
    />

    <UPageGrid>
      <UPageCard
        class="bg-toast-50 ring ring-inset ring-primary/25"
        description="Total Invitations Sent"
        :ui="{ title: 'text-primary', description: 'text-toast-400' }"
      >
        <template #title>
          <div class="text-2xl font-bold">{{ invitationsSentCount }}</div>
        </template>
      </UPageCard>
      <UPageCard
        class="bg-toast-50 ring ring-inset ring-primary/25"
        description="Total Responses"
        :ui="{ title: 'text-primary', description: 'text-toast-400' }"
      >
        <template #title>
          <div class="text-2xl font-bold">{{ rsvpStats.responses }}</div>
        </template>
      </UPageCard>
      <UPageCard
        class="bg-toast-50 ring ring-inset ring-primary/25"
        description="Total Attendees"
        :ui="{ title: 'text-primary', description: 'text-toast-400' }"
      >
        <template #title>
          <div class="text-2xl font-bold">{{ rsvpStats.attendees }}</div>
        </template>
      </UPageCard>
    </UPageGrid>

    <div
      v-if="isLoadingGuests"
      class="flex items-center justify-center py-12 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading guests...</span>
    </div>

    <div
      v-else-if="isGuestListEmpty"
      class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
    >
      <UIcon name="i-lucide-users" class="size-10 text-muted" />
      <p class="mt-4 text-base font-medium">No guests yet</p>
      <p class="mt-1 max-w-sm text-sm text-muted">
        Add guests one at a time or use Bulk Add to import your list and start sending invitations.
      </p>
      <div
        v-if="!mutationsDisabled"
        class="mt-6 flex flex-wrap items-center justify-center gap-2"
      >
        <UButton
          icon="i-lucide-user-plus"
          @click="isAddGuestModalOpen = true"
        >
          Add Guest
        </UButton>
        <UButton
          :to="bulkAddLink"
          icon="i-lucide-users"
          variant="outline"
        >
          Bulk Add
        </UButton>
      </div>
    </div>

    <UTable
      v-else
      :data="tableRows"
      :columns="columns"
    />

    <UModal
      v-model:open="isAddGuestModalOpen"
      title="Add Guest"
      :ui="guestModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmittingGuest"
    >
      <template #body>
        <UForm
          :schema="addGuestSchema"
          :state="addGuestState"
          class="space-y-4"
          @submit="handleAddGuest"
        >
          <UFormField label="Name" name="name" required>
            <UInput
              v-model="addGuestState.name"
              class="w-full"
              placeholder="Juan Dela Cruz"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UFormField label="Email" name="email" required>
            <UInput
              v-model="addGuestState.email"
              type="email"
              class="w-full"
              placeholder="jdelacruz@example.com"
              :disabled="mutationsDisabled"
            />
          </UFormField>
          <UButton
            type="submit"
            block
            class="mt-4"
            :loading="isSubmittingGuest"
            :disabled="mutationsDisabled"
          >
            Add Guest
          </UButton>
        </UForm>
      </template>
    </UModal>

    <UModal
      v-model:open="isRemoveGuestModalOpen"
      title="Remove guest"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
      :dismissible="!deletingGuestId"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          Remove
          <span class="font-medium text-highlighted">{{ guestToRemove?.name }}</span>
          from the guest list?
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Back"
            color="neutral"
            variant="outline"
            :disabled="Boolean(deletingGuestId)"
            @click="closeRemoveGuestModal"
          />
          <UButton
            label="Remove guest"
            color="error"
            :loading="Boolean(deletingGuestId)"
            @click="handleRemoveGuest"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isNoQuestionsWarningOpen"
      title="No RSVP questions"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          This event has no RSVP questions configured. Invitations may not collect
          meaningful responses until you set up RSVP questions in RSVP Maker.
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="isNoQuestionsWarningOpen = false"
          />
          <UButton
            label="Send anyway"
            color="primary"
            @click="confirmInviteWithoutQuestions"
          />
        </div>
      </template>
    </UModal>
  </UPageCard>
</template>
