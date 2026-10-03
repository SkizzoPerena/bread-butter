<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    isErrorPage?: boolean
  }>(),
  {
    isErrorPage: false
  }
)

const router = useRouter()

function handleBack() {
  if (props.isErrorPage) {
    clearError()
  }

  if (import.meta.client && window.history.length > 1) {
    router.back()
  } else {
    if (props.isErrorPage) {
      clearError({ redirect: '/' })
    } else {
      navigateTo('/')
    }
  }
}

function handleHome() {
  if (props.isErrorPage) {
    clearError({ redirect: '/' })
  } else {
    navigateTo('/')
  }
}
</script>

<template>
  <div
    class="min-h-[calc(100vh-52px)] flex flex-col items-center justify-center pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-toast-700 text-white relative overflow-hidden">
    <!-- Ambient background warmth effects -->
    <div
      class="absolute -top-32 left-1/2 -translate-x-1/2 w-96 sm:w-125 h-96 sm:h-125 bg-toast-500/25 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute -bottom-32 right-1/4 w-80 h-80 bg-bread-500/10 rounded-full blur-3xl pointer-events-none" />

    <!-- Main 404 Container -->
    <div class=" w-full max-w-xl p-6 sm:p-10 lg:p-12 text-center space-y-6 sm:space-y-8 relative z-10">



      <!-- Large 404 Heading -->
      <div class="space-y-2">
        <h1
          class="text-7xl sm:text-8xl lg:text-9xl font-bold font-serif text-white tracking-tight leading-none select-none">
          404
        </h1>
        <h2 class="text-2xl sm:text-3xl font-serif font-bold text-bread-400">
          Looks like this slice is missing
        </h2>
        <p class="text-sm sm:text-base text-white leading-relaxed font-sans max-w-md mx-auto">
          The page you are looking for might have been moved, renamed, or is currently baking in the oven.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
        <UButton id="btn-return-previous" icon="i-lucide-arrow-left" color="primary" size="lg"
          class="w-full sm:w-auto font-semibold" @click="handleBack">
          Return to previous page
        </UButton>

        <UButton id="btn-return-home" icon="i-lucide-house" variant="solid" color="bread" size="lg"
          class="w-full sm:w-auto font-bold text-toast-800" @click="handleHome">
          Return home
        </UButton>
      </div>

    </div>
  </div>
</template>
