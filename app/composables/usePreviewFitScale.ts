import { onBeforeUnmount, onMounted, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue'

/**
 * Proportionally scales a preview card wrapper so it always fits inside the
 * desktop viewport without introducing scrollbars while preserving aspect ratio.
 */
export function usePreviewFitScale(enabled: Ref<boolean> | ComputedRef<boolean>) {
  const containerRef = shallowRef<HTMLElement | null>(null)
  const contentRef = shallowRef<HTMLElement | null>(null)
  const scale = ref(1)
  const scaledHeight = ref<number | null>(null)

  let resizeObserver: ResizeObserver | null = null

  function recalculate() {
    if (import.meta.server || !enabled.value) {
      scale.value = 1
      scaledHeight.value = null
      return
    }
    const container = containerRef.value
    const content = contentRef.value
    if (!container || !content || window.innerWidth < 1024) {
      scale.value = 1
      scaledHeight.value = null
      return
    }

    const style = getComputedStyle(container)
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    const availW = Math.max(0, container.clientWidth - padX)
    const availH = Math.max(0, container.clientHeight - padY)
    const naturalW = content.offsetWidth
    const naturalH = content.offsetHeight

    if (!naturalW || !naturalH || !availW || !availH) {
      scale.value = 1
      scaledHeight.value = null
      return
    }

    const nextScale = Math.min(1, availH / naturalH, availW / naturalW)
    scale.value = Number(nextScale.toFixed(4))
    scaledHeight.value = Math.ceil(naturalH * nextScale)
  }

  function observeTargets() {
    if (import.meta.server || typeof ResizeObserver === 'undefined') return
    resizeObserver?.disconnect()
    resizeObserver = new ResizeObserver(() => recalculate())
    if (containerRef.value) resizeObserver.observe(containerRef.value)
    if (contentRef.value) resizeObserver.observe(contentRef.value)
    recalculate()
  }

  onMounted(() => {
    observeTargets()
    window.addEventListener('resize', recalculate)
  })

  watch([containerRef, contentRef, enabled], () => {
    observeTargets()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (!import.meta.server) {
      window.removeEventListener('resize', recalculate)
    }
  })

  return {
    containerRef,
    contentRef,
    scale,
    scaledHeight,
    recalculate,
  }
}
