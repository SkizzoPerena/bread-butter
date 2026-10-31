<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const route = useRoute()
const isVisible = ref(false)
const isLaunching = ref(false)

function checkScrollPosition() {
  if (typeof window === 'undefined') return
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0
  // Show button after scrolling 95vh
  const threshold = window.innerHeight * 0.95
  isVisible.value = scrollY > threshold
}

function scrollToTop() {
  if (typeof window === 'undefined') return
  if (isLaunching.value) return

  isLaunching.value = true

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })

  // Reset launch state after animation finishes
  setTimeout(() => {
    isLaunching.value = false
  }, 900)
}

watch(
  () => route.fullPath,
  () => {
    nextTick(() => {
      checkScrollPosition()
    })
  }
)

onMounted(() => {
  checkScrollPosition()
  window.addEventListener('scroll', checkScrollPosition, { passive: true })
  window.addEventListener('resize', checkScrollPosition, { passive: true })
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', checkScrollPosition)
    window.removeEventListener('resize', checkScrollPosition)
  }
})
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-75"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-75"
      >
        <button
          v-if="isVisible"
          type="button"
          aria-label="Back to top"
          class="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 size-12 rounded-full bg-toast-500 hover:bg-toast-600 active:bg-toast-700 text-white shadow-lg shadow-toast-900/30 hover:shadow-xl hover:shadow-toast-900/40 border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-toast-300 overflow-visible"
          :class="{ 'pointer-events-none': isLaunching }"
          @click="scrollToTop"
        >
          <!-- Launchpad blast wave -->
          <span
            v-if="isLaunching"
            class="absolute -inset-1.5 rounded-full bg-amber-400/40 animate-ping pointer-events-none"
          />

          <!-- Exhaust flame plume trailing from rocket base -->
          <span
            v-if="isLaunching"
            class="exhaust-plume absolute -bottom-1 -left-1 size-4 rounded-full bg-radial from-amber-300 via-orange-500 to-transparent blur-xs pointer-events-none"
          />

          <!-- Rocket Icon with flight animation -->
          <UIcon
            name="i-lucide-rocket"
            class="size-5 transition-transform duration-300"
            :class="[
              isLaunching
                ? 'rocket-launching'
                : 'group-hover:-translate-y-1 group-hover:translate-x-0.5'
            ]"
          />
        </button>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
@keyframes rocket-launch {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  12% {
    /* Engine rumble / shake */
    transform: translate(-1.5px, 1.5px) scale(0.95);
  }
  24% {
    transform: translate(1.5px, -0.5px) scale(0.96);
  }
  36% {
    /* Anticipation compression before liftoff */
    transform: translate(-1px, 2px) scale(0.92);
  }
  50% {
    /* Liftoff burst */
    transform: translate(6px, -12px) scale(1.08);
  }
  75% {
    /* Accelerating upward */
    transform: translate(22px, -55px) scale(0.85);
    opacity: 0.9;
  }
  100% {
    /* Flying out of view into space */
    transform: translate(45px, -120px) scale(0.5);
    opacity: 0;
  }
}

@keyframes exhaust-plume {
  0% {
    opacity: 0;
    transform: scale(0.4) translate(0, 0);
  }
  25% {
    opacity: 1;
    transform: scale(1.2) translate(-2px, 4px);
  }
  55% {
    opacity: 0.8;
    transform: scale(1.5) translate(-6px, 12px);
  }
  100% {
    opacity: 0;
    transform: scale(0.2) translate(-12px, 24px);
  }
}

.rocket-launching {
  animation: rocket-launch 0.85s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.exhaust-plume {
  animation: exhaust-plume 0.65s ease-out forwards;
}
</style>
