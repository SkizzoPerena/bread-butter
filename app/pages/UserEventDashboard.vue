<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'event-navbar',
})

const value = ref(50)

const columns: TableColumn<Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'guests', header: 'Attendants' },
  { accessorKey: 'rsvpStatus', header: 'RSVP Status' },
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
}

const people = ref<Person[]>([
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    guests: 2,
    rsvpStatus: 'Attending',
    invitationSent: true,
  },
  {
    name: 'Emily White',
    email: 'emily.white@example.com',
    guests: 1,
    rsvpStatus: 'Pending',
    invitationSent: true,
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    guests: 4,
    rsvpStatus: 'Not Attending',
    invitationSent: false,
  }
])

const deleteUser = (userName: string) => alert(`This would delete ${userName}`)

</script>

<template>
  <UContainer class="space-y-8 pb-8" style="margin-top: var(--ui-header-height);">
    <UPageHeader class="border-none font-serif my-0" title="John & Jane's Wedding">
      <div class="flex gap-2 font-sans mt-2">
        <UButton icon="i-lucide-calendar" class="rounded-full px-4" variant="solid" disabled
          :ui="{ base: 'disabled:cursor-default' }">May 18, 2026</UButton>
        <UButton icon="i-lucide-map-pin" class="rounded-full px-4" variant="solid" disabled
          :ui="{ base: 'disabled:cursor-default' }">Manila Cathedral</UButton>
      </div>
    </UPageHeader>
    <UPageGrid>
      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-clipboard-check" size="xl" class="border-2 border-toast-500 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Task Tracker</div>
        <div class="flex items-center gap-2">
          <div class="font-bold text-2xl">2 / 4</div>
          <UBadge variant="subtle">50%</UBadge>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-wallet" size="xl" class="border-2 border-toast-500 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Budget Remaining</div>
        <div class="flex items-center gap-2">
          <div class="font-bold text-2xl">100,000</div>
          <UBadge variant="subtle">50%</UBadge>
        </div>
      </UPageCard>

      <UPageCard class="white-bread-container items-start">
        <UAvatar icon="i-lucide-globe" size="xl" class="border-2 border-toast-500 bg-toast-50" />
        <div class="text-md font-semibold -mb-2 uppercase text-muted">Website Manager</div>
        <div class="flex items-center gap-2">
          <div class="font-bold text-2xl">LIVE</div>
        </div>
      </UPageCard>
    </UPageGrid>

    <UPageCard class="white-bread-container space-y-4">
      <div class="text-lg text-pretty font-semibold text-muted">Guest List</div>
      <UPageGrid>
        <UPageCard class="bread-container bg-toast-50" title="100" description="Total Invitations Sent">
          <template #title>
            <div class="text-2xl font-bold">100</div>
          </template>
        </UPageCard>
        <UPageCard class="white-bread-container" title="75" description="Total Responses">
          <template #title>
            <div class="text-2xl font-bold">75</div>
          </template>
        </UPageCard>
        <UPageCard class="white-bread-container" title="60" description="Total Attendees">
          <template #title>
            <div class="text-2xl font-bold">60</div>
          </template>
        </UPageCard>
      </UPageGrid>
      <UTable :data="people" :columns="columns">
        <template #rsvpStatus-data="{ row }"> <!-- row is of type Row<Person> -->
          <USelectMenu v-model="row.original.rsvpStatus" :options="rsvpOptions" />
        </template>

        <template #invitationSent-data="{ row }"> <!-- row is of type Row<Person> -->
          <UBadge :label="row.original.invitationSent ? 'Yes' : 'No'"
            :color="row.original.invitationSent ? 'primary' : 'warning'" variant="subtle" />
        </template>

        <template #actions-data="{ row }"> <!-- row is of type Row<Person> -->
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="deleteUser(row.original.name)" />
        </template>
      </UTable>
    </UPageCard>
  </UContainer>

</template>

<style></style>