export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { recordPageVisit } = useAppNavigation()
  const { finishPageTransition } = usePageTransition()

  router.afterEach((to, from) => {
    // Record the originating page path if available
    if (from && from.fullPath) {
      recordPageVisit(from.fullPath)
    }

    // Safety: ensure any active page transition finishes smoothly after arrival
    setTimeout(() => {
      finishPageTransition({ minDuration: 400 })
    }, 200)
  })
})
