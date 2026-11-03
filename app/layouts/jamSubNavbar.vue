<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { startPageTransition } = usePageTransition()

const gatheringId = computed(() => {
  const param = route.params.gatheringId
  if (typeof param === 'string' && param) return param
  const query = route.query.gatheringId
  if (typeof query === 'string' && query) return query
  return ''
})

async function handleBack() {
  if (gatheringId.value) {
    await startPageTransition(`/jam/dashboard/${gatheringId.value}`)
  } else {
    await startPageTransition()
    router.back()
  }
}

const titleThemeClass = computed(() => {
  const bgClass = (route.meta.bgClass as string) || ''
  const colorMap: Record<string, string> = {
    'bg-blue-50': 'text-blue-600',
    'bg-emerald-50': 'text-emerald-600',
    'bg-purple-50': 'text-purple-600',
    'bg-violet-50': 'text-violet-600',
    'bg-teal-50': 'text-teal-600',
    'bg-orange-50': 'text-orange-600',
    'bg-pink-50': 'text-pink-600',
    'bg-indigo-50': 'text-indigo-600',
    'bg-slate-50': 'text-slate-600',
    'bg-rose-50': 'text-rose-600',
    'bg-amber-50': 'text-amber-600',
  }
  return colorMap[bgClass] || 'text-toast-700'
})
</script>

<template>
  <div class="relative w-full min-h-screen" :class="route.meta.bgClass || 'bg-toast-50/20'">
    <UDashboardNavbar class="bg-white w-full sticky top-0 z-50 event-navbar border-b border-bread-200/80 shadow-2xs">
      <!-- LEFT SIDE: Back Button, Logo, Badge, Subpage Title -->
      <template #left>
        <div class="flex items-center gap-2 sm:gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            class="rounded-lg cursor-pointer"
            aria-label="Back to Dashboard"
            @click="handleBack"
          />

          <!-- Logo & Jam Badge -->
          <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              class="flex items-center cursor-pointer"
              @click="handleBack"
            >
              <img
                v-if="route.meta.useLogo"
                src="~/assets/bpb-icons/logomark-toast-700.svg"
                class="h-6 sm:h-7"
                alt="Bread & Butter"
              />
              <img
                v-else
                src="~/assets/bpb-icons/logo-toast-700.svg"
                class="h-6 sm:h-7"
                alt="Bread & Butter"
              />
            </button>
            <UBadge
              color="warning"
              variant="solid"
              size="xs"
              class="text-[10px] sm:text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full text-black bg-amber-400 border border-amber-300"
            >
              Jam Seating
            </UBadge>
          </div>

          <div class="h-4 w-px bg-bread-200 hidden sm:block" />

          <!-- Page Title -->
          <div
            class="font-serif text-base sm:text-lg lg:text-xl font-bold truncate max-w-[min(100%,22rem)] transition-colors"
            :class="titleThemeClass"
          >
            <slot name="title">
              {{ route.meta.title }}
            </slot>
          </div>
        </div>
      </template>

      <!-- RIGHT SIDE: Actions Teleported from Subpages -->
      <template #right>
        <slot name="action">
          <div id="navbar-actions" class="flex items-center gap-2"></div>
        </slot>
      </template>
    </UDashboardNavbar>

    <!-- Page Content Slot -->
    <slot />
    <BackToTopButton />
  </div>
</template>

