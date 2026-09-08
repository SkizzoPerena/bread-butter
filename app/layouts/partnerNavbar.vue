<script setup lang="ts">
import { computed } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import { resolveProfileImageUrl } from '~/utils/profileImage'

const route = useRoute()
const { user, logout } = useAuth('partner')

const displayName = computed(() => {
  if (user.value?.firstName) {
    return `${user.value.firstName} ${user.value.lastName}`.trim()
  }
  return 'Partner'
})

const avatarSrc = computed(() => resolveProfileImageUrl(user.value?.profileImageURL))

const avatarLabel = computed(() => {
  const first = user.value?.firstName?.[0] ?? 'P'
  const last = user.value?.lastName?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
})

const navItems = computed<NavigationMenuItem[]>(() => [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/partners', active: route.path === '/partners' },
  { label: 'Events', icon: 'i-lucide-calendar-heart', to: '/partners/events', active: route.path.startsWith('/partners/events') },
  { label: 'Vouchers', icon: 'i-lucide-ticket-percent', to: '/partners/vouchers', active: route.path.startsWith('/partners/vouchers') },
  { label: 'Cashouts', icon: 'i-lucide-wallet-cards', to: '/partners/cashouts', active: route.path.startsWith('/partners/cashouts') },
  { label: 'Collaborations', icon: 'i-lucide-users-round', to: '/partners/collaborations', active: route.path.startsWith('/partners/collaborations') },
  { label: 'Profile', icon: 'i-lucide-user-cog', to: '/partners/profile', active: route.path.startsWith('/partners/profile') }
])

async function handleLogout() {
  await logout()
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-toast-50">
    <UDashboardNavbar class="bg-toast-600/95 w-full sticky top-0 z-50 shrink-0 border-b border-toast-700/20">
      <template #leading>
        <NuxtLink to="/partners" class="flex items-center gap-3 shrink-0">
          <img src="..\assets\bpb-icons\logo-white.svg" class="h-6 sm:h-7" alt="Bread + Butter partner logo" />
          <span class="hidden sm:inline text-white font-serif text-lg font-semibold">
            Partner Portal
          </span>
        </NuxtLink>
      </template>

      <template #default>
        <UNavigationMenu
          :items="navItems"
          highlight
          color="neutral"
          variant="link"
          class="hidden lg:flex"
          :ui="{
            link: 'text-white/85 hover:text-white data-[active=true]:text-white',
            linkLeadingIcon: 'text-white/85 data-[active=true]:text-white'
          }"
        />
      </template>

      <template #right>
        <div class="flex items-center gap-2 sm:gap-3">
          <UChip inset color="success" size="sm" class="hidden sm:inline-flex">
            <span class="text-white/90 text-sm">{{ displayName }}</span>
          </UChip>
          <UDropdownMenu
            :items="[
              [
                { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/partners' },
                { label: 'Events', icon: 'i-lucide-calendar-heart', to: '/partners/events' },
                { label: 'Vouchers', icon: 'i-lucide-ticket-percent', to: '/partners/vouchers' },
                { label: 'Cashouts', icon: 'i-lucide-wallet-cards', to: '/partners/cashouts' },
                { label: 'Collaborations', icon: 'i-lucide-users-round', to: '/partners/collaborations' },
                { label: 'Profile', icon: 'i-lucide-user-cog', to: '/partners/profile' },
                { label: 'Sign out', icon: 'i-lucide-log-out', onSelect: handleLogout }
              ]
            ]"
            :modal="false"
            :content="{ align: 'end', side: 'bottom' }"
            :ui="{
              content: 'bg-toast-700 ring ring-transparent min-w-52 rounded-xl',
              item: 'text-white',
              itemLeadingIcon: 'text-white'
            }"
          >
            <UButton color="neutral" variant="ghost" class="text-white hover:bg-white/10 rounded-full p-0">
              <UAvatar :src="avatarSrc" :alt="avatarLabel" />
            </UButton>
          </UDropdownMenu>
        </div>
      </template>
    </UDashboardNavbar>

    <main class="flex-1 flex flex-col">
      <slot />
    </main>
  </div>
</template>

<style></style>
