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


import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

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

const dashboardItems = [
  { label: 'Website', icon: 'i-lucide-globe' },
  { label: 'RSVP', icon: 'i-lucide-mail' },
  { label: 'Invitations', icon: 'i-lucide-send' },
  { label: 'Guest List', icon: 'i-lucide-users' },
  { label: 'Schedules', icon: 'i-lucide-calendar' },
  { label: 'Photos', icon: 'i-lucide-camera' },
  { label: 'Stationery', icon: 'i-lucide-pen-tool' },
  { label: 'Settings', icon: 'i-lucide-settings' },
  { label: 'Tasks', icon: 'i-lucide-list-todo' }
]

</script>

<template>
  <UMain class="">

    <UPageGrid>
      <UContainer class="col-span-2">
<div class="flex items-center justify-center h-full">
        <UPageColumns :ui="{base: 'gap-25 space-y-3'}">
          
          <div v-for="item in dashboardItems" :key="item.label" role="button" tabindex="0"
            class="group flex flex-col items-center justify-center aspect-square w-fit h-fit p-4 cursor-pointer rounded-xl focus-visible:outline-none">
            <div
              class=" p-2 aspect-square flex flex-col  items-center justify-center rounded-full bg-primary transition-all duration-200 group-hover:bg-primary/80 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-primary">
              <UIcon :name="item.icon" class="size-9 m-2 text-white" />
            </div>
            <div class="font-medium mt-3">{{ item.label }}</div>
          </div>
        </UPageColumns>
</div>
      </UContainer>

      <!-- Tasks Container -->
      <UScrollArea class="h-[calc(100vh-64px)] py-6">
        <UContainer class=" space-y-4">
          <div class="flex justify-between">
            <div class="text-xl font-bold text-muted uppercase">Tasks Checklist</div>

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

              </div>
            </template>
            <template #ongoing="{ item }">
              <div class="mt-4">

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

              </div>
            </template>
            <template #completed="{ item }">
              <div class="mt-4">

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

              </div>
            </template>
          </UTabs>

        </UContainer>
      </UScrollArea>
    </UPageGrid>
  </UMain>

</template>

<style></style>