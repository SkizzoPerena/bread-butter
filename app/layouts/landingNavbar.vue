<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuth, getStoredAccessToken, ensureSession } from '~/composables/useAuth'

const route = useRoute()
const { isAuthenticated } = useAuth('user')

if (isAuthenticated.value || (import.meta.client && Boolean(getStoredAccessToken('user')))) {
  setPageLayout('signed-in-navbar')
}

watch(isAuthenticated, (authed) => {
  if (authed) {
    setPageLayout('signed-in-navbar')
  }
})

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
  onPartnerItemMouseLeave()
  if (route.path !== '/') {
    isScrolled.value = true
    return
  }
  // On index page (/), transition when scrolled past 50vh
  isScrolled.value = window.scrollY > window.innerHeight * 0.5
}

watch(() => route.path, () => {
  onPartnerItemMouseLeave()
  handleScroll()
})

onMounted(async () => {
  if (isAuthenticated.value || Boolean(getStoredAccessToken('user'))) {
    await ensureSession('user')
    setPageLayout('signed-in-navbar')
    return
  }
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', onPartnerItemMouseLeave, { passive: true })
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
  window.removeEventListener('resize', onPartnerItemMouseLeave)
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
interface PartnerNavItem extends DropdownMenuItem {
  descriptionText: string
  iconBgClass: string
  badge?: string
}

const partnersItems: PartnerNavItem[][] = [
  [
    {
      label: 'Our Bakery',
      icon: 'i-lucide-store',
      to: '/our-suppliers',
      active: false,
      iconBgClass: 'bg-amber-600',
      badge: 'Supplier Directory',
      descriptionText: 'Browse our curated directory of trusted wedding suppliers, venues, and caterers categorized across signature service tiers.'
    },
    {
      label: 'Dough Makers',
      icon: 'i-lucide-handshake',
      to: '/partners/login',
      active: false,
      iconBgClass: 'bg-emerald-600',
      badge: 'Referral Partners',
      descriptionText: 'All partners welcome! Access your dashboard here to manage your referrals and finances.'
    },
    {
      label: 'Bakers',
      icon: 'i-lucide-chef-hat',
      to: '/bakers/login',
      active: false,
      iconBgClass: 'bg-toast-600',
      badge: 'Supplier Portal',
      descriptionText: 'Are you a part of our bakery? Sign in here to access your partnership portal.'
    }
  ]
]

const hoveredPartnerItem = ref<PartnerNavItem | null>(null)
const cursorPosition = ref({ x: 0, y: 0 })
const isHoverTooltipVisible = ref(false)

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 1024
}

function onPartnerItemMouseEnter(event: MouseEvent, item: PartnerNavItem) {
  if (isMobileViewport()) return
  hoveredPartnerItem.value = item
  cursorPosition.value = { x: event.clientX, y: event.clientY }
  isHoverTooltipVisible.value = true
}

function onPartnerItemMouseMove(event: MouseEvent) {
  if (isMobileViewport() || !isHoverTooltipVisible.value) return
  cursorPosition.value = { x: event.clientX, y: event.clientY }
}

function onPartnerItemMouseLeave() {
  isHoverTooltipVisible.value = false
  hoveredPartnerItem.value = null
}

const activeTooltipData = computed(() => {
  if (!hoveredPartnerItem.value) return null
  return {
    label: hoveredPartnerItem.value.label,
    description: hoveredPartnerItem.value.descriptionText,
    icon: hoveredPartnerItem.value.icon || 'i-lucide-sparkles',
    iconBgClass: hoveredPartnerItem.value.iconBgClass || 'bg-toast-600',
    badge: hoveredPartnerItem.value.badge
  }
})

const tooltipPosition = computed(() => {
  const x = cursorPosition.value.x
  const y = cursorPosition.value.y

  if (typeof window === 'undefined') {
    return {
      left: `${x + 18}px`,
      top: `${y}px`,
      arrowTop: '50%',
      transform: 'translate(0, -50%)',
      isRight: true
    }
  }

  const tooltipWidth = 336
  const placeRight = x + tooltipWidth + 24 <= window.innerWidth

  const minY = 75
  const maxY = window.innerHeight - 75
  const clampedY = Math.max(minY, Math.min(maxY, y))
  const arrowOffset = Math.max(-45, Math.min(45, y - clampedY))

  return {
    left: placeRight ? `${x + 18}px` : `${x - 18}px`,
    top: `${clampedY}px`,
    arrowTop: `calc(50% + ${arrowOffset}px)`,
    transform: placeRight ? 'translate(0, -50%)' : 'translate(-100%, -50%)',
    isRight: placeRight
  }
})

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
      <div class="flex items-center gap-2.5">
        <NuxtLink to="/" class="flex items-center">
          <img class="h-10 w-auto" src="~/assets/bpb-icons/logo-white.svg" alt="Bread + Butter Logo" />
        </NuxtLink>
        <UBadge color="bread" variant="subtle" size="xs"
          class="text-[10px] sm:text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-full border border-bread-400/30 text-bread-200 bg-bread-400/15">
          Closed Testing
        </UBadge>
      </div>
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
      <UDropdownMenu :items="partnersItems" :modal="false" :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
        @update:open="(val: boolean) => { if (!val) onPartnerItemMouseLeave() }" :ui="{
          content: 'bg-toast-600/70 backdrop-blur-md border border-toast-400/20 ring-transparent shadow-2xl rounded-xl p-1.5 min-w-56 text-white z-50',
          item: 'text-white hover:text-bread-400 hover:bg-toast-500/50 rounded-lg text-sm transition-colors cursor-pointer',
          itemLeadingIcon: 'text-bread-400 size-4'
        }">
        <template #default="{ open }">
          <UButton label="Partners" variant="ghost" trailing-icon="i-lucide-chevron-down"
            class="text-sm font-medium text-white hover:text-bread-400 hover:bg-white/10 rounded-lg transition-colors px-2.5 py-1.5"
            :class="[open && 'text-bread-400 bg-white/10']" :ui="{
              trailingIcon: ['transition-transform duration-200 size-4', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
            }" />
        </template>

        <template #item="{ item }">
          <div class="flex items-center gap-2 w-full py-0.5 select-none"
            @mouseenter="onPartnerItemMouseEnter($event, item as PartnerNavItem)"
            @mousemove="onPartnerItemMouseMove($event)" @mouseleave="onPartnerItemMouseLeave"
            @click="onPartnerItemMouseLeave">
            <UIcon :name="item.icon" class="text-bread-400 size-4 shrink-0" />
            <span class="truncate">{{ item.label }}</span>
          </div>
        </template>
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
    <template #left>
      <div class="flex items-center gap-2">
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
                  Our Bakery
                </UButton>
                <UButton variant="ghost"
                  class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                  to="/partners/login" @click="closeMobileMenu">
                  <template #leading>
                    <UIcon name="i-lucide-handshake" class="size-4 text-bread-400 mr-2" />
                  </template>
                  Dough Makers
                </UButton>
                <UButton variant="ghost"
                  class="w-full justify-start text-sm text-white hover:text-bread-400 hover:bg-toast-500/40 rounded-lg"
                  to="/bakers/login" @click="closeMobileMenu">
                  <template #leading>
                    <UIcon name="i-lucide-chef-hat" class="size-4 text-bread-400 mr-2" />
                  </template>
                  Bakers
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
        <div class="flex items-center gap-2">
          <NuxtLink to="/" class="flex items-center" @click="closeMobileMenu">
            <img class="h-7 w-auto" src="~/assets/bpb-icons/logo-white.svg" alt="Bread + Butter Logo" />
          </NuxtLink>
          <UBadge color="bread" variant="subtle" size="xs"
            class="text-[10px] font-medium tracking-wide px-1.5 py-0.5 rounded-full border border-bread-400/30 text-bread-200 bg-bread-400/15">
            Closed Testing
          </UBadge>
        </div>
      </div>
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

  <UFooter v-if="!route.meta.hideFooter" class="bg-bread-400 flex flex-col items-center">
    <!--<template #left>-->
    <p class="text-sm text-toast-600">
      Copyright © {{ new Date().getFullYear() }} Bread+Butter. All rights reserved.
    </p>
    <!--  </template>-->

    <!-- <template #right>
      <UButton v-for="link in links" :key="link.to" :to="link.to" color="neutral" variant="ghost">
        {{ link.label }}
      </UButton>
    </template> -->
  </UFooter>

  <!-- Desktop Hover Tooltip Pop-up for Partners subitems -->
  <ClientOnly>
    <Teleport to="body">
      <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
        <div v-if="isHoverTooltipVisible && activeTooltipData" id="partner-nav-cursor-tooltip" role="tooltip"
          aria-hidden="true" class="hidden lg:block fixed z-9999 pointer-events-none select-none w-80 sm:w-84" :style="{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            transform: tooltipPosition.transform,
          }">
          <div class="relative rounded-xl bg-toast-500 text-bread-50 p-4 shadow-xl ring-1 ring-toast-400/20">
            <!-- Arrow notch pointing right when tooltip is to the left of cursor -->
            <div v-if="!tooltipPosition.isRight"
              class="absolute -right-1.5 w-3 h-3 bg-toast-500 rotate-45 border-t border-r border-toast-400/20 -translate-y-1/2"
              :style="{ top: tooltipPosition.arrowTop }" />
            <!-- Arrow notch pointing left when tooltip is to the right of cursor -->
            <div v-else
              class="absolute -left-1.5 w-3 h-3 bg-toast-500 rotate-45 border-b border-l border-toast-400/20 -translate-y-1/2"
              :style="{ top: tooltipPosition.arrowTop }" />

            <div class="flex items-center gap-2.5 mb-2">
              <div class="size-6.5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                :class="activeTooltipData.iconBgClass">
                <UIcon :name="activeTooltipData.icon" class="size-4 text-white" />
              </div>
              <div class="font-semibold text-sm tracking-wide text-white flex-1 truncate font-serif">
                {{ activeTooltipData.label }}
              </div>
              <UBadge v-if="activeTooltipData.badge" color="neutral" size="xs" variant="subtle"
                class="text-[10px] font-semibold text-bread-200 bg-white/10 border border-white/15">
                {{ activeTooltipData.badge }}
              </UBadge>
            </div>
            <p class="text-xs sm:text-sm text-bread-100/95 leading-relaxed">
              {{ activeTooltipData.description }}
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<style></style>