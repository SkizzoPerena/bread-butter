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
    to: '/user/profile'
  }, {
    label: 'Transactions',
    icon: 'i-lucide-receipt',
    to: '/user/transactions'
  }, {
    label: 'Report Issue',
    icon: 'i-lucide-message-square-warning',
    to: '/user/report-issue'
  }, {
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onSelect: () => logout()
  }]
]
</script>

<template>
  <UDashboardNavbar variant="link" class="bg-toast-500/90 w-full sticky top-0 z-50 event-navbar">
    <template #leading>
      <NuxtLink to="/user/dashboard" class="flex items-center mr-3">
        <img src="..\assets\bpb-icons\logo-white.svg" class="h-7" />
      </NuxtLink>
      <span v-if="user?.firstName"
        class="text-white font-serif text-xl font-semibold border-l-2 border-white pl-3 hidden sm:inline">
        Welcome back, {{ user.firstName }}!
      </span>
    </template>
    <template #right>
      <div class="flex items-center gap-3">
        <div id="navbar-actions" class="flex items-center gap-2"></div>
        <UDropdownMenu :items="dropitems" :modal="false" :content="{ align: 'end', side: 'bottom' }" :ui="{
          content: 'bg-toast-600/90 ring ring-transparent mt-1 min-w-40 -mr-4 rounded-xl',
          label: '',
          itemLeadingIcon: 'text-white',
          item: 'text-white link data-disabled:cursor-default data-disabled:opacity-100',
        }">
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
