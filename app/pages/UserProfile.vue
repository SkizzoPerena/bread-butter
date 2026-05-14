<script lang="ts" setup>
import { reactive, ref, computed } from 'vue'

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

const { data: userAccount, error } = await useAsyncData<any>('userAccount', () => 
  useApi()('/api/user/account', { method: 'GET' })
)

if (error.value) {
  console.error('Failed to fetch user account details:', error.value)
  if ((error.value as any).statusCode === 401 || (error.value as any).response?.status === 401) {
    await navigateTo('/UserLogin')
  }
}

const { data: profilePicData } = await useAsyncData<any>('userProfilePic', () => 
  useApi()('/api/user/account/profile-picture', { method: 'GET' })
)

const userAvatar = computed(() => profilePicData.value?.url || profilePicData.value?.profilePicture || (typeof profilePicData.value === 'string' ? profilePicData.value : undefined))

const state = reactive({
  name: userAccount.value?.name || userAccount.value?.user?.name || '',
  email: userAccount.value?.email || userAccount.value?.user?.email || '',
  contact: userAccount.value?.phone || userAccount.value?.user?.phone || '',
})

const toast = useToast()
const isSaving = ref(false)

async function onSubmit() {
  isSaving.value = true
  try {
    await useApi()('/api/user/account', {
      method: 'PUT', // Change to PATCH or POST depending on your backend routes
      body: {
        name: state.name,
        email: state.email,
        phone: state.contact
      }
    })
    toast.add({ title: 'Success', description: 'Profile updated successfully!' })
    // Refresh the globally cached account data to automatically update the Navbar
    await refreshNuxtData('userAccount')
  } catch (error: any) {
    toast.add({ title: 'Update Failed', description: error.data?.message || 'Failed to save changes.', color: 'error' })
  } finally {
    isSaving.value = false
  }
}
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
              <img v-if="userAvatar" :src="userAvatar" class="rounded-full w-37.5 h-37.5 object-cover" :alt="state.name" />
              <UAvatar v-else :alt="state.name.slice(0, 2).toUpperCase()" class="w-37.5 h-37.5 text-5xl" />
            </div>
            <div class="text-center">
              <UButton icon="i-lucide-upload" label="Upload new picture" variant="outline" />
              <div class="text-sm text-muted mt-1">PNG or JPG (Max 2MB)</div>
            </div>
          </div>
          <UForm :state="state" class="space-y-4 w-2/3" @submit="onSubmit">
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
              <UButton type="submit" :loading="isSaving">Save Changes</UButton>
            </div>
          </UForm>
        </div>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>

<style></style>