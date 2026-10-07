import posthog from 'posthog-js'
import { setAnalyticsClient } from '~/utils/analytics'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const key = String(config.public.posthogKey || '').trim()
  if (!key) {
    setAnalyticsClient(null)
    return
  }

  posthog.init(key, {
    api_host: String(config.public.posthogHost || 'https://us.i.posthog.com'),
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
  })

  setAnalyticsClient(posthog)
})
