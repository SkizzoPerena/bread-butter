<script lang="ts" setup>
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

const value = ref(50)
</script>

<template>
  <UContainer> <!-- all containers should have mb-12 pb-0 for uniform borders, all containers WITHIN a container should have mb-8 pb-0 for uniform borders -->
    <div style="height: 80px"></div>
    <UPageHeader title="Welcome back, John & Jane!" :ui="{ title: 'font-serif text-2xl sm:text-3xl' }"
      description="What would you like to do today?" class="border-none mb-12 pb-0"></UPageHeader>
    <UPageGrid class=" mb-12 pb-0">
      <UPageCard v-for="(card, index) in cards" :key="index" v-bind="card" variant="soft"
        class="bg-bread-200 hover:bg-bread-300 " :ui="{
          title: 'text-muted text-md'
        }">

        <span class="text-2xl font-semibold text-highlighted font-serif">
          {{ card.number }}
        </span>
      </UPageCard>
    </UPageGrid>
    <UTabs :items="items" class="w-full" variant="link" :ui="{ trigger: 'grow' }">

      <!-- Overview Tab Start -->
      <template #overview="{ item }">
        <UPageGrid class="mt-8 mb-12 pb-0">

          <div class="bg-bread-200 rounded-lg"> <!-- kapag ayaw sa "soft", use ring ring-default sa class -->
            <NuxtImg src="https://t3.ftcdn.net/jpg/02/18/06/54/360_F_218065499_qIqGChM5CRvpnHjRwPulMJtWZee6LzR2.jpg"
              class="w-full rounded-t-lg" width="600" height="400" fit="cover" loading="lazy" />
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
              <UButton block class="mt-6">More Information</UButton>
            </div>
          </div>


          <div class="bg-bread-200 rounded-lg">
            <NuxtImg src="https://t3.ftcdn.net/jpg/02/18/06/54/360_F_218065499_qIqGChM5CRvpnHjRwPulMJtWZee6LzR2.jpg"
              class="w-full rounded-t-lg" width="600" height="400" fit="cover" loading="lazy" />
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
              <UButton block class="mt-6">More Information</UButton>
            </div>
          </div>

          <div class="bg-bread-200 rounded-lg">
            <NuxtImg src="https://t3.ftcdn.net/jpg/02/18/06/54/360_F_218065499_qIqGChM5CRvpnHjRwPulMJtWZee6LzR2.jpg"
              class="w-full rounded-t-lg" width="600" height="400" fit="cover" loading="lazy" />
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
</template>


<style></style>