<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({
  layout: 'user-navbar',
})


const isModalOpen = ref(false)

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

const eventTypes = ref(['Wedding', 'Engagement', 'Baptism', 'Birthday Party', 'Family Reunion', 'Gender Reveal Party'])
const selectValue = ref('Wedding')

import type { TabsItem } from '@nuxt/ui'

import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

const modelValue = shallowRef(new CalendarDate(2015, 7, 23))

const value = ref(50)
</script>

<template>
  <UContainer class="space-y-8">
    <!-- all containers should have mb-12 pb-0 for uniform borders, all containers WITHIN a container should have mb-8 pb-0 for uniform borders -->

    <UPageCard title="Welcome back, Jane!" class="bread-container pt-5"
      :ui="{ title: 'text-3xl text-pretty font-bold text-highlighted font-serif' }">

      <div class="flex justify-between items-center">
        <div class="text-lg text-pretty text-muted">Let's get this bread!</div>
        <div>
          <UButton class="mx-3" icon="i-lucide-search" variant="outline">Search Events</UButton>
          <UModal v-model="isModalOpen" title="Create New Event" :ui="{
            header: 'bg-toast-400 border-none', title: 'text-white font-serif text-xl',
            content: 'border-none ring-transparent w-1/4',
            overlay: 'bg-toast-900/30'
          }" :close="{
            variant: 'link',
            class: 'rounded-full text-white'
          }" :dismissible="false">
            <UButton icon="i-lucide-user-plus" @click="isModalOpen = true">Create New Event</UButton>
            <template #body>



              <UForm class="space-y-4" @submit="">
                <UFormField label="Event Name" name="name" required>
                  <UInput class="w-full" placeholder="Jane & John's Wedding" />
                </UFormField>
                <UFormField label="Event Type" name="type" required>
                  <USelect v-model="selectValue" :items="eventTypes" class="w-full" />
                </UFormField>
                <UFieldGroup class="w-full space-x-3">
                <UFormField label="Event Date" name="date" required class="w-1/2">
                  <UPopover>
                    <UButton color="neutral" variant="outline" class="w-full">
                      {{ modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Select a date' }}
                    </UButton>

                    <template #content="{ close }">
                      <UCalendar v-model="modelValue" class="p-2" @update:model-value="close" />
                    </template>
                  </UPopover>
                </UFormField>

                <UFormField label="Budget" name="budget" required class="w-1/2"> 
                  <UInputNumber v-model="value" :increment="false" :decrement="false" class="w-full" />
                </UFormField>
</UFieldGroup>
                <UFormField label="Description" name="description" required>
                  <UTextarea class="w-full" placeholder="Tell us more about your special day"/>
                </UFormField>

                <UButton to="/UserEventDashboard" block class="mt-4">
                  Create Event
                </UButton>
              </UForm>

            </template>
          </UModal>
        </div>
      </div>
    </UPageCard>

    <!-- Overview Tab Start -->
    <UPageGrid class="">

      <div class="white-bread-container rounded-lg"> <!-- kapag ayaw sa "soft", use ring ring-default sa class -->
        <img src="../assets/bpb-images/wedding-1.jpg" class="w-full rounded-t-lg" width="600" height="400"
          fit="cover" />
        <div class="p-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <div class="text-lg font-semibold pb-1">Jane & John's Wedding</div>
          <UPageFeature icon="i-lucide-map-pin" title="Manila Cathedral" :ui="{ title: 'font-normal' }" />
          <UPageFeature icon="i-lucide-calendar-heart" title="May 03, 2026" :ui="{ title: 'font-normal' }" />
          <UPageFeature icon="i-lucide-piggy-bank" title="Php 5,000,000" :ui="{ title: 'font-normal' }" />
          <USeparator class="my-3" />
          <div class="flex justify-between">
            <div>Tasks Accomplished</div>
            <div>2/4</div>
          </div>
          <UProgress v-model="value" :max="100" class="mt-2" />
          <UButton block class="mt-6" to="/UserEventDashboard">Open Dashboard</UButton>
        </div>
      </div>


      <div class=" white-bread-container rounded-lg">
        <img src="../assets/bpb-images/wedding-1.jpg" class="w-full rounded-t-lg" width="600" height="400"
          fit="cover" />
        <div class="p-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <div class="text-lg font-semibold pb-1">Jane & John's Wedding</div>
          <UPageFeature icon="i-lucide-map-pin" title="Manila Cathedral" :ui="{ title: 'font-normal' }" />
          <UPageFeature icon="i-lucide-calendar-heart" title="May 03, 2026" :ui="{ title: 'font-normal' }" />
          <UPageFeature icon="i-lucide-piggy-bank" title="Php 5,000,000" :ui="{ title: 'font-normal' }" />
          <USeparator class="my-3" />
          <div class="flex justify-between">
            <div>Tasks Accomplished</div>
            <div>2/4</div>
          </div>
          <UProgress v-model="value" :max="100" class="mt-2" />
          <UButton block class="mt-6" to="/UserEventDashboard">Open Dashboard</UButton>
        </div>
      </div>

      <div class="white-bread-container rounded-lg">
        <img src="../assets/bpb-images/wedding-1.jpg" class="w-full rounded-t-lg" width="600" height="400"
          fit="cover" />
        <div class="p-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <div class="text-lg font-semibold pb-1">Jane & John's Wedding</div>
          <UPageFeature icon="i-lucide-map-pin" title="Manila Cathedral" :ui="{ title: 'font-normal' }" />
          <UPageFeature icon="i-lucide-calendar-heart" title="May 03, 2026" :ui="{ title: 'font-normal' }" />
          <UPageFeature icon="i-lucide-piggy-bank" title="Php 5,000,000" :ui="{ title: 'font-normal' }" />
          <USeparator class="my-3 " />
          <div class="flex justify-between">
            <div>Tasks Accomplished</div>
            <div>2/4</div>
          </div>
          <UProgress v-model="value" :max="100" class="mt-2" />
          <UButton block class="mt-6" to="/UserEventDashboard">Open Dashboard</UButton>
        </div>
      </div>
    </UPageGrid>



    <div class="h-1000"></div>
  </UContainer>
</template>


<style></style>