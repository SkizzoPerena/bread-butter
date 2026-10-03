<script setup lang="ts">
definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: '404 - Page Not Found | Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'The page you are looking for does not exist on Bread + Butter.'
    }
  ]
})

// Ensure server sends 404 status code if rendered on the server
if (import.meta.server) {
  setResponseStatus(404)
}
</script>

<template>
  <NotFoundContent />
</template>
