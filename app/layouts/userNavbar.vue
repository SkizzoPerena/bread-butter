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
  <div class="min-h-screen flex flex-col bg-bread-400">
    <UDashboardNavbar variant="link" class="bg-toast-500/90 w-full sticky top-0 z-50 event-navbar shrink-0">
      <template #toggle>
        <!-- Built-in Navbar Toggle for Mobile -->
        <UDropdownMenu
          :items="dropitems"
          :modal="false"
          :content="{ align: 'start', side: 'bottom' }"
          :ui="{
            content: 'bg-toast-600/95 ring ring-transparent mt-1 min-w-48 rounded-xl text-white shadow-xl',
            label: '',
            itemLeadingIcon: 'text-white',
            item: 'text-white link data-disabled:cursor-default data-disabled:opacity-100',
          }"
          class="sm:hidden -ml-1 mr-1.5 shrink-0"
        >
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            size="sm"
            class="text-white hover:bg-white/10"
            aria-label="Toggle menu"
          />
          <template #account>
            <div class="flex items-center gap-2 text-white">
              <UAvatar :src="avatarSrc" :alt="avatarLabel" size="sm" />
              <span class="font-semibold">{{ displayName }}</span>
            </div>
          </template>
        </UDropdownMenu>
      </template>

      <template #leading>
        <NuxtLink to="/" class="flex items-center mr-2 sm:mr-3 shrink-0">
          <img src="..\assets\bpb-icons\logo-white.svg" class="h-6 sm:h-7" />
        </NuxtLink>
        <span v-if="user?.firstName"
          class="text-white font-serif text-sm sm:text-xl font-semibold border-l-2 border-white pl-2 sm:pl-3 truncate">
          Welcome back, {{ user.firstName }}!
        </span>
      </template>
      <template #right>
        <div class="hidden sm:flex items-center gap-3">
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
    <main class="flex-1 w-full bg-bread-400 flex flex-col">
      <slot />
    </main>
  </div>
</template>

<style></style>
