<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

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


import type { TabsItem } from '@nuxt/ui'


const value = ref(50)
</script>

<template>
  <UContainer class="space-y-8">
    <!-- all containers should have mb-12 pb-0 for uniform borders, all containers WITHIN a container should have mb-8 pb-0 for uniform borders -->

    <UPageCard title="Welcome back, Jane!" class="bread-container pt-5" :ui="{ title: 'text-3xl text-pretty font-bold text-highlighted font-serif' }">

      <div class="flex justify-between items-center">
        <div class="text-lg text-pretty text-muted">Let's get this bread!</div>
        <div>
          <UButton class="mx-3" icon="i-lucide-search" variant="outline" >Search Events</UButton>
          <UButton class="" icon="i-lucide-plus">Create Event</UButton>
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




  </UContainer>
</template>


<style></style>