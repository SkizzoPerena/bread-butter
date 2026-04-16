<script lang="ts" setup>

import weddingImage from '~/assets/bpb-images/wedding-1.jpg'

definePageMeta({
  layout: 'user-navbar',
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

const eventCards = ref([
  {
    image: weddingImage,
    title: "Jane & John's Wedding",
    location: 'Manila Cathedral',
    date: 'May 03, 2026',
    budget: 'Php 5,000,000',
    tasks: '2/4',
    progress: 50,
  },
  {
    image: weddingImage,
    title: "Jane & John's Wedding",
    location: 'Manila Cathedral',
    date: 'May 03, 2026',
    budget: 'Php 5,000,000',
    tasks: '2/4',
    progress: 50,
  },
  {
    image: weddingImage,
    title: "Jane & John's Wedding",
    location: 'Manila Cathedral',
    date: 'May 03, 2026',
    budget: 'Php 5,000,000',
    tasks: '2/4',
    progress: 50,
  },
])

import type { TabsItem } from '@nuxt/ui'

const items = [
  {
    label: 'Overview',
    description: '',
    icon: 'i-lucide-table-of-contents',
    slot: 'overview' as const
  },
  {
    label: 'Events',
    description: '',
    icon: 'i-lucide-calendars',
    slot: 'events' as const
  },
  {
    label: 'Websites',
    description: '',
    icon: 'i-lucide-globe',
    slot: 'websites' as const
  },
] satisfies TabsItem[]

</script>

<template>
  <UContainer> <!-- all containers should have mb-12 pb-0 for uniform borders, all containers WITHIN a container should have mb-8 pb-0 for uniform borders -->
    <UPageHeader title="Welcome back, Jane & John!" :ui="{ title: 'font-serif text-2xl sm:text-3xl' }"
      description="What would you like to do today?" class=" mb-12 mt-7 py-7 px-6 bread-container border border-toast-100 bg-bread-50"></UPageHeader>
    <UPageGrid class=" mb-12 pb-0">
      <UPageCard v-for="(card, index) in cards" :key="index" v-bind="card"
        class=" bg-bread-50 border border-toast-100 hover:bg-bread-400 bread-container" :ui="{
          title: 'text-muted text-md'
        }">

        <span class="text-2xl font-semibold text-highlighted font-serif ">
          {{ card.number }}
        </span>
      </UPageCard>
    </UPageGrid>
    
    <UContainer class=" bg-bread-50 border border-toast-100  bread-container"> 
    <UTabs :items="items" class="w-full my-7" variant="link" :ui="{ trigger: 'grow' }">

      <!-- Overview Tab Start -->
      <template #overview="{ item }">
        <UPageGrid class="mt-8 pb-0 gap-0 divide-x divide-toast-100">
          <div v-for="(eventCard, index) in eventCards" :key="index" class="px-4">
            <img :src="eventCard.image" class="w-full rounded-lg" width="600" height="400" fit="cover" @error="($event.target as HTMLImageElement).src = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400' fill='%23e2e8f0'%3e%3crect width='100%25' height='100%25'/%3e%3c/svg%3e`">
            <div class="p-4 pb-4 pt-3 sm:pb-6 sm:pt-4">
              <div class="text-lg font-semibold pb-1">
                {{ eventCard.title }}
              </div>
              <UPageFeature icon="i-lucide-map-pin" :title="eventCard.location" :ui="{ title: 'font-normal' }" />
              <UPageFeature icon="i-lucide-calendar-heart" :title="eventCard.date" :ui="{ title: 'font-normal' }" />
              <UPageFeature icon="i-lucide-piggy-bank" :title="eventCard.budget" :ui="{ title: 'font-normal' }" />
              <USeparator class="my-3" />
              <div class="flex justify-between">
                <div>Tasks Accomplished</div>
                <div>{{ eventCard.tasks }}</div>
              </div>
              <UProgress v-model="eventCard.progress" :max="100" class="mt-2" />
              <UButton block class="mt-6">More Information</UButton>
            </div>
          </div>
        </UPageGrid>
      </template>

      <!-- Overview Tab Ends -->

      <!-- Events Tab Start -->
      <template #events="{ item }">
        <p>This is the {{ item.label }} tab.</p>
      </template>
      <!-- Events Tab Ends -->

      <!-- Websites Tab Start -->
      <template #websites="{ item }">
        <p>This is the {{ item.label }} tab.</p>
      </template>
      <!-- Websites Tab Ends -->

    </UTabs>
    </UContainer>



  </UContainer>
</template>


<style>


</style>