import type { RouteLocationRaw } from 'vue-router'

export function usePageTransition() {
  const isTransitionActive = useState<boolean>('app_page_transition_active', () => false)
  const isTransitionVisible = useState<boolean>('app_page_transition_visible', () => false)
  const transitionStartTime = useState<number>('app_page_transition_start_time', () => 0)

  async function startPageTransition(to?: RouteLocationRaw, options?: { minDuration?: number; maxDuration?: number }) {
    transitionStartTime.value = Date.now()
    isTransitionActive.value = true
    isTransitionVisible.value = true

    // Safety timeout: automatically fade out if a destination page never calls finishPageTransition (e.g. 10s)
    const maxDuration = options?.maxDuration ?? 10000
    if (import.meta.client) {
      setTimeout(() => {
        finishPageTransition()
      }, maxDuration)
    }

    // Allow browser to render the pure white overlay screen before navigating
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 80))

    if (to) {
      await navigateTo(to)
    }
  }

  function finishPageTransition(options?: { minDuration?: number }) {
    if (!isTransitionActive.value) return

    // Ensure a smooth, premium feel with a minimum duration (default 750ms)
    // so the loading screen doesn't abruptly flash or vanish before the eye can register it
    const minDuration = options?.minDuration ?? 750
    const elapsed = Date.now() - transitionStartTime.value
    const remaining = Math.max(0, minDuration - elapsed)

    setTimeout(() => {
      isTransitionVisible.value = false
      setTimeout(() => {
        isTransitionActive.value = false
      }, 400)
    }, remaining)
  }

  return {
    isTransitionActive,
    isTransitionVisible,
    startPageTransition,
    finishPageTransition,
  }
}
