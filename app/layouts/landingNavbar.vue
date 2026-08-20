<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [{
  label: 'Docs',
  to: '/docs/getting-started',
  icon: 'i-lucide-book-open',
  active: route.path.startsWith('/docs/getting-started')
}, {
  label: 'Components',
  to: '/docs/components',
  icon: 'i-lucide-box',
  active: route.path.startsWith('/docs/components')
}, {
  label: 'Figma',
  icon: 'i-simple-icons-figma',
  to: 'https://go.nuxt.com/figma-ui',
  target: '_blank'
}, {
  label: 'Releases',
  icon: 'i-lucide-rocket',
  to: 'https://github.com/nuxt/ui/releases',
  target: '_blank'
}])

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function scrollToSection(hash: string) {
  isMobileMenuOpen.value = false
  if (route.path === '/') {
    const target = document.querySelector(hash)
    if (target) {
      const isMobile = window.innerWidth < 1024
      if (isMobile) {
        const navbar = document.querySelector('header')
        const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 80
        const elementPosition = target.getBoundingClientRect().top + window.scrollY
        const offsetPosition = elementPosition - navbarHeight - 16

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        })
      } else {
        target.scrollIntoView({ behavior: 'smooth' })
      }
      return
    }
  }
  navigateTo(`/${hash}`)
}

function handleScroll() {
  if (route.path !== '/') {
    isScrolled.value = true
    return
  }
  // On index page (/), transition when scrolled past 50vh
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

const links = [
  { label: 'Features', to: '/#introduction' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'About', to: 'https://www.blinkpunch.com' },
  { label: 'FAQ', to: '/faqs' },
  { label: 'Terms', to: '/terms' },
  { label: 'Contact', to: '/contact-us' }
]
</script>

<template>

  <UHeader :ui="{ container: 'max-w-none w-full px-6 sm:px-8 lg:px-12' }" :class="[
    'fixed top-0 w-full transition-all duration-300 z-50 border-none hidden lg:flex',
    isScrolled ? 'bg-toast-500/70 backdrop-blur-lg' : 'bg-transparent backdrop-blur-none'
  ]">
    <template #title>
      <NuxtLink to="/">
        <img class="h-10 w-auto" src="..\assets\bpb-icons\logo-white.svg" alt="Bread + Butter Logo" />
      </NuxtLink>
    </template>

    <div class="flex items-center gap-2 sm:gap-3">
      <UButton variant="link" class="text-sm font-medium text-white hover:text-bread-400"
        to="https://www.blinkpunch.com">
        About</UButton>
      <UButton variant="link" class="text-sm font-medium text-white hover:text-bread-400"
        @click="scrollToSection('#introduction')">Features</UButton>
      <UButton variant="link" class="text-sm font-medium text-white hover:text-bread-400"
        @click="scrollToSection('#pricing')">Pricing</UButton>
      <UButton variant="link" class="text-sm font-medium text-white hover:text-bread-400" to="/our-suppliers">
        Our Suppliers</UButton>
      <UButton variant="link" class="text-sm font-medium text-white hover:text-bread-400" to="/partners/login">
        Partners</UButton>
      <UButton variant="link" class="text-sm font-medium text-white hover:text-bread-400" to="/faqs">
        FAQ</UButton>
      <UButton variant="link" class="text-sm font-medium text-white hover:text-bread-400" to="/contact-us">
        Contact Us</UButton>
    </div>

    <template #right>
      <div class="flex items-center gap-4">
        <UButton to="/user/login" variant="link" color="bread" class="font-semibold text-white">Sign In</UButton>
        <UButton to="/user/signup" color="bread" variant="solid" class="font-bold text-toast-700">Get Started</UButton>
      </div>
    </template>
  </UHeader>

  <!-- Mobile Header (hidden on lg and up) -->
  <UHeader :ui="{ container: 'max-w-none w-full px-4 sm:px-6' }" :class="[
    'fixed top-0 w-full transition-all duration-300 z-50 border-none flex lg:hidden',
    isScrolled ? 'bg-toast-500/70 backdrop-blur-lg' : 'bg-transparent backdrop-blur-none'
  ]">
    <template #title>

      <UPopover v-model:open="isMobileMenuOpen"
        :ui="{ content: 'bread-container w-56 bg-toast-600/90 text-white p-2 border-none ring-0 shadow-2xl shadow-black/40' }">
        <UButton :icon="isMobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" color="bread" variant="ghost" size="md"
          aria-label="Toggle menu" />

        <template #content>
          <div class="flex flex-col space-y-1">
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              to="https://www.blinkpunch.com" @click="closeMobileMenu">About Us</UButton>
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              @click="scrollToSection('#introduction')">Features</UButton>
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              @click="scrollToSection('#pricing')">Pricing</UButton>
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              to="/our-suppliers" @click="closeMobileMenu">Our Suppliers</UButton>
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              to="/partners/login" @click="closeMobileMenu">Partners</UButton>
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              to="/faqs" @click="closeMobileMenu">FAQ</UButton>
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              to="/terms" @click="closeMobileMenu">Terms</UButton>
            <UButton variant="link" class="w-full justify-start text-base font-medium text-white" color="bread"
              to="/contact-us" @click="closeMobileMenu">Contact Us</UButton>
          </div>
        </template>
      </UPopover>
      <NuxtLink to="/" class="flex items-center gap-2" @click="closeMobileMenu">
        <img class="h-7 w-auto" src="..\assets\bpb-icons\logo-white.svg" alt="Bread + Butter Logo" />
      </NuxtLink>
    </template>

    <template #right>
      <div class="flex items-center gap-2">
        <UButton to="/user/login" variant="link" color="bread" class="font-semibold text-white text-sm"
          @click="closeMobileMenu">Sign In</UButton>
        <UButton to="/user/signup" color="bread" variant="solid" class="font-bold text-toast-700 text-xs px-2.5 py-1.5"
          @click="closeMobileMenu">Get Started</UButton>

      </div>
    </template>
  </UHeader>

  <slot />
  <UFooter class=" bg-bread-400">
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
</template>

<style></style>