<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const titleThemeClass = computed(() => {
  const bgClass = route.meta.bgClass as string || ''
  const colorMap: Record<string, string> = {
    'bg-blue-50': 'text-blue-500',
    'bg-emerald-50': 'text-emerald-500',
    'bg-purple-50': 'text-purple-500',
    'bg-teal-50': 'text-teal-500',
    'bg-orange-50': 'text-orange-500',
    'bg-pink-50': 'text-pink-500',
    'bg-indigo-50': 'text-indigo-500',
    'bg-slate-50': 'text-slate-500',
    'bg-rose-50': 'text-rose-500'
  }
  return colorMap[bgClass] || 'text-toast-500'
})
</script>

<template>
  <div class="relative w-full min-h-screen" :class="route.meta.bgClass || 'bg-toast-50'">
    <UDashboardNavbar class="bg-white w-full sticky top-0 z-50 event-navbar">
      <!-- LEFT SIDE: Back Button & Image Slot -->
      <template #left>
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            class="rounded-lg"
            aria-label="Go back"
            @click="router.back()"
          />

          <!-- Image Slot Wrapper -->
          <NuxtLink to="/UserDashboard" class="flex items-center">
            <img v-if="route.meta.useLogo" src="..\assets\bpb-icons\logomark-toast-700.svg" class="h-7" />
            <img v-else src="..\assets\bpb-icons\logo-toast-700.svg" class="h-7" />
          </NuxtLink>
          <div class="font-serif text-xl font-bold truncate max-w-[min(100%,20rem)] transition-colors" :class="titleThemeClass">
          <slot name="title">
            {{ route.meta.title }}
          </slot>
          </div>
        </div>
      </template>

      <!-- RIGHT SIDE: Status & Actions -->
      <template #right>
      <slot name="action">
        <div id="navbar-actions"></div>
      </slot>
      </template>
    </UDashboardNavbar>

    <slot />
  </div>
</template>