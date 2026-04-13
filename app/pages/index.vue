<script setup lang="ts">

definePageMeta({
  layout: 'landing-navbar',
})

</script>

<template>
 <div>


    <UPageSection
      id="features"
      title="This is the EMPTY index page"
      description="Click below to access User Dashboard"
      
    >
        <UContainer class="flex justify-center items-center my-0"><UButton to="/UserLogin">Click Here</UButton></UContainer>
    </UPageSection>

  </div>
</template>

<style>
.landing-bg {
  background-image: url('../assets/bpb-images/login-aisle.jpg');
  background-size: cover;
}

</style>