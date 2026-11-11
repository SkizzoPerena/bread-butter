export type SlideDirection = 'to-jam' | 'to-events'
export type SlideStage = 'idle' | 'sliding-in' | 'standing' | 'sliding-out'

export function useJamSlideTransition() {
  const isSlideActive = useState<boolean>('jam_slide_active', () => false)
  const slideDirection = useState<SlideDirection>('jam_slide_direction', () => 'to-jam')
  const slideStage = useState<SlideStage>('jam_slide_stage', () => 'idle')

  async function triggerSlideTransition(to: string = '/jam', direction: SlideDirection = 'to-jam') {
    if (isSlideActive.value) return

    slideDirection.value = direction
    slideStage.value = 'sliding-in'
    isSlideActive.value = true

    try {
      if (import.meta.client) {
        document.body.style.overflow = 'hidden'
      }

      // Wait for the slide-in animation to finish (450ms)
      await new Promise((resolve) => setTimeout(resolve, 450))

      // Now in standing position at center
      slideStage.value = 'standing'
      const standStart = Date.now()

      // Trigger router navigation to the destination in background
      try {
        await navigateTo(to)
      } catch (err) {
        console.error('Navigation error during slide transition:', err)
      }

      // Ensure it stands still for at least 1000ms (or until page completely loads)
      const elapsed = Date.now() - standStart
      const remaining = Math.max(0, 1000 - elapsed)
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }

      // Ensure DOM paint of destination page
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 80))

      // Swipe out
      slideStage.value = 'sliding-out'
      await new Promise((resolve) => setTimeout(resolve, 450))
    } finally {
      // Reset and cleanup
      slideStage.value = 'idle'
      isSlideActive.value = false

      if (import.meta.client) {
        document.body.style.overflow = ''
      }
    }
  }

  function handleSlideClick(
    event: MouseEvent,
    to: string = '/jam',
    direction: SlideDirection = 'to-jam'
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    triggerSlideTransition(to, direction)
  }

  return {
    isSlideActive,
    slideDirection,
    slideStage,
    triggerSlideTransition,
    handleSlideClick,
  }
}
