<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reportApiError } from '~/types/auth'
import { resolveProfileImageUrl } from '~/utils/profileImage'

definePageMeta({
  layout: 'user-navbar',
})

import type { PageAnchor } from '@nuxt/ui'

const toast = useToast()
const { fetchAccount, saveAccount, uploadProfilePicture, changePassword, isAuthenticated, isUiOnlyMode } = useAccount()

const genderOptions = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' }
]

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

const schema = z.object({
  firstName: z.string().min(1, 'Enter your first name'),
  lastName: z.string().min(1, 'Enter your last name'),
  email: z.string().email('Invalid email'),
  gender: z.enum(['MALE', 'FEMALE'], { message: 'Please select a gender' })
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  firstName: '',
  lastName: '',
  email: '',
  gender: 'FEMALE'
})

const profileImageURL = ref('')
const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const passwordState = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})
const isChangingPassword = ref(false)

const displayName = computed(() => `${state.firstName} ${state.lastName}`.trim())
const profileImageSrc = computed(() => resolveProfileImageUrl(profileImageURL.value))

function applyAccountToForm(account: {
  email: string
  firstName: string
  lastName: string
  gender: string
  profileImageURL?: string
}) {
  state.firstName = account.firstName
  state.lastName = account.lastName
  state.email = account.email
  state.gender = account.gender === 'MALE' || account.gender === 'FEMALE'
    ? account.gender
    : 'FEMALE'
  profileImageURL.value = account.profileImageURL ?? ''
}

async function loadProfile() {
  isLoading.value = true
  try {
    const account = await fetchAccount()
    applyAccountToForm(account)
  } catch (error) {
    reportApiError(toast, { title: 'Unable to load profile', error })
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (isSaving.value) {
    return
  }

  isSaving.value = true
  try {
    const response = await saveAccount({
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
      gender: payload.data.gender
    })
    toast.add({ title: 'Profile updated', description: response.message })
  } catch (error) {
    reportApiError(toast, { title: 'Save failed', error })
  } finally {
    isSaving.value = false
  }
}

function openFilePicker() {
  fileInputRef.value?.click()
}

async function onProfileImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  isUploading.value = true
  try {
    const response = await uploadProfilePicture(file)
    const { user } = useAuth()
    if (user.value) {
      applyAccountToForm(user.value)
    }
    toast.add({ title: 'Profile picture updated', description: response.message })
  } catch (error) {
    reportApiError(toast, { title: 'Upload failed', error })
  } finally {
    isUploading.value = false
  }
}

async function submitPasswordChange() {
  if (isChangingPassword.value) {
    return
  }

  if (!passwordState.currentPassword.trim()) {
    toast.add({ title: 'Current password required', color: 'error' })
    return
  }
  if (passwordState.newPassword.trim().length < 6) {
    toast.add({ title: 'New password too short', description: 'Password must be at least 6 characters.', color: 'error' })
    return
  }
  if (passwordState.newPassword !== passwordState.confirmNewPassword) {
    toast.add({ title: 'Passwords do not match', description: 'Confirm your new password.', color: 'error' })
    return
  }

  isChangingPassword.value = true
  try {
    const response = await changePassword(passwordState.currentPassword, passwordState.newPassword)
    toast.add({ title: 'Password updated', description: response.message })
    passwordState.currentPassword = ''
    passwordState.newPassword = ''
    passwordState.confirmNewPassword = ''
  } catch (error) {
    reportApiError(toast, { title: 'Password update failed', error })
  } finally {
    isChangingPassword.value = false
  }
}

onMounted(async () => {
  if (!isUiOnlyMode.value && !isAuthenticated.value) {
    await navigateTo('/UserLogin')
    return
  }
  await loadProfile()
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
        <div v-if="isLoading" class="py-12 text-center text-muted">
          Loading profile...
        </div>
        <div v-else class="flex w-full gap-4">
          <div class=" w-1/3">
            <div class="flex justify-center gap-4 mb-6 w-full">
              <img :src="profileImageSrc" class="rounded-full object-cover size-[150px]" :alt="displayName" width="150" height="150" />
            </div>
            <div class="text-center">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                class="hidden"
                @change="onProfileImageSelected"
              >
              <UButton
                icon="i-lucide-upload"
                label="Upload new picture"
                variant="outline"
                :loading="isUploading"
                @click="openFilePicker"
              />
              <div class="text-sm text-muted mt-1">PNG or JPG (Max 2MB)</div>
            </div>
          </div>
          <UForm :schema="schema" :state="state" class="space-y-4 w-2/3" @submit="onSubmit">
            <UFormField label="First name" name="firstName" required>
              <UInput v-model="state.firstName" class="w-full" />
            </UFormField>
            <UFormField label="Last name" name="lastName" required>
              <UInput v-model="state.lastName" class="w-full" />
            </UFormField>
            <UFormField label="Email" name="email">
              <UInput v-model="state.email" type="email" class="w-full" disabled />
            </UFormField>
            <UFormField label="Gender" name="gender" required>
              <USelect v-model="state.gender" :items="genderOptions" placeholder="Select gender" class="w-full" />
            </UFormField>
            <div class="flex justify-end pt-2">
              <UButton type="submit" :loading="isSaving">Save Changes</UButton>
            </div>
          </UForm>
        </div>
      </UPageCard>

      <UPageCard id="password" class="col-span-2 white-bread-container">
        <div class="text-lg text-pretty font-semibold text-muted">Password</div>
        <div v-if="isLoading" class="py-12 text-center text-muted">
          Loading profile...
        </div>
        <div v-else class="max-w-xl space-y-4">
          <UForm class="space-y-4" @submit.prevent="submitPasswordChange">
            <UFormField label="Current password" name="currentPassword" required>
              <UInput v-model="passwordState.currentPassword" type="password" class="w-full" autocomplete="current-password" />
            </UFormField>
            <UFormField label="New password" name="newPassword" required>
              <UInput v-model="passwordState.newPassword" type="password" class="w-full" autocomplete="new-password" />
            </UFormField>
            <UFormField label="Confirm new password" name="confirmNewPassword" required>
              <UInput v-model="passwordState.confirmNewPassword" type="password" class="w-full" autocomplete="new-password" />
            </UFormField>
            <div class="flex justify-end pt-2">
              <UButton type="submit" :loading="isChangingPassword">Update password</UButton>
            </div>
          </UForm>
        </div>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>

<style></style>
