import { computed } from 'vue'

export function usePaymongoActivation() {
  const config = useRuntimeConfig()
  const isPaymongoActivated = computed(() => config.public.isPaymongoActivated === true)

  return { isPaymongoActivated }
}
