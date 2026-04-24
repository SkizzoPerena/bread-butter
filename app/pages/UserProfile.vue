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
        <UPageAnchors :links="links" class="items-start" :ui="{ linkLeading: 'ring-transparent'}"/>
      </UPageCard>
      <UPageCard id="profile" class="col-span-2 white-bread-container">
        <div class="text-lg text-pretty font-semibold text-muted mb-6">Profile</div>
        <div class="flex items-center gap-4 mb-6">
          <img src="../assets/Mirana.jpg" class="rounded-full"  alt="Jane Doe" width="200" />
          <div class="text-center">
            <UButton icon="i-lucide-upload" label="Upload new picture" variant="outline" />
            <div class="text-sm text-muted mt-1">PNG or JPG (Max 2MB)</div>
          </div>
        </div>
        <UForm :state="state" class="space-y-4">
          <UFormField label="Name" name="name">
            <UInput v-model="state.name" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" />
          </UFormField>
          <UFormField label="Contact Number" name="contact">
            <UInput v-model="state.contact" />
          </UFormField>
          <div class="flex justify-end pt-2">
              <UButton>Save Changes</UButton>
          </div>
        </UForm>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>

<style></style>