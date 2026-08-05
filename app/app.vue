<script setup>
definePageMeta({
  colorMode: 'light'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
/* Import Fontshare fonts */
@import url('https://api.fontshare.com/v2/css?f[]=gambetta@400,500,700&f[]=satoshi@400,500,700&f[]=switzer@400,500,700&f[]=pencerio@400&f[]=melodrama@400,500,700&f[]=erode@400,500,700&display=swap');
/* Import Google Fonts (Lora) */
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap');

/* Add any global styles here */

html {
  scrollbar-gutter: stable;
}
</style>
