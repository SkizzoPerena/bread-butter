<script setup lang="ts">

definePageMeta({
  layout: 'landing-navbar',
})



const state = reactive({
  name: undefined,
  email: undefined,
  subject: undefined,
  message: undefined,
})

</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-toast-700 text-white">
    <UCard class="w-full max-w-md mx-auto p-6 space-y-6 bg-bread-400 text-black shadow-lg rounded-lg">

        <h1 class="text-3xl font-bold text-center font-serif text-toast-800">Contact Us</h1>


      <div class="space-y-4">
        <p class="text-center text-lg">We'd love to hear from you!</p>

        <!-- Social Media & Contact Links -->
        <div class="flex justify-center space-x-4">
          <UButton
            icon="i-mdi-facebook"
            to="https://facebook.com/yourpage"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="xl"
            aria-label="Facebook"
          />
          <UButton
            icon="i-mdi-instagram"
            to="https://instagram.com/yourpage"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="xl"
            aria-label="Instagram"
          />
          <UButton
            icon="i-heroicons-globe-alt"
            to="https://yourwebsite.com"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="xl"
            aria-label="Website"
          />
          <UButton
            icon="i-lucide-phone"
            to="tel:+639123456789"
            variant="ghost"
            color="neutral"
            size="xl"
            aria-label="Phone"
          />
        </div>

        <UDivider label="OR" class="text-gray-500" />

        <!-- Contact Form -->
        <UForm :state="state" class="space-y-4">
          <UFormField label="Your Name" name="name">
            <UInput v-model="state.name" placeholder="John Doe" class="w-full" />
          </UFormField>

          <UFormField label="Your Email" name="email">
            <UInput v-model="state.email" type="email" placeholder="you@example.com"  class="w-full" />
          </UFormField>

          <UFormField label="Subject" name="subject">
            <UInput v-model="state.subject" placeholder="Inquiry about services" class="w-full"  />
          </UFormField>

          <UFormField label="Message" name="message">
            <UTextarea v-model="state.message" placeholder="Type your message here..."  class="w-full" />
          </UFormField>

          <UButton type="submit" block color="neutral" variant="solid" class="font-bold">
            Send Message
          </UButton>
        </UForm>
      </div>
    </UCard>
  </div>
</template>