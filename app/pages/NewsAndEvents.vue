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
  location?: string
  link?: string
  linkText?: string
  statusText?: string
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
    id: 'expos-fairs',
    title: 'Bridal Expos & Community Fairs',
    icon: 'i-lucide-calendar-heart',
    items: [
      {
        title: 'Toast Wedding Fair',
        date: 'October 24–25',
        location: 'SMX Convention Center Manila',
        tag: 'Bridal Fair',
        description: 'Produced by Bride and Breakfast, Toast Wedding Fair is Manila’s premier curated bridal event featuring top-tier wedding suppliers, exclusive fair discounts, and inspiration under one roof.',
        icon: 'i-lucide-calendar-heart',
        link: 'https://www.facebook.com/toastweddingfair',
        linkText: 'View on Facebook'
      },
      {
        title: 'Getting Married Bridal Fair',
        date: 'November 14–15',
        location: 'Function Rooms 1 and 2, SMX Convention Center',
        tag: 'Bridal Fair',
        description: 'One of the Philippines’ premier bridal fairs gathering top caterers, photography studios, couture designers, and planners with grand supplier discounts and free admission.',
        icon: 'i-lucide-calendar-heart',
        link: 'https://www.facebook.com/gettingmarriedbridalfair',
        linkText: 'View on Facebook'
      },
      {
        title: '53rd Before I Do Bridal Fair',
        date: 'November 28–29',
        location: 'Megatrade Hall 1, SM Megamall',
        tag: 'Bridal Fair',
        description: 'Connect directly with trusted wedding partners for the 53rd edition of Before I Do, featuring exclusive venue deals, bridal freebies, and on-the-spot booking privileges.',
        icon: 'i-lucide-calendar-heart',
        link: 'https://www.facebook.com/B4.ido',
        linkText: 'View on Facebook'
      },
      {
        title: "The Wedding Library's Bridal Fair",
        date: 'February 5–7',
        location: 'World Trade Center',
        tag: 'Bridal Fair',
        description: "The Philippines' biggest bridal fair with hundreds of wedding experts, massive booking promos, and grand raffle prizes across three full days at the World Trade Center.",
        icon: 'i-lucide-calendar-heart',
        link: 'https://www.facebook.com/theweddinglibrary',
        linkText: 'View on Facebook'
      }
    ]
  },
  {
    id: 'workshops-webinars',
    title: 'Webinars & Partner Masterclasses',
    icon: 'i-lucide-presentation',
    items: []
  },
  {
    id: 'product-updates',
    title: 'Platform Releases & Features',
    icon: 'i-lucide-sparkles',
    items: [
      {
        title: 'bread+butter closed testing has begun!',
        date: 'Active Now',
        tag: 'Closed Beta',
        description: 'Our core collaborative planning tools, ceremony budgeting calculators, and verified supplier directory are now officially undergoing closed testing with select celebrants and coordinator partners.',
        icon: 'i-lucide-rocket',
        statusText: 'In Progress'
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
      const catMatches = cat.title.toLowerCase().includes(query)
      const isWebinarMatch = cat.id === 'workshops-webinars' && ('webinars'.includes(query) || 'webinars coming soon'.includes(query))
      const matchingItems = cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tag.toLowerCase().includes(query) ||
          (item.location && item.location.toLowerCase().includes(query))
      )
      if (matchingItems.length > 0 || catMatches || isWebinarMatch) {
        return { ...cat, items: matchingItems }
      }
      return null
    })
    .filter((cat): cat is NewsEventCategory => cat !== null)
})

const totalItemsCount = computed(() => {
  return categories.reduce((sum, cat) => sum + cat.items.length, 0)
})
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-20 sm:pt-24 lg:pt-28 pb-16 sm:pb-20 px-3.5 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto space-y-6 sm:space-y-8">

      <!-- Hero Header -->
      <div class="text-center space-y-2.5 sm:space-y-4 max-w-3xl mx-auto px-2">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-bread-400">
          News and Events
        </h1>
        <p class="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed">
          Stay informed on platform improvements, upcoming bridal showcases, partner masterclasses, and community
          gatherings.
        </p>
      </div>

      <!-- Main Content Container (styled consistently with Our Suppliers page) -->
      <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8">

        <!-- Search & Filter Controls -->
        <div class="space-y-3.5 sm:space-y-4 border-b border-toast-600/20 pb-5 sm:pb-6">
          <div class="max-w-md mx-auto relative">
            <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Search news, topics, or events..."
              size="md"
              class="w-full bg-white/90 text-toast-900 border-toast-300 focus:border-toast-600 rounded-xl shadow-xs text-xs sm:text-sm" />
            <button v-if="searchQuery" type="button" @click="searchQuery = ''"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-toast-500 hover:text-toast-900 cursor-pointer p-1 rounded"
              title="Clear search">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </div>

          <!-- Category Chips: Touch scrollable on mobile, wrapped and centered on desktop -->
          <div
            class="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap pb-1.5 sm:pb-0 pt-1 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 sm:mx-0 sm:px-0">
            <button type="button"
              class="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 shadow-2xs"
              :class="selectedCategoryId === 'all'
                ? 'bg-toast-600 text-white shadow-xs'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'"
              @click="selectedCategoryId = 'all'">
              All Topics ({{ totalItemsCount }})
            </button>
            <button v-for="cat in categories" :key="cat.id" type="button"
              class="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
              :class="selectedCategoryId === cat.id
                ? 'bg-toast-600 text-white shadow-xs'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'"
              @click="selectedCategoryId = cat.id">
              <UIcon :name="cat.icon" class="size-3.5" />
              <span>{{ cat.title }}</span>
            </button>
          </div>
        </div>

        <!-- No Results State -->
        <div v-if="filteredCategories.length === 0" class="text-center py-10 sm:py-12 space-y-3">
          <div class="size-12 rounded-full bg-toast-600/10 text-toast-600 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-search-x" class="size-6" />
          </div>
          <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-900">No Announcements Found</h3>
          <p class="text-xs sm:text-sm text-toast-700/80 max-w-sm mx-auto">
            We couldn't find any news or events matching "{{ searchQuery }}". Try a different search term or reset
            filters.
          </p>
          <UButton color="primary" variant="soft" size="sm" class="font-medium mt-2 cursor-pointer"
            @click="searchQuery = ''; selectedCategoryId = 'all'">
            Clear Filters
          </UButton>
        </div>

        <!-- Category Sections -->
        <div v-else class="space-y-8 sm:space-y-12">
          <section v-for="cat in filteredCategories" :key="cat.id" class="space-y-4 sm:space-y-6">
            <!-- Section Header -->
            <div class="flex items-center gap-2.5 sm:gap-3 border-b-2 border-toast-600/20 pb-2.5 sm:pb-3">
              <div
                class="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-toast-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <UIcon :name="cat.icon" class="size-4 sm:size-5" />
              </div>
              <div>
                <h2 class="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-toast-800">
                  {{ cat.title }}
                </h2>
              </div>
            </div>

            <!-- Empty Items / Webinars Coming Soon Banner -->
            <div v-if="cat.items.length === 0"
              class="bg-white/80 border-2 border-dashed border-toast-400/40 rounded-xl p-8 sm:p-12 text-center space-y-2.5 shadow-2xs">
              <div class="size-12 rounded-full bg-toast-600/10 text-toast-700 flex items-center justify-center mx-auto mb-1">
                <UIcon name="i-lucide-presentation" class="size-6 text-toast-700" />
              </div>
              <h3 class="text-base sm:text-lg font-bold font-serif text-toast-900">
                webinars coming soon
              </h3>
              <p class="text-xs sm:text-sm text-toast-700/80 max-w-md mx-auto leading-relaxed">
                Stay tuned! We're curating masterclasses and supplier workshops to help you plan with confidence.
              </p>
            </div>

            <!-- Items Grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              <div v-for="item in cat.items" :key="item.title"
                class="bg-white/90 border border-toast-300/40 rounded-xl p-4 sm:p-5 md:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow duration-200">
                <div class="space-y-2.5 sm:space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-toast-600/10 text-toast-700">
                      {{ item.tag }}
                    </span>
                    <span class="text-[11px] sm:text-xs text-toast-500 font-medium">
                      {{ item.date }}
                    </span>
                  </div>

                  <h3 class="text-base sm:text-lg font-bold font-serif text-toast-900 leading-snug">
                    {{ item.title }}
                  </h3>

                  <!-- Venue Location -->
                  <div v-if="item.location" class="flex items-center gap-1.5 text-xs text-toast-600 font-medium">
                    <UIcon name="i-lucide-map-pin" class="size-3.5 text-toast-500 shrink-0" />
                    <span>{{ item.location }}</span>
                  </div>

                  <p class="text-xs sm:text-sm text-toast-700/90 leading-relaxed">
                    {{ item.description }}
                  </p>
                </div>

                <div
                  class="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-toast-200/60 flex items-center justify-between text-xs text-toast-600 font-semibold">
                  <NuxtLink v-if="item.link" :to="item.link" target="_blank" rel="noopener noreferrer"
                    class="text-toast-700 hover:text-toast-950 inline-flex items-center gap-1.5 font-bold transition-colors">
                    <UIcon name="i-simple-icons-facebook" class="size-3.5 text-[#1877F2]" />
                    <span>{{ item.linkText || 'View Event Page' }}</span>
                    <UIcon name="i-lucide-external-link" class="size-3 ml-0.5 text-toast-400" />
                  </NuxtLink>
                  <span v-else>{{ item.statusText || 'Active Now' }}</span>
                  <UIcon :name="item.icon" class="size-4 text-toast-500" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Footer Callout -->
        <div class="border-t border-toast-600/20 pt-6 sm:pt-8 mt-8 sm:mt-10 text-center space-y-3">
          <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-900">
            Have an event or news to share with our community?
          </h3>
          <p class="text-xs sm:text-sm text-toast-800/80 max-w-lg mx-auto leading-relaxed">
            Partner with Bread + Butter for upcoming expos, workshops, and exclusive supplier promotions.
          </p>
          <div class="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
            <UButton to="/contact-us" color="primary" size="md"
              class="font-bold shadow-md bg-toast-600 hover:bg-toast-700 text-white w-full sm:w-auto justify-center text-xs sm:text-sm py-2 sm:py-2.5">
              Contact Us
            </UButton>
            <UButton to="/partners/signup" variant="outline" color="neutral" size="md"
              class="font-medium text-toast-800 border-toast-300 hover:bg-white w-full sm:w-auto justify-center text-xs sm:text-sm py-2 sm:py-2.5">
              Partner With Us
            </UButton>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped></style>
