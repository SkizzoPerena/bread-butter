<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = ref<NavigationMenuItem[][]>([
  [
    {
      label: 'Dashboard',

      to: '/docs/getting-started',
      active: true
    },
    {
      label: 'Events',

      to: '/docs/composables'
    },
    {
      label: 'Calendar',

      to: '/docs/components',

    }
  ],
])
</script>

<template>
<div class="bg-bread-200">
  <div class="fixed align-center w-full z-50">
    <UContainer>
      <UNavigationMenu :items="items" variant="link"
        class="mt-5 px-2 sm:px-4 bg-toast-500/70 bread-container" :ui="{ link: 'text-white' }">
        <template #list-leading>
          <NuxtLink to="/" class="flex items-center mr-4">
            <img src="..\assets\bpb-icons\logo-white.svg" class="h-6 color-primary-500" />
          </NuxtLink>
        </template>
        <template #list-trailing>
          <UColorModeButton class="text-white" variant="link" />
        </template>
      </UNavigationMenu>
    </UContainer>
  </div>
  <div style="height: 80px"></div>
  <slot />
</div>
</template>

<style>

</style>