<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'event-navbar',
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


import { DateFormatter, getLocalTimeZone } from '@internationalized/date'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

const editEventDate = ref()
const newTaskDate = ref()

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
          <h1 class="text-3xl sm:text-4xl font-bold">
            Jane & John's Wedding
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
                      <UButton color="neutral" variant="outline" class="w-full" icon="i-heroicons-calendar-days-20-solid">
                        {{ editEventDate ? df.format(editEventDate) : 'Select a date' }}
                      </UButton>

                      <template #content="{ close }">
                        <UCalendar v-model="editEventDate" @update:model-value="close" />
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

                <UButton to="/user/event-dashboard" block class="mt-4">
                  Save Changes
                </UButton>
              </UForm>
            </template>
          </UModal>
        </div>
      </template>
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
                    <UButton color="neutral" variant="outline" class="w-full" icon="i-heroicons-calendar-days-20-solid">
                      {{ newTaskDate ? df.format(newTaskDate) : 'Select a date' }}
                    </UButton>

                    <template #content="{ close }">
                      <UCalendar v-model="newTaskDate" class="p-2" @update:model-value="close" />
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