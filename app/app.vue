<script setup>
import JamSlideOverlay from '~/components/JamSlideOverlay.vue'

useHead({
  title: "Bread+Butter, your event's digital home",
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: "Bread+Butter, your event's digital home",
  ogTitle: "Bread+Butter, your event's digital home",
  description: 'Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to guest lists and RSVP management.',
  ogDescription: 'Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to guest lists and RSVP management.',
  ogSiteName: 'Bread + Butter',
  twitterCard: 'summary_large_image',
  twitterTitle: "Bread+Butter, your event's digital home",
  twitterDescription: 'Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to guest lists and RSVP management.'
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
