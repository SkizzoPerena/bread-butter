<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()

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
      const navbar = document.querySelector('header')
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 80
      const elementPosition = target.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - navbarHeight - 16

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      })
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
  if (route.hash) {
    nextTick(() => {
      setTimeout(() => {
        scrollToSection(route.hash)
      }, 150)
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Cluster 1: About
const aboutItems: DropdownMenuItem[][] = [
  [
    {
      label: 'What is Bread + Butter',
      icon: 'i-lucide-sparkles',
      to: '/about',
      active: false
    },
    {
      label: 'Company Behind',
      icon: 'i-lucide-hexagon',
      to: 'https://www.blinkpunch.com',
      target: '_blank',
      active: false
    }
  ]
]

// Cluster 2: Features
const featuresItems: DropdownMenuItem[][] = [
  [
    {
      label: 'Pricing',
      icon: 'i-lucide-tag',
      onSelect: () => scrollToSection('#pricing'),
      active: false
    },
    {
      label: 'Benefits',
      icon: 'i-lucide-award',
      onSelect: () => scrollToSection('#benefits'),
      active: false
    }
  ]
]

// Cluster 3: Partners
const partnersItems: DropdownMenuItem[][] = [
  [
    {
      label: 'Our Suppliers',
      icon: 'i-lucide-store',
      to: '/our-suppliers',
      active: false
    },
    {
      label: 'Partners',
      icon: 'i-lucide-handshake',
      to: '/partners/login',
      active: false
    }
  ]
]

// Cluster 4: More Information
const moreInfoItems: DropdownMenuItem[][] = [
  [
    {
      label: 'FAQs',
      icon: 'i-lucide-help-circle',
      to: '/faqs',
      active: false
    },
    {
      label: 'News and Events',
      icon: 'i-lucide-calendar-days',
      to: '/news-and-events',
      active: false
    },
    {
      label: 'Useful Tips',
      icon: 'i-lucide-lightbulb',
      to: '/useful-tips',
      active: false
    },
    {
      label: 'Contact us',
      icon: 'i-lucide-mail',
      to: '/contact-us',
      active: false
    }
  ]
]

const links = [
  { label: 'About', to: '/about' },
  { label: 'Features', to: '/#introduction' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Our Suppliers', to: '/our-suppliers' },
  { label: 'FAQ', to: '/faqs' },
  { label: 'News & Events', to: '/news-and-events' },
  { label: 'Useful Tips', to: '/useful-tips' },
  { label: 'Terms', to: '/terms' },
  { label: 'Contact', to: '/contact-us' }
]
</script>

<template>
  <!-- Desktop Header -->
  <UHeader :ui="{ container: 'max-w-none w-full px-6 sm:px-8 lg:px-12' }" :class="[
    'fixed top-0 w-full transition-all duration-300 z-50 border-none hidden lg:flex',
    isScrolled ? 'bg-toast-500/70 backdrop-blur-lg' : 'bg-transparent backdrop-blur-none'
  ]">
    <template #title>
      <NuxtLink to="/">
        <img class="h-10 w-auto" src="~/assets/bpb-icons/logo-white.svg" alt="Bread + Butter Logo" />
      </NuxtLink>
    </template>

    <div class="flex items-center gap-1 sm:gap-2">
      <!-- Cluster 1: About -->
      <UDropdownMenu v-slot="{ open }" :items="aboutItems" :modal="false"
        :content="{ align: 'start', side: 'bottom', sideOffset: 8 }" :ui="{
          content: 'bg-toast-600/70 backdrop-blur-md border border-toast-400/20 ring-transparent shadow-2xl rounded-xl p-1.5 min-w-56 text-white z-50',
          item: 'text-white hover:text-bread-400 hover:bg-toast-500/50 rounded-lg text-sm transition-colors cursor-pointer',
          itemLeadingIcon: 'text-bread-400 size-4'
        }">
        <UButton label="About" variant="ghost" trailing-icon="i-lucide-chevron-down"
          class="text-sm font-medium text-white hover:text-bread-400 hover:bg-white/10 rounded-lg transition-colors px-2.5 py-1.5"
          :class="[open && 'text-bread-400 bg-white/10']" :ui="{
            trailingIcon: ['transition-transform duration-200 size-4', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
          }" />
      </UDropdownMenu>

      <!-- Cluster 2: Features -->
      <UDropdownMenu v-slot="{ open }" :items="featuresItems" :modal="false"
        :content="{ align: 'start', side: 'bottom', sideOffset: 8 }" :ui="{
          content: 'bg-toast-600/70 backdrop-blur-md border border-toast-400/20 ring-transparent shadow-2xl rounded-xl p-1.5 min-w-56 text-white z-50',
          item: 'text-white hover:text-bread-400 hover:bg-toast-500/50 rounded-lg text-sm transition-colors cursor-pointer',
          itemLeadingIcon: 'text-bread-400 size-4'
        }">
        <UButton label="Features" variant="ghost" trailing-icon="i-lucide-chevron-down"
          class="text-sm font-medium text-white hover:text-bread-400 hover:bg-white/10 rounded-lg transition-colors px-2.5 py-1.5"
          :class="[open && 'text-bread-400 bg-white/10']" :ui="{
            trailingIcon: ['transition-transform duration-200 size-4', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
          }" />
      </UDropdownMenu>

      <!-- Cluster 3: Partners -->
      <UDropdownMenu v-slot="{ open }" :items="partnersItems" :modal="false"
        :content="{ align: 'start', side: 'bottom', sideOffset: 8 }" :ui="{
          content: 'bg-toast-600/70 backdrop-blur-md border border-toast-400/20 ring-transparent shadow-2xl rounded-xl p-1.5 min-w-56 text-white z-50',
          item: 'text-white hover:text-bread-400 hover:bg-toast-500/50 rounded-lg text-sm transition-colors cursor-pointer',
          itemLeadingIcon: 'text-bread-400 size-4'
        }">
        <UButton label="Partners" variant="ghost" trailing-icon="i-lucide-chevron-down"
          class="text-sm font-medium text-white hover:text-bread-400 hover:bg-white/10 rounded-lg transition-colors px-2.5 py-1.5"
          :class="[open && 'text-bread-400 bg-white/10']" :ui="{
            trailingIcon: ['transition-transform duration-200 size-4', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
          }" />
      </UDropdownMenu>

      <!-- Cluster 4: More Information -->
      <UDropdownMenu v-slot="{ open }" :items="moreInfoItems" :modal="false"
        :content="{ align: 'start', side: 'bottom', sideOffset: 8 }" :ui="{
          content: 'bg-toast-600/70 backdrop-blur-md border border-toast-400/20 ring-transparent shadow-2xl rounded-xl p-1.5 min-w-56 text-white z-50',
          item: 'text-white hover:text-bread-400 hover:bg-toast-500/50 rounded-lg text-sm transition-colors cursor-pointer',
          itemLeadingIcon: 'text-bread-400 size-4'
        }">
        <UButton label="More Information" variant="ghost" trailing-icon="i-lucide-chevron-down"
          class="text-sm font-medium text-white hover:text-bread-400 hover:bg-white/10 rounded-lg transition-colors px-2.5 py-1.5"
          :class="[open && 'text-bread-400 bg-white/10']" :ui="{
            trailingIcon: ['transition-transform duration-200 size-4', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
          }" />
      </UDropdownMenu>
    </div>

    <template #right>
      <div class="flex items-center gap-4">
        <UButton to="/user/login" variant="link" color="bread" class="font-semibold text-white">Sign In</UButton>
        <UButton to="/user/signup" color="bread" variant="solid" class="font-bold text-toast-700">Get Started</UButton>
      </div>
    </template>
  </UHeader>

  <!-- Mobile Header (hidden on lg and up) -->
  <UHeader :ui="{ container: 'max-w-none w-full px-4 sm:px-6', toggle: 'hidden' }" :class="[
    'fixed top-0 w-full transition-all duration-300 z-50 border-none flex lg:hidden',
    isScrolled ? 'bg-toast-500/70 backdrop-blur-lg' : 'bg-transparent backdrop-blur-none'
  ]">
    <template #title>
      <UPopover v-model:open="isMobileMenuOpen"
        :ui="{ content: 'bread-container w-72 max-h-[85vh] overflow-y-auto bg-toast-600/95 backdrop-blur-md text-white p-3 border border-toast-400/20 shadow-2xl' }">
        <UButton :icon="isMobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" color="bread" variant="ghost" size="md"
          aria-label="Toggle menu" />

        <template #content>
          <div class="flex flex-col space-y-4">
            <!-- Cluster 1: About -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold uppercase tracking-wider text-bread-400 px-2 py-0.5">About</div>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="/about" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-sparkles" class="size-4 text-bread-400 mr-2" />
                </template>
                What is Bread + Butter
              </UButton>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="https://www.blinkpunch.com" target="_blank" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-building-2" class="size-4 text-bread-400 mr-2" />
                </template>
                Company Behind
              </UButton>
            </div>

            <div class="h-px bg-toast-500/50 -mx-1" />

            <!-- Cluster 2: Features -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold uppercase tracking-wider text-bread-400 px-2 py-0.5">Features</div>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                @click="scrollToSection('#pricing')">
                <template #leading>
                  <UIcon name="i-lucide-tag" class="size-4 text-bread-400 mr-2" />
                </template>
                Pricing
              </UButton>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                @click="scrollToSection('#benefits')">
                <template #leading>
                  <UIcon name="i-lucide-award" class="size-4 text-bread-400 mr-2" />
                </template>
                Benefits
              </UButton>
            </div>

            <div class="h-px bg-toast-500/50 -mx-1" />

            <!-- Cluster 3: Partners -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold uppercase tracking-wider text-bread-400 px-2 py-0.5">Partners</div>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="/our-suppliers" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-store" class="size-4 text-bread-400 mr-2" />
                </template>
                Our Suppliers
              </UButton>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="/partners/login" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-handshake" class="size-4 text-bread-400 mr-2" />
                </template>
                Partners
              </UButton>
            </div>

            <div class="h-px bg-toast-500/50 -mx-1" />

            <!-- Cluster 4: More Information -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold uppercase tracking-wider text-bread-400 px-2 py-0.5">More Information
              </div>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="/faqs" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-help-circle" class="size-4 text-bread-400 mr-2" />
                </template>
                FAQs
              </UButton>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="/news-and-events" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-calendar-days" class="size-4 text-bread-400 mr-2" />
                </template>
                News and Events
              </UButton>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="/useful-tips" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-lightbulb" class="size-4 text-bread-400 mr-2" />
                </template>
                Useful Tips
              </UButton>
              <UButton variant="ghost"
                class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                to="/contact-us" @click="closeMobileMenu">
                <template #leading>
                  <UIcon name="i-lucide-mail" class="size-4 text-bread-400 mr-2" />
                </template>
                Contact us
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>
      <NuxtLink to="/" class="flex items-center gap-2" @click="closeMobileMenu">
        <img class="h-7 w-auto" src="~/assets/bpb-icons/logo-white.svg" alt="Bread + Butter Logo" />
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

  <UFooter class="bg-bread-400">
    <template #left>
      <p class="text-sm text-toast-600">
        Copyright © {{ new Date().getFullYear() }} Bread+Butter. All rights reserved.
      </p>
    </template>

    <template #right>
      <UButton v-for="link in links" :key="link.to" :to="link.to" color="neutral" variant="ghost">
        {{ link.label }}
      </UButton>
    </template>
  </UFooter>
</template>

<style></style>