<script setup lang="ts">
import type { NuxtError } from '#app'
import { computed } from 'vue'
import { useAuth, getStoredAccessToken } from '~/composables/useAuth'

const props = defineProps<{
  error: NuxtError
}>()

const { isAuthenticated } = useAuth('user')

const isUserLoggedIn = computed(() => {
  return isAuthenticated.value || (import.meta.client && Boolean(getStoredAccessToken('user')))
})

const layoutName = computed(() => (isUserLoggedIn.value ? 'signed-in-navbar' : 'landing-navbar'))

const is404 = computed(() => !props.error?.statusCode || props.error.statusCode === 404)

useHead({
  title: computed(() =>
    is404.value
      ? '404 - Page Not Found | Bread + Butter'
      : `${props.error?.statusCode || 500} - An Error Occurred | Bread + Butter`
  )
})
</script>

<template>
  <UApp>
    <NuxtLayout :name="layoutName">
      <NotFoundContent :is-error-page="true" />
    </NuxtLayout>
  </UApp>
</template>
