<script setup lang="ts">
import { computed } from 'vue'
import { useJamSlideTransition } from '~/composables/useJamSlideTransition'

const { isSlideActive, slideDirection, slideStage } = useJamSlideTransition()

const isToJam = computed(() => slideDirection.value === 'to-jam')

const animationClass = computed(() => {
  if (slideStage.value === 'sliding-in') {
    return isToJam.value ? 'jam-slide-in-right' : 'jam-slide-in-left'
  }
  if (slideStage.value === 'sliding-out') {
    return isToJam.value ? 'jam-slide-out-left' : 'jam-slide-out-right'
  }
  return 'jam-slide-standing'
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isSlideActive"
      id="jam-slide-transition-root"
      class="fixed inset-0 select-none overflow-hidden"
      style="position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 9999999; margin: 0; padding: 0; pointer-events: auto;"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        class="w-full h-full flex flex-col items-center justify-center relative shadow-2xl"
        :class="animationClass"
      >
        <!-- Jam Mode: all-jam colored background with Jam logo in the center -->
        <div
          v-if="isToJam"
          class="w-full h-full flex flex-col items-center justify-center px-6"
          style="background: radial-gradient(circle at center, #8e2343 0%, #7b1b38 55%, #581125 100%); background-color: #7b1b38;"
        >
          <div class="flex flex-col items-center justify-center">
            <img
              src="~/assets/bpb-icons/Jam Logos-01.png"
              alt="Jam"
              class="h-16 sm:h-20 md:h-24 w-auto max-w-[82vw] object-contain drop-shadow-2xl pointer-events-none select-none brightness-0 invert"
            />
          </div>
        </div>

        <!-- Events Mode: toast colored background with Bread+Butter logo in the center -->
        <div
          v-else
          class="w-full h-full flex flex-col items-center justify-center px-6"
          style="background: radial-gradient(circle at center, #563326 0%, #45281e 55%, #291811 100%); background-color: #45281e;"
        >
          <div class="flex flex-col items-center justify-center">
            <img
              src="~/assets/bpb-icons/logo-white.svg"
              alt="Bread + Butter"
              class="h-12 sm:h-16 md:h-20 w-auto max-w-[82vw] object-contain drop-shadow-2xl pointer-events-none select-none"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.jam-slide-in-right {
  animation: jamSlideInRight 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: transform;
}

.jam-slide-out-left {
  animation: jamSlideOutLeft 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  will-change: transform;
}

.jam-slide-in-left {
  animation: jamSlideInLeft 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: transform;
}

.jam-slide-out-right {
  animation: jamSlideOutRight 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  will-change: transform;
}

.jam-slide-standing {
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

@keyframes jamSlideInRight {
  0% {
    transform: translate3d(100%, 0, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes jamSlideOutLeft {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-100%, 0, 0);
  }
}

@keyframes jamSlideInLeft {
  0% {
    transform: translate3d(-100%, 0, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes jamSlideOutRight {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(100%, 0, 0);
  }
}
</style>
