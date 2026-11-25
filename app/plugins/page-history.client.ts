import {
  usePageTransition,
  isJamPath,
  isRouteExcludedFromTransition,
  isTransitionBetweenLandingPages,
} from '~/composables/usePageTransition'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { recordPageVisit } = useAppNavigation()
  const {
    isTransitionActive,
    isTransitionVisible,
    isJamTransition,
    transitionStartTime,
    finishPageTransition,
  } = usePageTransition()

  router.beforeEach((to, from) => {
    // If navigation is within the exact same path & query, skip
    if (to.fullPath === from.fullPath) return

    // If destination is an excluded route:
    if (isRouteExcludedFromTransition(to.path)) {
      if (isTransitionActive.value) {
        isTransitionVisible.value = false
        isTransitionActive.value = false
      }
      return
    }

    // If landing-to-landing (handled by JamSlideOverlay):
    if (isTransitionBetweenLandingPages(from.path, to.path)) {
      return
    }

    // Determine branding strictly by destination
    isJamTransition.value = isJamPath(to.path)

    // Activate transition overlay
    if (!isTransitionActive.value) {
      transitionStartTime.value = Date.now()
      isTransitionActive.value = true
      isTransitionVisible.value = true
    }
  })

  router.afterEach((to, from) => {
    // Record the originating page path if available
    if (from && from.fullPath) {
      recordPageVisit(from.fullPath)
    }

    // If navigating to an excluded page, dismiss transition immediately
    if (isRouteExcludedFromTransition(to.path)) {
      isTransitionVisible.value = false
      isTransitionActive.value = false
      return
    }

    // Safety fallback: if the destination page fails to call finishPageTransition (e.g. unhandled error or static page),
    // cleanly dismiss after 8s so user is never stuck
    const startedAt = transitionStartTime.value
    setTimeout(() => {
      if (isTransitionActive.value && transitionStartTime.value === startedAt) {
        finishPageTransition()
      }
    }, 8000)
  })

  router.onError(() => {
    // On navigation error, cleanly dismiss transition
    isTransitionVisible.value = false
    isTransitionActive.value = false
  })
})
