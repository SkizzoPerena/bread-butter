<script lang="ts" setup>
import { reactive } from 'vue'

definePageMeta({
  layout: 'user-navbar',
})

import type { PageAnchor } from '@nuxt/ui'

const links = ref<PageAnchor[]>([
  {
    label: 'Profile',
    icon: 'i-lucide-user-cog',
    to: '#profile'
  },
  {
    label: 'Password',
    icon: 'i-lucide-lock',
    to: '#password'
  },
  {
    label: 'Membership',
    icon: 'i-lucide-circle-star',
    to: '#membership'

  },
  {
    label: 'Payments and Billing',
    icon: 'i-lucide-credit-card',
    to: '#billing'

  },
  {
    label: 'Preferences',
    icon: 'i-lucide-settings',
    to: '#preferences'

  },
])

const state = reactive({
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  contact: '0912 345 6789',
})

</script>

<template>
  <UContainer>
    <UPageGrid class="items-start">
      <UPageCard class="white-bread-container">
        <div class="text-lg text-pretty font-semibold text-muted">Account Settings</div>
        <UPageAnchors :links="links" class="items-start" :ui="{ linkLeading: 'ring-transparent' }" />
      </UPageCard>
      <UPageCard id="profile" class="col-span-2 white-bread-container">
        <div class="text-lg text-pretty font-semibold text-muted">Profile</div>
        <div class="flex w-full gap-4">
          <div class=" w-1/3">
            <div class="flex justify-center gap-4 mb-6 w-full">
              <img src="../assets/Mirana.jpg" class="rounded-full" alt="Jane Doe" width="150" />

            </div>
            <div class="text-center">
              <UButton icon="i-lucide-upload" label="Upload new picture" variant="outline" />
              <div class="text-sm text-muted mt-1">PNG or JPG (Max 2MB)</div>
            </div>
          </div>
          <UForm :state="state" class="space-y-4 w-2/3">
            <UFormField label="Name" name="name">
              <UInput v-model="state.name" class="w-full" />
            </UFormField>
            <UFormField label="Email" name="email">
              <UInput v-model="state.email" type="email" class="w-full" />
            </UFormField>
            <UFormField label="Contact Number" name="contact">
              <UInput v-model="state.contact" class="w-full" />
            </UFormField>
            <div class="flex justify-end pt-2">
              <UButton>Save Changes</UButton>
            </div>
          </UForm>
        </div>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>

<style></style>