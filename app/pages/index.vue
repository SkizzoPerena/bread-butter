<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=La+Belle+Aurore&display=swap' }
  ]
})

const { isAuthenticated, syncSessionFromStorage } = useAuth()
const authReady = ref(false)
const layoutName = computed(() => (isAuthenticated.value ? 'user-navbar' : 'landing-navbar'))

if (import.meta.client) {
  syncSessionFromStorage()
}

onMounted(async () => {
  const activeRole = getActiveAuthRole()
  if (activeRole === 'partner') {
    const partnerOk = await ensureSession('partner')
    if (partnerOk) {
      await navigateTo('/partners', { replace: true })
      return
    }
  }
  await ensureSession('user')
  authReady.value = true
})
</script>

<template>
  <div
    v-if="!authReady"
    class="min-h-screen flex items-center justify-center bg-bread-400"
  >
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-toast-700" />
  </div>
  <NuxtLayout v-else :name="layoutName">
    <UserEventsDashboard v-if="isAuthenticated" />
    <LandingHome v-else />
  </NuxtLayout>
</template>
