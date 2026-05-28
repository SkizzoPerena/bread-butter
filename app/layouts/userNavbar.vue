<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { resolveProfileImageUrl } from '~/utils/profileImage'

const { user, logout } = useAuth()

const displayName = computed(() => {
  if (user.value?.firstName) {
    return `${user.value.firstName} ${user.value.lastName}`.trim()
  }
  return 'Guest'
})

const avatarSrc = computed(() => resolveProfileImageUrl(user.value?.profileImageURL))

const avatarLabel = computed(() => {
  const first = user.value?.firstName?.[0] ?? 'G'
  const last = user.value?.lastName?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
})

const dropitems: DropdownMenuItem[][] = [
  [{
    slot: 'account',
    disabled: true
  }, {
    label: 'Profile',
    icon: 'i-lucide-user-cog',
    to: '/UserProfile'
  }, {
    label: 'Transactions',
    icon: 'i-lucide-receipt',
    to: '/UserTransactions'
  }, {
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onSelect: () => logout()
  }]
]
</script>

<template>
  <UDashboardNavbar variant="link" class="bg-toast-500/70 w-full sticky top-0 z-50 event-navbar">
    <template #leading>
      <NuxtLink to="/UserDashboard" class="flex items-center">
        <img src="..\assets\bpb-icons\logo-white.svg" class="h-7" />
      </NuxtLink>
    </template>
    <template #right>
      <div class="flex items-center gap-3">
        <UColorModeButton class="text-white" variant="link" />
        <UDropdownMenu
          :items="dropitems"
          :modal="false"
          :content="{ align: 'end', side: 'bottom' }"
          :ui="{
            content: 'bg-toast-500/70 ring ring-transparent mt-1 min-w-40 -mr-4 rounded-xl',
            label: '',
            itemLeadingIcon: 'text-white',
            item: 'text-white link data-disabled:cursor-default data-disabled:opacity-100',
          }"
        >
          <UAvatar :src="avatarSrc" :alt="avatarLabel" />
          <template #account>
            <div class="flex items-center gap-2 text-white">
              <UAvatar :src="avatarSrc" :alt="avatarLabel" size="sm" />
              <span class="font-semibold">{{ displayName }}</span>
            </div>
          </template>
        </UDropdownMenu>
      </div>
    </template>
  </UDashboardNavbar>
  <UDashboardPanel>
    <slot />
  </UDashboardPanel>
</template>

<style></style>
