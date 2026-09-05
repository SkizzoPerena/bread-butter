<script setup lang="ts">
import { useApiRole } from '~/composables/useApiRole'

const props = defineProps<{
  targetPath: string
  title: string
  description: string
}>()

definePageMeta({
  layout: 'partner-navbar'
})

const route = useRoute()
const { withRoleQuery } = useApiRole()

const eventId = computed(() => typeof route.params.eventId === 'string' ? route.params.eventId : '')

onMounted(async () => {
  if (!eventId.value) {
    await navigateTo('/partners/events')
    return
  }

  await navigateTo({
    path: props.targetPath,
    query: withRoleQuery({ eventId: eventId.value })
  }, { replace: true })
})
</script>

<template>
  <UContainer class="py-12">
    <UPageCard class="white-bread-container max-w-2xl mx-auto text-center">
      <div class="space-y-4">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-toast-700 mx-auto" />
        <div class="text-xl font-semibold">{{ title }}</div>
        <p class="text-sm text-muted">{{ description }}</p>
      </div>
    </UPageCard>
  </UContainer>
</template>
