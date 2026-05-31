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
  <UDashboardNavbar :items="items" variant="link" class="bg-toast-500/70 w-full sticky top-0 z-50 event-navbar">
    <template #leading>

      <!-- Slideover Start -->
      <USlideover side="left" :ui="{
        header: ' border-none', title: 'text-white',
        content: 'bg-toast-400 border-none ring-transparent w-1/5',
        overlay: 'bg-toast-900/70'
      }">
        <UButton icon="i-lucide-menu" variant="link" class="text-white" />

        <template #header="{ close }">
          <div class="flex justify-between w-full">
            <img src="..\assets\bpb-icons\logo-white.svg" class="h-7" />
            <UButton icon="i-lucide-x" variant="link" class="text-white" @click="close" />
          </div>
        </template>

        <template #body>
          <div class="h-full align-top p-0"><UButton icon="i-lucide-home" color="bread" variant="ghost" class="text-white w-full" size="xl">Event Dashboard</UButton>
          <UContainer>
            <div class="text-white text-regular font-lg py-3">Test Category</div>
            <UButton icon="i-lucide-globe" variant="ghost" class="text-white w-full" size="xl">Test </UButton>
          </UContainer></div>
        </template>

        <template #footer="{ close }">
          <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
          <UButton label="Submit" color="neutral" />
        </template>
      </USlideover>

      <!-- Slideover End -->

      <NuxtLink to="/" class="flex items-center">
        <img src="..\assets\bpb-icons\logo-white.svg" class="h-7 color-primary-500" />
      </NuxtLink>
      <div class="font-semibold font-serif text-2xl text-white mx-3">Jane & John's Wedding</div>
    </template>
    <template #right>
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
              <UAvatar src="../assets/Mirana.jpg" :alt="'B P'" size="sm" />
              <span class="font-semibold">Blink Punch</span>
            </div>
          </template>
        </UDropdownMenu>
      </div>
    </template>
  </UDashboardNavbar>

    <slot />

</template>

<style></style>