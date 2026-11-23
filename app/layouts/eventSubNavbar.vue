<script setup lang="ts">
const route = useRoute()
const { followLink } = usePageTransition()
const { goBackToPreviousPage } = useAppNavigation()
const { activeEventId } = useActiveEvent()

const isMobileMenuOpen = ref(false)

watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

const eventId = computed(() => {
  const q = route.query.eventId
  if (typeof q === 'string' && q) return q
  const p = route.params.eventId
  if (typeof p === 'string' && p) return p
  return activeEventId.value || ''
})

const defaultFallback = computed(() => {
  if (eventId.value) {
    return {
      path: '/event/dashboard-butter',
      query: { eventId: eventId.value },
    }
  }
  return '/'
})

async function handleBack() {
  await goBackToPreviousPage(defaultFallback.value)
}

const titleThemeClass = computed(() => {
  const bgClass = route.meta.bgClass as string || ''
  const colorMap: Record<string, string> = {
    'bg-blue-50': 'text-blue-500',
    'bg-emerald-50': 'text-emerald-500',
    'bg-purple-50': 'text-purple-500',
    'bg-violet-50': 'text-violet-500',
    'bg-teal-50': 'text-teal-500',
    'bg-orange-50': 'text-orange-500',
    'bg-pink-50': 'text-pink-500',
    'bg-indigo-50': 'text-indigo-500',
    'bg-slate-50': 'text-slate-500',
    'bg-rose-50': 'text-rose-500',
    'bg-lime-50': 'text-lime-600',
    'bg-cyan-50': 'text-cyan-600',
  }
  return colorMap[bgClass] || 'text-toast-500'
})
</script>

<template>
  <div class="relative w-full min-h-screen" :class="route.meta.bgClass || 'bg-toast-50'">
    <UDashboardNavbar :toggle="false" class="bg-white w-full sticky top-0 z-50 event-navbar border-b border-bread-200/80 shadow-2xs">
      <!-- LEFT SIDE: Back Button & Image Slot -->
      <template #left>
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            class="rounded-lg cursor-pointer"
            aria-label="Go back"
            @click="handleBack"
          />

          <!-- Image Slot Wrapper -->
          <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <a href="/" class="flex items-center cursor-pointer" @click="followLink($event, '/')">
              <img v-if="route.meta.useLogo" src="~/assets/bpb-icons/logomark-toast-700.svg" class="h-7" />
              <img v-else src="~/assets/bpb-icons/logo-toast-700.svg" class="h-7" />
            </a>
            
          </div>
          <div class="font-serif text-xl font-bold truncate max-w-[min(100%,20rem)] transition-colors" :class="titleThemeClass">
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
            class="text-toast-800 hover:bg-bread-100/60 cursor-pointer"
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
              <div class="size-6 rounded-lg bg-orange-100 flex items-center justify-center text-orange-800">
                <UIcon name="i-lucide-sparkles" class="size-3.5" />
              </div>
              <span class="font-serif font-bold text-sm text-toast-900">Page Actions</span>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="rounded-full size-6 p-0 text-muted hover:text-toast-900 cursor-pointer"
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

    <slot />
    <BackToTopButton />
  </div>
</template>