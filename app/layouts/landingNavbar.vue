<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
 
</script>

<template>

  <div class="fixed align-center w-full z-50">
    <UContainer>
      <UNavigationMenu variant="pill"
        class="mt-5">

          <NuxtLink to="/" class="flex items-center mr-4">
            <img src="..\assets\bpb-icons\logo-white.svg" class="h-6 color-primary-500"/>
          </NuxtLink>

      </UNavigationMenu>
    </UContainer>
  </div>
  <slot />


</template>

<style>

</style>