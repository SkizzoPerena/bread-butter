<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = ref<NavigationMenuItem[][]>([
  [
    {

      icon: 'app/assets/css/B+B Logos-03.png',
      to: '/'
    }
  ],  
  [
    {
      label: 'Guide',
      icon: 'i-lucide-book-open',
      to: '/docs/getting-started'
    },
    {
      label: 'Composables',
      icon: 'i-lucide-database',
      to: '/docs/composables'
    },
    {
      label: 'Components',
      icon: 'i-lucide-box',
      to: '/docs/components',
      active: true
    }
  ],
  [
    {
      label: 'GitHub',
      icon: 'i-simple-icons-github',
      badge: '6k',
      to: 'https://github.com/nuxt/ui',
      target: '_blank'
    }
  ]
])
</script>

<template>

<div class="fixed align-center w-full">
    <UContainer class=""><UNavigationMenu
      :items="items"
      variant="link"
      color="neutral"
      class="  mt-5 bg-muted/80 backdrop-blur-sm rounded-xl px-2 sm:px-4 border border-muted/50 shadow-lg shadow-neutral-950/5"
      :ui="{

        linkLeadingIcon: 'hidden'
      }"
    >

    </UNavigationMenu>
    </UContainer>
    </div>
    <UContainer class="bg-muted/80">
      test
    </UContainer>

</template>

<style>

</style>