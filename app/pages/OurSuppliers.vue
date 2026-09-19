<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  SUPPLIERS_DIRECTORY_DATA,
  type SupplierTier,
  type DirectorySupplier,
  type SupplierSubCategory
} from '~/data/suppliersDirectory'

definePageMeta({
  layout: 'landing-navbar',
  hideFooter: true,
})

useHead({
  title: 'Our Suppliers - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'A comprehensive curated directory of trusted wedding suppliers categorized in our signature 3-tier system: Bread Basket, Loaf, and Slice.'
    }
  ]
})

const searchQuery = ref('')
const selectedCategoryId = ref<string>('all')
const selectedTier = ref<string>('all') // 'all' | 'bread-basket' | 'loaf' | 'slice'



const activeCategoryTitle = computed(() => {
  if (selectedCategoryId.value === 'all') return 'All Suppliers'
  const cat = SUPPLIERS_DIRECTORY_DATA.find((c) => c.id === selectedCategoryId.value)
  return cat ? cat.title : 'All Suppliers'
})

// Bread Basket suppliers for the spotlight showcase
const breadBasketShowcase = computed(() => {
  const showcase: (DirectorySupplier & { categoryTitle: string; icon: string })[] = []
  const seen = new Set<string>()

  for (const cat of SUPPLIERS_DIRECTORY_DATA) {
    if (selectedCategoryId.value !== 'all' && cat.id !== selectedCategoryId.value) continue
    for (const sub of cat.subcategories) {
      for (const vendor of sub.vendors) {
        if (vendor.tier === 'bread-basket' && !seen.has(vendor.name)) {
          seen.add(vendor.name)
          showcase.push({
            ...vendor,
            categoryTitle: cat.title,
            icon: cat.icon
          })
        }
      }
    }
  }
  return showcase
})

// Filtered categories based on search, category selection, and tier filter
const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const categoryFilter = selectedCategoryId.value
  const tierFilter = selectedTier.value

  return SUPPLIERS_DIRECTORY_DATA
    .filter((cat) => {
      if (categoryFilter !== 'all' && cat.id !== categoryFilter) {
        return false
      }
      return true
    })
    .map((cat) => {
      const matchingSubcategories = cat.subcategories
        .map((sub) => {
          let matchingVendors = sub.vendors

          // Filter by tier
          if (tierFilter !== 'all') {
            matchingVendors = matchingVendors.filter((v) => v.tier === tierFilter)
          }

          // Filter by search query
          if (query) {
            matchingVendors = matchingVendors.filter((v) => {
              const matchesName = v.name.toLowerCase().includes(query)
              const matchesTagline = v.tagline?.toLowerCase().includes(query) ?? false
              const matchesCategory = cat.title.toLowerCase().includes(query)
              const matchesSubcategory = sub.title.toLowerCase().includes(query)
              const matchesTier = v.tier.toLowerCase().includes(query)
              return matchesName || matchesTagline || matchesCategory || matchesSubcategory || matchesTier
            })
          }

          if (matchingVendors.length > 0) {
            return {
              ...sub,
              vendors: matchingVendors
            }
          }
          return null
        })
        .filter(Boolean) as SupplierSubCategory[]

      return {
        ...cat,
        subcategories: matchingSubcategories
      }
    })
    .filter((cat) => cat.subcategories.length > 0)
})

const totalVisibleSuppliersCount = computed(() => {
  let count = 0
  for (const cat of filteredCategories.value) {
    for (const sub of cat.subcategories) {
      count += sub.vendors.length
    }
  }
  return count
})

function getVendorsByTier(sub: SupplierSubCategory, tier: SupplierTier) {
  return sub.vendors.filter((v) => v.tier === tier)
}

function clearFilters() {
  searchQuery.value = ''
  selectedCategoryId.value = 'all'
  selectedTier.value = 'all'
}

function isSpecialVendor(vendorName: string): boolean {
  return vendorName.toLowerCase().includes('creative preppers')
}

function getTierLabel(tier: string): string {
  if (tier === 'bread-basket') return 'Bread Basket'
  if (tier === 'loaf') return 'Loaf'
  if (tier === 'slice') return 'Slice'
  return 'All Tiers'
}

interface CategoryTheme {
  color: string
  solidHeaderClass: string
  borderClass: string
  dotClass: string
  iconColorClass: string
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  'food-beverage': {
    color: 'orange',
    solidHeaderClass: 'bg-orange-600',
    borderClass: 'border-orange-300/60',
    dotClass: 'bg-orange-500',
    iconColorClass: 'text-orange-600'
  },
  'photo-video': {
    color: 'blue',
    solidHeaderClass: 'bg-blue-600',
    borderClass: 'border-blue-300/60',
    dotClass: 'bg-blue-500',
    iconColorClass: 'text-blue-600'
  },
  'entertainment': {
    color: 'emerald',
    solidHeaderClass: 'bg-emerald-600',
    borderClass: 'border-emerald-300/60',
    dotClass: 'bg-emerald-500',
    iconColorClass: 'text-emerald-600'
  },
  'styling-production': {
    color: 'fuchsia',
    solidHeaderClass: 'bg-fuchsia-600',
    borderClass: 'border-fuchsia-300/60',
    dotClass: 'bg-fuchsia-500',
    iconColorClass: 'text-fuchsia-600'
  },
  'formal-wear': {
    color: 'violet',
    solidHeaderClass: 'bg-violet-600',
    borderClass: 'border-violet-300/60',
    dotClass: 'bg-violet-500',
    iconColorClass: 'text-violet-600'
  },
  'vanity-hmu': {
    color: 'pink',
    solidHeaderClass: 'bg-pink-600',
    borderClass: 'border-pink-300/60',
    dotClass: 'bg-pink-500',
    iconColorClass: 'text-pink-600'
  },
  'prints-stationery': {
    color: 'teal',
    solidHeaderClass: 'bg-teal-600',
    borderClass: 'border-teal-300/60',
    dotClass: 'bg-teal-500',
    iconColorClass: 'text-teal-600'
  },
  'favors-accessories-registry': {
    color: 'amber',
    solidHeaderClass: 'bg-amber-600',
    borderClass: 'border-amber-300/60',
    dotClass: 'bg-amber-500',
    iconColorClass: 'text-amber-600'
  }
}

function getCategoryTheme(catId: string): CategoryTheme {
  return (
    CATEGORY_THEMES[catId] ?? {
      color: 'toast',
      solidHeaderClass: 'bg-toast-600',
      borderClass: 'border-toast-300/60',
      dotClass: 'bg-toast-500',
      iconColorClass: 'text-toast-600'
    }
  )
}
</script>

<template>
  <div
    class="min-h-screen bg-toast-700 text-white pt-20 pb-12 px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 w-full">

    <!-- Left Side: Inset Floating UDashboardPanel (1 column in 4-column layout) -->
    <div class="lg:col-span-1 w-full py-4">
      <UDashboardPanel id="suppliers-categories" :resizable="false"
        class="bread-container w-full bg-bread-400 text-toast-900 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-6 sm:p-8 space-y-6 z-30 shadow-md border-none"
        :ui="{ root: '!sticky top-24 min-h-0 h-auto rounded-xl border-none shadow-md' }">
        <!-- 1. Search Bar on Top -->
        <div>
          <div class="relative">
            <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Search suppliers or specialty..."
              class="w-full bg-white/90 text-toast-900 border-toast-300 focus:border-toast-600 rounded-md shadow-xs text-xs" />
            <button v-if="searchQuery" type="button" @click="searchQuery = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-toast-500 hover:text-toast-900 cursor-pointer p-0.5 rounded"
              title="Clear search">
              <UIcon name="i-lucide-x" class="size-3" />
            </button>
          </div>
        </div>

        <!-- 2. Tiers Button Group -->
        <div>
          <h3
            class="text-xs font-bold uppercase tracking-wider text-toast-700 border-b border-toast-600/20 pb-1.5 mb-2 flex items-center gap-1.5">
            <UIcon name="i-lucide-layers" class="size-3.5" />
            Filter By Tier
          </h3>
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" @click="selectedTier = 'all'" :class="[
              'w-full flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-md transition-all text-center cursor-pointer',
              selectedTier === 'all'
                ? 'bg-toast-600 text-white shadow-xs font-semibold border border-toast-600'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'
            ]">
              <span class="truncate">All Tiers</span>
            </button>
            <button type="button" @click="selectedTier = 'bread-basket'" :class="[
              'w-full flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-md transition-all text-center cursor-pointer',
              selectedTier === 'bread-basket'
                ? 'bg-toast-600 text-white shadow-xs font-semibold border border-toast-600'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'
            ]">
              <span class="truncate">Bread Basket</span>
            </button>
            <button type="button" @click="selectedTier = 'loaf'" :class="[
              'w-full flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-md transition-all text-center cursor-pointer',
              selectedTier === 'loaf'
                ? 'bg-toast-600 text-white shadow-xs font-semibold border border-toast-600'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'
            ]">
              <span class="truncate">Loaf</span>
            </button>
            <button type="button" @click="selectedTier = 'slice'" :class="[
              'w-full flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-md transition-all text-center cursor-pointer',
              selectedTier === 'slice'
                ? 'bg-toast-600 text-white shadow-xs font-semibold border border-toast-600'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'
            ]">
              <span class="truncate">Slice</span>
            </button>
          </div>
        </div>

        <!-- 3. Categories Button Group -->
        <div>
          <h3
            class="text-xs font-bold uppercase tracking-wider text-toast-700 border-b border-toast-600/20 pb-1.5 mb-2 flex items-center gap-1.5">
            <UIcon name="i-lucide-store" class="size-3.5" />
            Categories
          </h3>

          <!-- Categories Filter Navigation -->
          <div class="space-y-0.5">
            <button type="button" @click="selectedCategoryId = 'all'" :class="[
              'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all text-left cursor-pointer',
              selectedCategoryId === 'all'
                ? 'bg-toast-600 text-white shadow-xs font-semibold'
                : 'text-toast-800 hover:bg-toast-500/10'
            ]">
              <UIcon name="i-lucide-store" class="size-3.5 shrink-0" />
              <span class="truncate">All Categories</span>
            </button>

            <button v-for="cat in SUPPLIERS_DIRECTORY_DATA" :key="cat.id" type="button"
              @click="selectedCategoryId = cat.id" :class="[
                'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all text-left cursor-pointer',
                selectedCategoryId === cat.id
                  ? 'bg-toast-600 text-white shadow-xs font-semibold'
                  : 'text-toast-800 hover:bg-toast-500/10'
              ]">
              <span class="size-2 rounded-full shrink-0" :class="getCategoryTheme(cat.id).dotClass" />
              <UIcon :name="cat.icon" class="size-3.5 shrink-0" />
              <span class="truncate">{{ cat.title }}</span>
            </button>
          </div>
        </div>
      </UDashboardPanel>
    </div>

    <!-- Right Side: Main Content Area spanning remaining 3 columns (Results Only) -->
    <main class="lg:col-span-3 w-full min-w-0 py-4 space-y-6">
      <!-- Results Header: Active Category Title and counts -->
      <div
        class="bread-container bg-bread-400 text-toast-900 p-5 sm:p-6 shadow-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold font-serif text-toast-800">
            {{ activeCategoryTitle }}
          </h2>
          <p class="text-xs text-toast-700 mt-1 flex flex-wrap items-center gap-1.5">
            <span>Showing {{ totalVisibleSuppliersCount }} supplier{{ totalVisibleSuppliersCount === 1 ? '' : 's'
              }}</span>
            <span v-if="selectedTier !== 'all'" class="font-semibold text-toast-900">
              • {{ getTierLabel(selectedTier) }} Tier
            </span>
            <span v-if="searchQuery" class="font-semibold text-toast-900">
              • Matching "{{ searchQuery }}"
            </span>
          </p>
        </div>

        <UButton to="/user/login" color="primary" variant="solid"
          class="font-semibold bg-toast-600 hover:bg-toast-700 text-white shrink-0 self-start sm:self-auto rounded-lg shadow-xs">
          Contact our trusted suppliers
        </UButton>
      </div>

      <!-- Bread Basket Spotlight Showcase -->
      <div
        v-if="(selectedTier === 'all' || selectedTier === 'bread-basket') && !searchQuery && breadBasketShowcase.length > 0"
        class="rounded-2xl overflow-hidden bg-bread-400 border-none shadow-md">
        <div
          class="bg-amber-600 bg-gradient-to-br from-amber-600/90 via-amber-500 to-orange-500 text-white px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div class="space-y-0.5">
            <div class="inline-flex items-center gap-1.5 text-amber-100 text-[11px] font-bold uppercase tracking-wider">
              <span>🥖</span>
              <span>Spotlight Showcase</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-bold font-serif text-white">
              Bread Basket Suppliers
            </h3>
          </div>
          <UButton to="/user/login" color="neutral" variant="solid"
            class="font-bold bg-white hover:bg-amber-50 text-amber-900 rounded-lg shrink-0 self-start sm:self-auto shadow-xs">
            Book Spotlight Suppliers
          </UButton>
        </div>

        <!-- Bread Basket Cards Grid (Largest Size - 3 Columns) -->
        <div class="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="bb in breadBasketShowcase" :key="bb.name"
            class="bg-white rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group border-none">
            <div class="space-y-3">
              <!-- Logo Box with Image -->
              <div
                class="w-full h-20 rounded-lg bg-toast-950/5 flex items-center justify-center p-2.5 overflow-hidden shadow-inner group-hover:scale-[1.02] transition-transform duration-200">
                <img v-if="bb.logo" :src="bb.logo" :alt="bb.name"
                  class="max-h-full max-w-full object-contain filter drop-shadow-xs" loading="lazy" />
                <div v-else class="text-lg font-serif font-bold text-amber-900">
                  {{ bb.name }}
                </div>
              </div>

              <!-- Card Content -->
              <div class="space-y-1.5">
                <h4 class="text-lg font-bold font-serif text-toast-900 group-hover:text-amber-800 transition-colors">
                  {{ bb.name }}
                </h4>

                <!-- Location moved under brand name -->
                <div v-if="bb.location" class="flex items-center gap-1 text-[11px] text-toast-600 font-medium">
                  <UIcon name="i-lucide-map-pin" class="size-3 text-amber-700/80 shrink-0" />
                  <span>{{ bb.location }}</span>
                </div>

                <p v-if="bb.tagline" class="text-xs text-toast-800/90 leading-relaxed line-clamp-2">
                  {{ bb.tagline }}
                </p>
              </div>
            </div>

            <!-- Footer CTA -->
            <div class="pt-3 mt-3 border-t border-bread-200/80 flex items-center justify-between">
              <span class="text-xs font-semibold text-toast-600 flex items-center gap-1">
                <UIcon :name="bb.icon" class="size-3.5 text-toast-500" />
                {{ bb.categoryTitle }}
              </span>
              <NuxtLink to="/user/login"
                class="text-xs font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Connect</span>
                <UIcon name="i-lucide-arrow-right" class="size-3" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results State -->
      <div v-if="filteredCategories.length === 0"
        class="bread-container bg-bread-400 text-toast-900 rounded-xl p-8 sm:p-12 text-center shadow-md space-y-3">
        <div class="size-12 rounded-full bg-toast-600/10 text-toast-600 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-search-x" class="size-6" />
        </div>
        <h3 class="text-xl font-bold font-serif text-toast-900">No Suppliers Found</h3>
        <p class="text-sm text-toast-700/80 max-w-sm mx-auto">
          We couldn't find any suppliers matching your criteria. Try adjusting your search keyword or clearing tier
          filters.
        </p>
        <UButton color="primary" variant="soft" size="sm" class="font-medium mt-2 cursor-pointer" @click="clearFilters">
          Reset Filters
        </UButton>
      </div>

      <!-- Supplier Category Sections -->
      <div v-else class="space-y-6">
        <section v-for="cat in filteredCategories" :key="cat.id" class="space-y-6 scroll-mt-28">
          <!-- Subcategories Display -->
          <div class="space-y-6">
            <div v-for="sub in cat.subcategories" :key="sub.title"
              class="rounded-xl overflow-hidden bg-bread-400 border-none shadow-md">
              <!-- Solid Color Header on top of container -->
              <div class="px-4 sm:px-5 py-3 text-white flex items-center justify-between shadow-2xs"
                :class="getCategoryTheme(cat.id).solidHeaderClass">
                <div class="flex items-center gap-2.5">
                  <div class="size-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <UIcon :name="cat.icon" class="size-4 text-white" />
                  </div>
                  <div>
                    <h3 class="text-sm sm:text-base font-bold font-serif text-white flex items-center gap-2">
                      {{ sub.title }}
                    </h3>
                    <span v-if="selectedCategoryId === 'all'" class="text-[11px] text-white/85 font-medium block">
                      {{ cat.title }}
                    </span>
                  </div>
                </div>
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/20 text-white shrink-0">
                  {{ sub.vendors.length }} supplier{{ sub.vendors.length === 1 ? '' : 's' }}
                </span>
              </div>

              <!-- Container Body -->
              <div class="p-4 sm:p-5 space-y-5">
                <!-- TIER 1: BREAD BASKET (Largest Size with Attached Logos - 3 Columns) -->
                <div v-if="getVendorsByTier(sub, 'bread-basket').length > 0" class="space-y-2.5">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">🥖</span>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Bread Basket
                    </h4>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div v-for="vendor in getVendorsByTier(sub, 'bread-basket')" :key="vendor.name"
                      class="bg-white rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group border-none">
                      <div class="space-y-3">
                        <!-- Logo Image (Largest importance) -->
                        <div
                          class="w-full h-20 rounded-lg bg-toast-950/5 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-200">
                          <img v-if="vendor.logo" :src="vendor.logo" :alt="vendor.name"
                            class="max-h-full max-w-full object-contain" loading="lazy" />
                          <div v-else class="text-center">
                            <span class="text-xl">🥖</span>
                            <p class="text-xs font-serif font-bold text-amber-900 mt-0.5">{{ vendor.name }}</p>
                          </div>
                        </div>

                        <!-- Vendor Info -->
                        <div class="flex-1 space-y-1.5 w-full">
                          <h5
                            class="text-base font-bold font-serif text-toast-900 group-hover:text-amber-800 transition-colors">
                            {{ vendor.name }}
                          </h5>

                          <!-- Location moved under brand name -->
                          <div v-if="vendor.location"
                            class="flex items-center gap-1 text-[10px] text-toast-600 font-medium">
                            <UIcon name="i-lucide-map-pin" class="size-3 text-amber-700/80 shrink-0" />
                            <span>{{ vendor.location }}</span>
                          </div>

                          <p v-if="vendor.tagline" class="text-xs text-toast-800/90 leading-relaxed line-clamp-2">
                            {{ vendor.tagline }}
                          </p>
                        </div>
                      </div>

                      <div class="pt-2 mt-2 border-t border-bread-200/80 flex items-center justify-end">
                        <NuxtLink to="/user/login"
                          class="text-xs font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Connect</span>
                          <UIcon name="i-lucide-arrow-right" class="size-3" />
                        </NuxtLink>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- TIER 2: LOAF (Medium Size - 4 Columns) -->
                <div v-if="getVendorsByTier(sub, 'loaf').length > 0" class="space-y-2.5">
                  <div class="flex items-center gap-2 pt-1">
                    <span class="text-sm">🍞</span>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-toast-700">
                      Loaf
                    </h4>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    <div v-for="vendor in getVendorsByTier(sub, 'loaf')" :key="vendor.name"
                      class="bg-white rounded-lg p-3 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group border-none">
                      <div class="space-y-1.5">
                        <h5
                          class="text-sm font-bold font-serif text-toast-900 group-hover:text-toast-700 transition-colors">
                          {{ vendor.name }}
                        </h5>

                        <p v-if="vendor.tagline" class="text-xs text-toast-700/90 leading-relaxed line-clamp-2">
                          {{ vendor.tagline }}
                        </p>
                      </div>

                      <div class="pt-2 mt-2 border-t border-bread-200/80 flex items-center justify-end">
                        <NuxtLink to="/user/login"
                          class="text-[11px] font-semibold text-toast-600 group-hover:text-toast-900 transition-colors flex items-center gap-0.5">
                          <span>Details</span>
                          <UIcon name="i-lucide-arrow-right" class="size-3" />
                        </NuxtLink>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- TIER 3: SLICE (Smallest Size - Compact Chips) -->
                <div v-if="getVendorsByTier(sub, 'slice').length > 0" class="space-y-2">
                  <div class="flex items-center gap-2 pt-1">
                    <span class="text-sm">🥪</span>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-stone-600">
                      Slice
                    </h4>
                  </div>

                  <div class="flex flex-wrap gap-2 pt-0.5">
                    <div v-for="vendor in getVendorsByTier(sub, 'slice')" :key="vendor.name">
                      <!-- Special Subtle Highlight for Creative Preppers redirecting to login if slice -->
                      <NuxtLink v-if="isSpecialVendor(vendor.name)" to="/user/login"
                        class="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50/70 text-xs font-bold text-amber-900 flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer border-none"
                        title="Log in to contact Creative Preppers">
                        <UIcon name="i-ph-sparkle-fill" class="size-3.5 text-amber-600" />
                        <span>{{ vendor.name }}</span>
                        <UBadge color="warning" variant="solid" size="xs"
                          class="text-[9px] py-0 px-1 font-bold uppercase">
                          Featured
                        </UBadge>
                      </NuxtLink>

                      <!-- Standard Slice Mini-Chip (Smallest Size) -->
                      <div v-else
                        class="px-2.5 py-1.5 rounded-md bg-white hover:bg-white/90 text-xs font-medium text-toast-900 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 group cursor-default border-none">
                        <span
                          class="size-1.5 rounded-full bg-toast-400 group-hover:bg-toast-600 transition-colors shrink-0"></span>
                        <span>{{ vendor.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>

      <!-- Footer Callout -->
      <div class="bread-container bg-bread-400 text-toast-900 rounded-xl p-6 sm:p-8 shadow-md text-center space-y-3">
        <h3 class="text-xl font-bold font-serif text-toast-900">
          Are you an event vendor or partner?
        </h3>
        <p class="text-sm text-toast-800/80 max-w-lg mx-auto">
          Join the Bread + Butter supplier directory with our Slice, Loaf, or Bread Basket tiers to connect with
          celebrants, manage bookings, and coordinate directly with event planners.
        </p>
        <div class="pt-2 flex justify-center gap-3">
          <UButton to="/partners/signup" color="primary" size="md"
            class="font-bold shadow-md bg-toast-600 hover:bg-toast-700 text-white">
            Partner With Us
          </UButton>
          <UButton to="/contact-us" variant="outline" color="neutral" size="md"
            class="font-medium text-toast-800 border-toast-300 hover:bg-white">
            Contact Support
          </UButton>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {

  :deep(#dashboard-panel-suppliers-categories),
  #dashboard-panel-suppliers-categories {
    position: sticky !important;
    top: 6rem !important;
  }
}
</style>
