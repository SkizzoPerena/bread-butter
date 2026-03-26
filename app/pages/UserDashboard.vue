<script lang="ts" setup>
const cards = ref([
  {
    title: 'Upcoming Events',

    icon: 'i-lucide-smile',
    to: '/docs/getting-started/integrations/icons',
    number: '50',
  },
  {
    title: 'Tasks Completed',

    icon: 'i-lucide-a-large-small',
    to: '/docs/getting-started/integrations/fonts',
    number: '10 / 12',
  },
  {
    title: 'Total Budget',
    icon: 'i-lucide-a-large-small',
    to: '/docs/getting-started/integrations/color-mode',
    number: 'Php 500,000',
  }
])

import type { TabsItem } from '@nuxt/ui'

const items: TabsItem[] = [
  {
    label: 'Overview',

  },
  {
    label: 'Events',

  },
  {
    label: 'Websites',
  }
]
</script>

<template>
  <UContainer>
    <UPageSection title="Welcome back, John & Jane!" :ui="{ title: 'font-serif' }"
      description="What would you like to do today?">
      <UPageGrid>
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
    <template #content="{ item }">
      <p>This is the {{ item.label }} tab.</p>
    </template>
  </UTabs>
    </UPageSection>


  </UContainer>
</template>


<style></style>