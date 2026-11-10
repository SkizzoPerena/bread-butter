<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { startPageTransition } = usePageTransition()

const isMobileMenuOpen = ref(false)

watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

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
    'bg-red-50': 'text-red-600',
    'bg-yellow-50': 'text-yellow-700',
  }
  return colorMap[bgClass] || 'text-jam-700'
})
</script>

<template>
  <div class="relative w-full min-h-screen" :class="route.meta.bgClass || 'bg-jam-50/20'">
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
                src="~/assets/bpb-icons/Jam Logos-04.png"
                class="h-6 sm:h-7"
                alt="Bread & Butter"
              />
              <img
                v-else
                src="~/assets/bpb-icons/Jam Logos-02.png"
                class="h-6 sm:h-7"
                alt="Bread & Butter"
              />
            </button>
            <UBadge
              color="jam"
              variant="solid"
              size="xs"
              class="hidden min-[420px]:inline-flex text-[10px] sm:text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full text-jam-700 bg-jam-50 border border-jam-200"
            >
              Jam Seating
            </UBadge>
          </div>

          <div class="h-4 w-px bg-bread-200 hidden sm:block" />

          <!-- Page Title -->
          <div
            class="font-serif text-base sm:text-lg lg:text-xl font-bold truncate max-w-[min(100%,14rem)] sm:max-w-[min(100%,22rem)] transition-colors"
            :class="titleThemeClass"
          >
            <slot name="title">
              {{ route.meta.title }}
            </slot>
          </div>
        </div>
      </template>

      <!-- RIGHT SIDE: Actions Teleported from Subpages (Desktop) & Hamburger Menu (Mobile) -->
      <template #right>
        <slot name="action">
          <div id="navbar-actions" class="hidden sm:flex items-center gap-2"></div>
        </slot>

        <!-- Mobile Actions Toggle Button on Right Side -->
        <div class="sm:hidden flex items-center -mr-1 shrink-0">
          <UButton
            :icon="isMobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
            color="neutral"
            variant="ghost"
            size="sm"
            class="text-jam-800 hover:bg-bread-100/60 cursor-pointer"
            aria-label="Toggle actions menu"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          />
        </div>
      </template>
    </UDashboardNavbar>

    <!-- Mobile Actions Dropdown / Sheet (v-show keeps Teleport target in DOM) -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-95"
    >
      <div
        v-show="isMobileMenuOpen"
        class="sm:hidden fixed inset-0 z-50 pointer-events-auto"
      >
        <!-- Backdrop overlay -->
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          @click="isMobileMenuOpen = false"
        />

        <!-- Floating action drawer anchored right below navbar top-left -->
        <div
          class="absolute top-14 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-bread-200/90 p-4 space-y-3 z-10 max-h-[calc(100vh-80px)] overflow-y-auto"
        >
          <div class="flex items-center justify-between border-b border-bread-100 pb-2">
            <div class="flex items-center gap-2">
              <div class="size-6 rounded-lg bg-jam-100 flex items-center justify-center text-jam-800">
                <UIcon name="i-lucide-sparkles" class="size-3.5" />
              </div>
              <span class="font-serif font-bold text-sm text-jam-900">Page Actions</span>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="rounded-full size-6 p-0 text-muted hover:text-jam-900 cursor-pointer"
              aria-label="Close menu"
              @click="isMobileMenuOpen = false"
            />
          </div>

          <!-- Mobile Actions Teleport Destination -->
          <div
            id="navbar-mobile-actions"
            class="flex flex-col gap-2 [&>*]:w-full [&>*]:justify-start"
            @click="isMobileMenuOpen = false"
          >
            <!-- Subpages teleport actions here -->
          </div>
        </div>
      </div>
    </Transition>

    <!-- Page Content Slot -->
    <slot />
    <BackToTopButton />
  </div>
</template>

