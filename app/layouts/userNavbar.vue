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

  <div class="fixed align-center w-full z-50">
    <UContainer>
      <UNavigationMenu :items="items" variant="link"
        class="mt-5 bg-bread-500/70 backdrop-blur-sm rounded-xl px-2 sm:px-4 shadow-lg shadow-neutral-950/5">
        <template #list-leading>
          <NuxtLink to="/" class="flex items-center mr-4">
            <img src="../assets/bpb-icons/logo.svg" class="h-6 color-primary-500"/>
          </NuxtLink>
        </template>
        <template #list-trailing>
          <UColorModeButton color="primary" />
        </template>
      </UNavigationMenu>
    </UContainer>
  </div>
<div style="height: 80px"></div>
  <slot />


</template>

<style>

</style>