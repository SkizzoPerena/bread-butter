<script setup lang="ts">
import { usePageTransition } from '~/composables/usePageTransition'

const { isTransitionActive, isTransitionVisible } = usePageTransition()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-350 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isTransitionActive && isTransitionVisible"
        id="app-page-transition-overlay"
        class="fixed inset-0 bg-white flex flex-col items-center justify-center select-none"
        style="position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 999999; margin: 0; padding: 0; box-sizing: border-box; background-color: #ffffff;"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="flex flex-col items-center justify-center px-6 text-center transform transition-all duration-300">
          <!-- Bread + Butter Brand Logo -->
          <img
            src="~/assets/bpb-icons/logo-toast-700.svg"
            alt="Bread + Butter"
            class="h-10 sm:h-12 w-auto max-w-60 object-contain drop-shadow-xs pointer-events-none"
          />

          <!-- Circular Loading Animation -->
          <div class="mt-8 flex flex-col items-center justify-center gap-3">
            <div class="relative w-10 h-10">
              <!-- Spinner Background Track -->
              <div class="w-10 h-10 rounded-full border-[3px] border-toast-100/80"></div>
              <!-- Spinner Active Rotating Arc -->
              <div class="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-toast-700 border-r-toast-700/50 animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 0.85s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>
