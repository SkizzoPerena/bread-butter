<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { resolveProfileImageUrl } from '~/utils/profileImage'

const route = useRoute()
const { isUiOnlyMode } = useApiMode()
const { displayName: eventDisplayName } = useActiveEvent()

const headerEventTitle = computed(() => {
  if (eventDisplayName.value) {
    return eventDisplayName.value
  }
  const id = route.query.eventId
  if (typeof id === 'string' && id && isUiOnlyMode.value) {
    return "Jane & John's Wedding"
  }
  return 'Your event'
})

const { user, logout } = useAuth()

const userDisplayName = computed(() => {
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
    label: 'Report Issue',
    icon: 'i-lucide-message-square-warning',
    to: '/UserReportIssue'
  }, {
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onSelect: () => logout()
  }]
]
</script>

<template>
  <UDashboardNavbar class="bg-white w-full sticky top-0 z-50 event-navbar">
    <template #left>
      <div class="flex items-center gap-3">
        <NuxtLink to="/UserDashboard" class="flex items-center">
          <img src="..\assets\bpb-icons\logo-toast.svg" class="h-7" />
        </NuxtLink>
        <div class="font-serif text-xl font-bold truncate max-w-[min(100%,20rem)]">
          {{ headerEventTitle }}
        </div>
      </div>
    </template>
    <template #right>
      <div class="flex items-center gap-4">
        <UDropdownMenu
          :items="dropitems"
          :modal="false"
          :content="{ align: 'end', side: 'bottom' }"
          :ui="{
            content: 'mt-1 min-w-40 -mr-4 rounded-xl',
            label: '',
          }"
        >
          <UAvatar :src="avatarSrc" :alt="avatarLabel" />
          <template #account>
            <div class="flex items-center gap-2">
              <UAvatar :src="avatarSrc" :alt="avatarLabel" size="sm" />
              <span class="font-semibold">{{ userDisplayName }}</span>
            </div>
          </template>
        </UDropdownMenu>
      </div>
    </template>
  </UDashboardNavbar>

    <slot />

</template>

<style></style>
