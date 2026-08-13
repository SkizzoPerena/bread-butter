<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { resolveProfileImageUrl } from '~/utils/profileImage'

const route = useRoute()
const { user, logout } = useAuth()

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function handleScroll() {
  if (route.path !== '/') {
    isScrolled.value = true
    return
  }
  isScrolled.value = window.scrollY > window.innerHeight * 0.5
}

watch(() => route.path, () => {
  handleScroll()
})

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const displayName = computed(() => {
  if (user.value?.firstName) {
    return `${user.value.firstName} ${user.value.lastName}`.trim()
  }
  return 'User'
})

const avatarSrc = computed(() => resolveProfileImageUrl(user.value?.profileImageURL))

const avatarLabel = computed(() => {
  const first = user.value?.firstName?.[0] ?? 'U'
  const last = user.value?.lastName?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
})

const dropitems: DropdownMenuItem[][] = [
  [{
    slot: 'account',
    disabled: true
  }, {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/user/dashboard'
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

const links = [
  { label: 'Features', to: '/#introduction' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'About', to: 'https://www.blinkpunch.com' },
  { label: 'FAQ', to: '/faqs' },
  { label: 'Contact', to: '/contact-us' }
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Desktop Header -->
    <UHeader :ui="{ container: 'max-w-none w-full px-6 sm:px-8 lg:px-12' }" :class="[
      'fixed top-0 w-full transition-all duration-300 z-50 border-none hidden lg:flex',
      isScrolled ? 'bg-toast-500/70 backdrop-blur-lg' : 'bg-transparent backdrop-blur-none'
    ]">
      <template #left>
        <div></div>
      </template>

      <div class="flex items-center gap-x-8">
        <UButton to="https://www.blinkpunch.com" variant="link" color="bread" class="font-semibold text-base text-white">
          About
        </UButton>
        <UButton to="/user/dashboard" variant="link" color="bread" class="font-semibold text-base text-white">
          Dashboard
        </UButton>
        <NuxtLink to="/user/dashboard" class="mx-4">
          <img src="../assets/bpb-icons/logo-white.svg" class="h-8" />
        </NuxtLink>
        <UButton to="/faqs" variant="link" color="bread" class="font-semibold text-base text-white">
          FAQ
        </UButton>
        <UButton to="/contact-us" variant="link" color="bread" class="font-semibold text-base text-white">
          Contact
        </UButton>
      </div>

      <template #right>
        <div class="flex items-center gap-x-4">
          <UDropdownMenu :items="dropitems" :modal="false" :content="{ align: 'end', side: 'bottom' }" :ui="{
            content: 'bg-toast-600/90 ring ring-transparent mt-1 min-w-40 rounded-xl',
            itemLeadingIcon: 'text-white',
            item: 'text-white link data-disabled:cursor-default data-disabled:opacity-100',
          }">
            <div class="flex items-center gap-2 cursor-pointer">
              <UAvatar :src="avatarSrc" :alt="avatarLabel" />
              <span class="font-semibold text-white text-sm hidden sm:inline">{{ displayName }}</span>
            </div>
            <template #account>
              <div class="flex items-center gap-2 text-white">
                <UAvatar :src="avatarSrc" :alt="avatarLabel" size="sm" />
                <span class="font-semibold">{{ displayName }}</span>
              </div>
            </template>
          </UDropdownMenu>
        </div>
      </template>
    </UHeader>

    <!-- Mobile and Tablet Header -->
    <UHeader :toggle="false" :ui="{ container: 'max-w-none w-full px-4 sm:px-6' }"
      class="lg:hidden bg-toast-500 text-white border-none">
      <template #title>
        <UPopover v-model:open="isMobileMenuOpen"
          :ui="{ content: 'bread-container w-56 bg-toast-600/90 text-white p-2 border-none ring-0 shadow-2xl shadow-black/40' }">
          <UButton :icon="isMobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" color="bread" variant="ghost" size="md"
            aria-label="Toggle menu" />

          <template #content>
            <div class="flex flex-col space-y-1">
              <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
                to="/user/dashboard" @click="closeMobileMenu">Dashboard</UButton>
              <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
                to="https://www.blinkpunch.com" @click="closeMobileMenu">About Us</UButton>
              <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
                to="/faqs" @click="closeMobileMenu">FAQ</UButton>
              <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
                to="/contact-us" @click="closeMobileMenu">Contact Us</UButton>
            </div>
          </template>
        </UPopover>
        <NuxtLink to="/user/dashboard" class="flex items-center gap-2" @click="closeMobileMenu">
          <img class="h-7 w-auto" src="../assets/bpb-icons/logo-white.svg" alt="Bread + Butter Logo" />
        </NuxtLink>
      </template>

      <template #right>
        <UDropdownMenu :items="dropitems" :modal="false" :content="{ align: 'end', side: 'bottom' }" :ui="{
          content: 'bg-toast-600/90 ring ring-transparent mt-1 min-w-40 rounded-xl',
          itemLeadingIcon: 'text-white',
          item: 'text-white link data-disabled:cursor-default data-disabled:opacity-100',
        }">
          <UAvatar :src="avatarSrc" :alt="avatarLabel" size="sm" class="cursor-pointer" />
          <template #account>
            <div class="flex items-center gap-2 text-white">
              <UAvatar :src="avatarSrc" :alt="avatarLabel" size="sm" />
              <span class="font-semibold">{{ displayName }}</span>
            </div>
          </template>
        </UDropdownMenu>
      </template>
    </UHeader>

    <main class="flex-1 flex flex-col">
      <slot />
    </main>

    <UFooter class="bg-bread-400">
      <template #left>
        <p class="text-sm text-toast-600">
          Copyright © {{ new Date().getFullYear() }} Bread+Butter. All rights reserved.
        </p>
      </template>

      <template #right>
        <UButton v-for="link in links" :key="link.to" :to="link.to" color="neutral" variant="ghost">{{ link.label }}
        </UButton>
      </template>
    </UFooter>
  </div>
</template>

<style></style>
