<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { DropdownMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
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
]

const dropitems: DropdownMenuItem[][] = [
  [{
    slot: 'account',
    disabled: true
  }, {
    label: 'Profile',
    icon: 'i-lucide-user-cog',
    to: '/UserProfile'
  }, {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/UserSettings' // Assuming a settings page
  }, {
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    to: '/UserLogin'
  }]
]
</script>

<template>
  <div class="bg-bread-50 mb-7">
    <div class="fixed align-center w-full z-50">
      <UContainer>
        <UNavigationMenu :items="items" variant="link" class="mt-5 px-2 sm:px-4 bg-toast-500/70 bread-container"
          :ui="{ link: 'text-white' }">
          <template #list-leading>
            <NuxtLink to="/" class="flex items-center mr-4">
              <img src="..\assets\bpb-icons\logo-white.svg" class="h-6 color-primary-500" />
            </NuxtLink>
          </template>
          <template #list-trailing>
            <div class="flex item-center gap-3">
              <UColorModeButton class="text-white" variant="link" />
              <UDropdownMenu :items="dropitems" :modal="false" :content="{
                align: 'end',
                side: 'bottom',
              }" :ui="{
      content: 'bg-toast-500/70 ring ring-transparent mt-1 min-w-40 -mr-4 rounded-xl',
      label: '',
      itemLeadingIcon: 'text-white',
      item: 'text-white link data-disabled:cursor-default data-disabled:opacity-100',
    }">
                <UAvatar :alt="'B P'" />
                <template #account>
                  <div class="flex items-center gap-2 text-white">
                    <UAvatar src="../assets/Mirana.jpg":alt="'B P'" size="sm" />
                    <span class="font-semibold">Blink Punch</span>
                  </div>
                </template>
              </UDropdownMenu>
            </div>
          </template>
        </UNavigationMenu>
      </UContainer>
    </div>
    <div style="height: 70px" class="mb-8"></div>
    <slot />
  </div>
</template>

<style></style>