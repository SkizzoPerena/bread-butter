<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  TIP_CATEGORIES,
  WEDDING_ARTICLES,
  type TipArticle
} from '~/data/weddingTips'

definePageMeta({
  layout: 'landing-navbar',
  alias: ['/UsefulTips', '/usefultips']
})

useHead({
  title: 'Useful Tips & Planning Advice - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Authentic wedding guides, checklists, budgeting frameworks, and supplier advice for seamless celebration planning from Bread + Butter.'
    }
  ]
})

const searchQuery = ref('')
const activeCategory = ref('all')
const isModalOpen = ref(false)
const selectedArticle = ref<TipArticle | null>(null)

function getCategoryLabel(catId: string) {
  const cat = TIP_CATEGORIES.find(c => c.id === catId)
  return cat ? cat.label : ''
}

const activeCategoryLabel = computed(() => {
  return getCategoryLabel(activeCategory.value) || 'All Topics'
})

const filteredArticles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return WEDDING_ARTICLES.filter(article => {
    const matchesCategory = activeCategory.value === 'all' || article.category === activeCategory.value || query !== ''

    if (!matchesCategory) return false

    if (!query) return true

    const titleMatch = article.title.toLowerCase().includes(query)
    const abstractMatch = article.abstract.toLowerCase().includes(query)
    const catLabelMatch = getCategoryLabel(article.category).toLowerCase().includes(query)
    const introMatch = article.intro?.some(i => i.toLowerCase().includes(query))
    const sectionMatch = article.sections.some(s =>
      (s.heading && s.heading.toLowerCase().includes(query)) ||
      s.paragraphs.some(p => p.toLowerCase().includes(query)) ||
      (s.bullets && s.bullets.some(b => b.toLowerCase().includes(query)))
    )
    const conclusionMatch = article.conclusion?.toLowerCase().includes(query)

    return titleMatch || abstractMatch || catLabelMatch || introMatch || sectionMatch || conclusionMatch
  })
})

function getCategoryCount(catId: string) {
  if (catId === 'all') return WEDDING_ARTICLES.length
  return WEDDING_ARTICLES.filter(a => a.category === catId).length
}

function openArticleModal(article: TipArticle) {
  selectedArticle.value = article
  isModalOpen.value = true
}

function closeArticleModal() {
  isModalOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-20 sm:pt-24 lg:pt-28 pb-16 sm:pb-20 px-3.5 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-6 sm:space-y-8">

      <!-- Hero / Title Section -->
      <div class="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto px-2">
        <h1 id="tips-title" class="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-bread-400">
          Useful Tips & Insights
        </h1>
        <p class="text-sm sm:text-base lg:text-lg text-white/95 leading-relaxed">
          Practical advice, decision frameworks, and milestone guides from seasoned event coordinators to ensure your
          celebration goes without a hitch.
        </p>
      </div>

      <!-- Mobile Horizontal Categories Bar (lg:hidden) -->
      <div class="lg:hidden bread-container bg-bread-400 text-toast-900 p-3 sm:p-4 space-y-2">
        <div class="flex items-center justify-between px-1 text-xs font-bold text-toast-800 uppercase tracking-wider">
          <span class="flex items-center gap-1.5">
            <UIcon name="i-lucide-layers" class="w-3.5 h-3.5" />
            Categories
          </span>
          <span class="text-toast-600 font-normal text-[11px]">Swipe to select</span>
        </div>
        <div
          class="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button v-for="cat in TIP_CATEGORIES" :key="'mobile-' + cat.id" @click="activeCategory = cat.id" :class="[
            'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer shadow-2xs',
            activeCategory === cat.id
              ? 'bg-toast-600 text-white shadow-xs ring-1 ring-toast-600'
              : 'bg-white/85 text-toast-800 hover:bg-white border border-toast-300/60'
          ]">
            <UIcon :name="cat.icon" class="w-3 h-3 shrink-0" />
            <span>{{ cat.label }}</span>
            <span :class="[
              'ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold',
              activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-toast-100 text-toast-700'
            ]">
              {{ getCategoryCount(cat.id) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Main Layout with UPageAside on left and container on right (4-grid layout) -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">

        <!-- Left Side: Desktop Sticky UPageAside using bread-container CSS class -->
        <UPageAside
          class="hidden lg:block lg:col-span-1 bread-container bg-bread-400 text-toast-900 p-5 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto space-y-6">
          <div>
            <h2
              class="text-xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3 mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-layers" class="w-5 h-5 text-toast-700" />
              Categories
            </h2>

            <!-- Categories Filter Navigation -->
            <div class="space-y-0.5">
              <button v-for="cat in TIP_CATEGORIES" :key="cat.id" @click="activeCategory = cat.id" :class="[
                'w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md transition-all text-left cursor-pointer',
                activeCategory === cat.id
                  ? 'bg-toast-600 text-white shadow-xs font-semibold'
                  : 'text-toast-800 hover:bg-toast-500/10'
              ]">
                <div class="flex items-center gap-2 truncate">
                  <UIcon :name="cat.icon" class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ cat.label }}</span>
                </div>
                <UBadge size="xs" :color="activeCategory === cat.id ? 'bread' : 'neutral'" variant="subtle"
                  class="rounded-full px-1.5 py-0 text-[10px] shrink-0">
                  {{ getCategoryCount(cat.id) }}
                </UBadge>
              </button>
            </div>
          </div>
        </UPageAside>

        <!-- Right Side: Main Tips Container using bread-container CSS class (Topic Results) -->
        <div
          class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-6 lg:p-8 lg:col-span-3 space-y-5 sm:space-y-6 w-full">
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-toast-600/20 pb-4">
            <div>
              <h2 class="text-xl sm:text-2xl font-bold font-serif text-toast-800">
                {{ activeCategoryLabel }}
              </h2>
              <p class="text-xs text-toast-700 mt-1">
                Showing {{ filteredArticles.length }} article{{ filteredArticles.length === 1 ? '' : 's' }}
              </p>
            </div>

            <!-- Search input on the right side of container header -->
            <div class="w-full sm:w-64 md:w-72">
              <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Search articles & topics..." size="md"
                class="w-full bg-white/90 text-toast-900 border-toast-300 focus:border-toast-600 rounded-lg shadow-xs text-sm" />
            </div>
          </div>

          <div v-if="filteredArticles.length === 0" class="py-10 sm:py-12 text-center text-toast-800 space-y-3">
            <UIcon name="i-lucide-book-open" class="w-10 sm:w-12 h-10 sm:h-12 mx-auto text-toast-600 opacity-60" />
            <p class="text-base sm:text-lg font-semibold">No articles found</p>
            <p class="text-xs sm:text-sm text-toast-700">Try adjusting your search query or category filter.</p>
            <UButton size="xs" color="toast" variant="outline" @click="searchQuery = ''; activeCategory = 'all'">
              Reset Filters
            </UButton>
          </div>

          <div v-else class="space-y-3.5 sm:space-y-4">
            <!-- Each Article item contains only title, abstract, and read more button -->
            <article v-for="article in filteredArticles" :key="article.id" :id="article.id"
              class="bread-container transition-all p-4 sm:p-5 md:p-6 bg-white/95 border-l-4 border-toast-400 hover:border-toast-600 hover:shadow-md space-y-2.5 sm:space-y-3 cursor-pointer"
              @click="openArticleModal(article)">
              <h3 class="text-base sm:text-lg md:text-xl font-bold text-toast-900 font-serif leading-snug">
                {{ article.title }}
              </h3>

              <p class="text-xs sm:text-sm text-toast-800 leading-relaxed line-clamp-3 sm:line-clamp-none">
                {{ article.abstract }}
              </p>

              <div class="pt-1.5 sm:pt-2">
                <UButton label="Read more" icon="i-lucide-arrow-right" trailing size="sm"
                  class="!bg-toast-700 hover:!bg-toast-800 !text-white font-semibold cursor-pointer rounded-lg px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm shadow-sm transition-all inline-flex items-center gap-1.5"
                  @click.stop="openArticleModal(article)" />
              </div>
            </article>
          </div>

        </div>

      </div>

    </div>

    <!-- Article Detail Modal: Non-dismissible, only exited via top-right close button -->
    <UModal v-model:open="isModalOpen" :dismissible="false" :ui="{
      content: 'w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-bread-50 text-toast-950 border border-toast-300 shadow-2xl rounded-2xl overflow-hidden',
      header: 'bg-bread-300 border-b border-toast-300 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0',
      body: 'p-4 sm:p-6 md:p-8 overflow-y-auto space-y-5 sm:space-y-6',
      overlay: 'bg-toast-950/60 backdrop-blur-xs',
    }">
      <template #header>
        <div class="flex items-start justify-between w-full gap-3 sm:gap-4">
          <div class="pr-2">
            <h3 class="text-lg sm:text-xl md:text-2xl font-bold font-serif text-toast-900 leading-snug">
              {{ selectedArticle?.title }}
            </h3>
          </div>
          <UButton icon="i-lucide-x" size="md"
            class="rounded-full !text-toast-900 hover:!bg-toast-500/20 shrink-0 cursor-pointer -mr-1 -mt-1 p-1.5 sm:p-2 text-base sm:text-lg"
            aria-label="Close modal" @click="closeArticleModal" />
        </div>
      </template>

      <template #body>
        <div v-if="selectedArticle" class="space-y-5 sm:space-y-6 text-toast-900 leading-relaxed font-sans">
          <!-- Intro Paragraphs -->
          <div v-if="selectedArticle.intro && selectedArticle.intro.length"
            class="space-y-2.5 sm:space-y-3 text-xs sm:text-sm md:text-base text-toast-800 bg-white/70 p-3.5 sm:p-5 rounded-xl border border-toast-200">
            <p v-for="(p, idx) in selectedArticle.intro" :key="idx" class="leading-relaxed">
              {{ p }}
            </p>
          </div>

          <!-- Article Sections -->
          <div class="space-y-5 sm:space-y-6">
            <section v-for="(section, sIdx) in selectedArticle.sections" :key="sIdx" class="space-y-2.5 sm:space-y-3">
              <h4 v-if="section.heading"
                class="text-base sm:text-lg font-bold font-serif text-toast-900 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-toast-600 rounded-full shrink-0"></span>
                <span>{{ section.heading }}</span>
              </h4>

              <div v-if="section.paragraphs && section.paragraphs.length"
                class="space-y-2 text-xs sm:text-sm md:text-base text-toast-800">
                <p v-for="(p, pIdx) in section.paragraphs" :key="pIdx" class="leading-relaxed">
                  {{ p }}
                </p>
              </div>

              <ul v-if="section.bullets && section.bullets.length"
                class="space-y-1.5 pl-4 sm:pl-5 list-disc text-xs sm:text-sm md:text-base text-toast-800">
                <li v-for="(b, bIdx) in section.bullets" :key="bIdx" class="leading-relaxed">
                  {{ b }}
                </li>
              </ul>
            </section>
          </div>

          <!-- Conclusion / Takeaway -->
          <div v-if="selectedArticle.conclusion"
            class="p-4 sm:p-5 rounded-xl bg-toast-600/10 border-l-4 border-toast-600 space-y-1.5 sm:space-y-2">
            <p class="text-xs font-bold uppercase tracking-wider text-toast-700">Takeaway</p>
            <p class="text-xs sm:text-sm md:text-base font-medium text-toast-900 italic">
              {{ selectedArticle.conclusion }}
            </p>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>

<style scoped></style>
