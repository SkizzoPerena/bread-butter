<script setup>
import JamSlideOverlay from '~/components/JamSlideOverlay.vue'
import { SITE_URL, canonicalPath, isIndexablePath } from '#shared/seo'

const BRAND_IN_TITLE = /bread\s*\+\s*butter/i

useHead({
  title: "Bread+Butter, your event's digital home",
  titleTemplate: (titleChunk) => {
    if (!titleChunk) return "Bread+Butter, your event's digital home"
    return BRAND_IN_TITLE.test(titleChunk) ? titleChunk : `${titleChunk} | Bread+Butter`
  },
  htmlAttrs: {
    lang: 'en'
  }
})

// Each page points search engines at its own URL; private pages (dashboards,
// logins, guest links, event websites, 404s) are kept out of the index.
const route = useRoute()
const canonicalUrl = computed(() => `${SITE_URL}${canonicalPath(route.path)}`)

useHead({
  link: [{ key: 'canonical', rel: 'canonical', href: canonicalUrl }]
})

// Pages set their own title/description; link previews fall back to those
// when no og:title/og:description is given.
useSeoMeta({
  description: 'Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to guest lists and RSVP management.',
  robots: () => isIndexablePath(route.path) ? 'index, follow' : 'noindex, nofollow',
  ogSiteName: 'Bread + Butter',
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage: `${SITE_URL}/images/og-image.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: 'Bread + Butter',
  twitterCard: 'summary_large_image',
  twitterImage: `${SITE_URL}/images/og-image.png`
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppPageTransitionOverlay />
    <JamSlideOverlay />
  </UApp>
</template>

<style>
/* Add any global styles here */
</style>
