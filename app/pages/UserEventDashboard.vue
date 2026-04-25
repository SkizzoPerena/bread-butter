<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'event-navbar',
})

const value = ref(50)

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

const isModalOpen = ref(false)

const guestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Must be at least 10 characters'),
})

type GuestSchema = z.output<typeof guestSchema>

const newGuestState = reactive<GuestSchema>({
  name: '',
  email: '',
  phone: '',
})

type Person = {
  name: string
  email: string
  guests: number
  rsvpStatus: typeof rsvpOptions[number]
  invitationSent: boolean
  phone: string
}

const people = ref<Person[]>([
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    guests: 2,
    rsvpStatus: 'Attending',
    invitationSent: true,
    phone: '123-456-7890',
  },
  {
    name: 'Emily White',
    email: 'emily.white@example.com',
    guests: 1,
    rsvpStatus: 'Pending',
    invitationSent: true,
    phone: '234-567-8901',
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    guests: 4,
    rsvpStatus: 'Not Attending',
    invitationSent: false,
    phone: '345-678-9012',
  }
])

const deleteUser = (userName: string) => alert(`This would delete ${userName}`)

async function addGuest(event: FormSubmitEvent<GuestSchema>) {
  people.value.push({
    ...event.data,
    guests: 1,
    rsvpStatus: 'Pending',
    invitationSent: false,
  })
  isModalOpen.value = false
  newGuestState.name = ''
  newGuestState.email = ''
  newGuestState.phone = ''
}

</script>

<template>
  <UContainer class="space-y-8 pb-8">
    <UPageHeader class="border-none font-serif my-0" title="Jane & John's Wedding">
      <div class="flex gap-2 font-sans mt-2">
        <UButton icon="i-lucide-calendar" class="rounded-full px-4" variant="subtle" disabled
          :ui="{ base: 'disabled:cursor-default' }">May 18, 2026</UButton>
        <UButton icon="i-lucide-map-pin" class="rounded-full px-4" variant="subtle" disabled
          :ui="{ base: 'disabled:cursor-default' }">Manila Cathedral</UButton>
      </div>
    </UPageHeader>
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


        <!-- Add Guest Modal Start -->

        <UModal v-model="isModalOpen" title="Add Guest" :ui="{
          header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
          content: 'border-none ring-transparent w-1/4',
          overlay: 'bg-toast-900/30'
        }" :close="{
        variant: 'link',
        class: 'rounded-full text-white'
      }"
      
      :dismissible="false">
          <UButton icon="i-lucide-user-plus" @click="isModalOpen = true">Add Guest</UButton>
          <template #body>



            <UForm :schema="guestSchema" :state="newGuestState" class="space-y-4" @submit="addGuest">
              <UFormField label="Name" name="name" required>
                <UInput v-model="newGuestState.name"  class="w-full"/>
              </UFormField>
              <UFormField label="Email" name="email" required>
                <UInput v-model="newGuestState.email" type="email" class="w-full"/>
              </UFormField>
              <UFormField label="Phone Number" name="phone" required>
                <UInput v-model="newGuestState.phone" type="tel"  class="w-full"/>
              </UFormField>

              <UButton type="submit" block class="mt-4">
                Add Guest
              </UButton>
            </UForm>

          </template>
        </UModal>

        <!-- Add Guest Modal End -->

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

  </UContainer>

</template>

<style></style>