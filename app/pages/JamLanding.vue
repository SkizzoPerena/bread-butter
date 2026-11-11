<script setup lang="ts">
import JamLandingHome from '~/components/JamLandingHome.vue'

definePageMeta({
  layout: 'jam-landing-navbar',
})

useHead({
  title: 'Jam by Bread + Butter - Mass Invitations & Guest Management',
  meta: [
    {
      name: 'description',
      content: "Bread+Butter's Jam is the mass guest invitation, RSVP organizer, and same-day event attendance checker.",
    },
  ],
})
</script>

<template>
  <JamLandingHome />
</template>
