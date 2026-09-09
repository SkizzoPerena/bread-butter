<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'News & Events - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Stay updated on upcoming wedding expos, bridal fairs, product feature releases, and community workshops from Bread + Butter.'
    }
  ]
})

interface NewsEventItem {
  title: string
  date: string
  tag: string
  description: string
  icon: string
  badgeColor?: string
}

interface NewsEventCategory {
  id: string
  title: string
  icon: string
  items: NewsEventItem[]
}

const searchQuery = ref('')
const selectedCategoryId = ref<string>('all')

const categories: NewsEventCategory[] = [
  {
    id: 'product-updates',
    title: 'Platform Releases & Features',
    icon: 'i-lucide-sparkles',
    items: [
      {
        title: 'Bread + Butter 2.0 Collaborative Workspace',
        date: 'Upcoming • Q2 2026',
        tag: 'Feature Drop',
        description: 'Real-time collaborative editing for seating plans and vendor checklists between celebrants and their coordinators.',
        icon: 'i-lucide-layers'
      },
      {
        title: 'Automated RSVP Reminders & SMS Delivery',
        date: 'Upcoming • Q3 2026',
        tag: 'Communication',
        description: 'Send polite automated nudges via SMS and email to pending guests before your catering cutoff deadline.',
        icon: 'i-lucide-mail'
      },
      {
        title: 'Enhanced Multi-Event Dashboard for Planners',
        date: 'Upcoming • Q3 2026',
        tag: 'Planner Tools',
        description: 'Consolidated client portal with customizable permission levels, task boards, and invoice schedules.',
        icon: 'i-lucide-kanban'
      }
    ]
  },
  {
    id: 'expos-fairs',
    title: 'Bridal Expos & Community Fairs',
    icon: 'i-lucide-calendar-heart',
    items: [
      {
        title: 'Metro Bridal Expo 2026 - Interactive Lounge',
        date: 'June 2026 • Grand Ballroom',
        tag: 'In-Person Expo',
        description: 'Meet our founding team, test-drive interactive wedding websites on touch displays, and claim exclusive partner vouchers.',
        icon: 'i-lucide-map-pin'
      },
      {
        title: 'Celebrations & Beyond Annual Wedding Fair',
        date: 'August 2026 • SMX Convention Center',
        tag: 'Partner Showcase',
        description: 'Discover over 50 Bread + Butter verified suppliers, from boutique bakers to luxury photography studios.',
        icon: 'i-lucide-sparkles'
      }
    ]
  },
  {
    id: 'workshops-webinars',
    title: 'Webinars & Partner Masterclasses',
    icon: 'i-lucide-presentation',
    items: [
      {
        title: 'Masterclass: Streamlining Client Workflows with Digital Hubs',
        date: 'July 2026 • Live Online',
        tag: 'Planner Webinar',
        description: 'Veteran event coordinators demonstrate how to cut 15+ administrative hours per couple using automated checklists.',
        icon: 'i-lucide-video'
      },
      {
        title: 'Vendor Spotlight: Crafting Standout Supplier Profiles',
        date: 'September 2026 • Live Online',
        tag: 'Vendor Workshop',
        description: 'Tips for suppliers on maximizing bookings, structuring transparent pricing packages, and managing client reviews.',
        icon: 'i-lucide-store'
      }
    ]
  }
]

const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const catFilter = selectedCategoryId.value

  return categories
    .filter((cat) => {
      if (catFilter !== 'all' && cat.id !== catFilter) return false
      return true
    })
    .map((cat) => {
      if (!query) return cat
      const matchingItems = cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tag.toLowerCase().includes(query)
      )
      return { ...cat, items: matchingItems }
    })
    .filter((cat) => cat.items.length > 0)
})

const totalItemsCount = computed(() => {
  return categories.reduce((sum, cat) => sum + cat.items.length, 0)
})
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto space-y-8">

      <!-- Hero Header -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <h1 class="text-4xl sm:text-5xl font-bold font-serif text-bread-400">
          News and Events
        </h1>
        <p class="text-base sm:text-lg text-white/90 leading-relaxed">
          Stay informed on platform improvements, upcoming bridal showcases, partner masterclasses, and community gatherings.
        </p>
      </div>

      <!-- Main Content Container (styled consistently with Our Suppliers page) -->
      <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-10 lg:p-12 space-y-8">

        <!-- Search & Filter Controls -->
        <div class="space-y-4 border-b border-toast-600/20 pb-6">
          <div class="max-w-md mx-auto">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Search news, topics, or events..."
              size="lg"
              class="w-full bg-white/90 rounded-xl"
            />
          </div>

          <!-- Category Chips -->
          <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer"
              :class="selectedCategoryId === 'all'
                ? 'bg-toast-600 text-white shadow-xs'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'"
              @click="selectedCategoryId = 'all'"
            >
              All Topics ({{ totalItemsCount }})
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5"
              :class="selectedCategoryId === cat.id
                ? 'bg-toast-600 text-white shadow-xs'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'"
              @click="selectedCategoryId = cat.id"
            >
              <UIcon :name="cat.icon" class="size-3.5" />
              <span>{{ cat.title }}</span>
            </button>
          </div>
        </div>

        <!-- No Results State -->
        <div v-if="filteredCategories.length === 0" class="text-center py-12 space-y-3">
          <div class="size-12 rounded-full bg-toast-600/10 text-toast-600 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-search-x" class="size-6" />
          </div>
          <h3 class="text-xl font-bold font-serif text-toast-900">No Announcements Found</h3>
          <p class="text-sm text-toast-700/80 max-w-sm mx-auto">
            We couldn't find any news or events matching "{{ searchQuery }}". Try a different search term or reset filters.
          </p>
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            class="font-medium mt-2"
            @click="searchQuery = ''; selectedCategoryId = 'all'"
          >
            Clear Filters
          </UButton>
        </div>

        <!-- Category Sections -->
        <div v-else class="space-y-12">
          <section v-for="cat in filteredCategories" :key="cat.id" class="space-y-6">
            <!-- Section Header -->
            <div class="flex items-center gap-3 border-b-2 border-toast-600/20 pb-3">
              <div class="size-10 rounded-xl bg-toast-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <UIcon :name="cat.icon" class="size-5" />
              </div>
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800">
                  {{ cat.title }}
                </h2>
              </div>
            </div>

            <!-- Items Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                v-for="item in cat.items"
                :key="item.title"
                class="bg-white/85 border border-toast-300/40 rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow duration-200"
              >
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-toast-600/10 text-toast-700">
                      {{ item.tag }}
                    </span>
                    <span class="text-xs text-toast-500 font-medium">
                      {{ item.date }}
                    </span>
                  </div>

                  <h3 class="text-base sm:text-lg font-bold font-serif text-toast-900 leading-snug">
                    {{ item.title }}
                  </h3>

                  <p class="text-sm text-toast-700/90 leading-relaxed">
                    {{ item.description }}
                  </p>
                </div>

                <div class="pt-4 mt-4 border-t border-toast-200/60 flex items-center justify-between text-xs text-toast-600 font-semibold">
                  <span>Coming Soon</span>
                  <UIcon :name="item.icon" class="size-4 text-toast-500" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Footer Callout -->
        <div class="border-t border-toast-600/20 pt-8 mt-10 text-center space-y-3">
          <h3 class="text-xl font-bold font-serif text-toast-900">
            Have an event or news to share with our community?
          </h3>
          <p class="text-sm text-toast-800/80 max-w-lg mx-auto">
            Partner with Bread + Butter for upcoming expos, workshops, and exclusive supplier promotions.
          </p>
          <div class="pt-2 flex justify-center gap-3">
            <UButton
              to="/contact-us"
              color="primary"
              size="md"
              class="font-bold shadow-md bg-toast-600 hover:bg-toast-700 text-white"
            >
              Contact Us
            </UButton>
            <UButton
              to="/partners/signup"
              variant="outline"
              color="neutral"
              size="md"
              class="font-medium text-toast-800 border-toast-300 hover:bg-white"
            >
              Partner With Us
            </UButton>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped></style>
