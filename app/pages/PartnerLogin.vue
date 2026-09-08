<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getApiErrorMessage } from '~/types/auth'
import { isRestrictedAccountError, RESTRICTED_ACCOUNT_MESSAGE } from '~/utils/restrictedAccount'

const toast = useToast()
const route = useRoute()
const { login } = useAuth('partner')

const isSubmitting = ref(false)

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Must be at least 6 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: '',
  password: ''
})

const isPasswordVisible = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  try {
    await login({
      email: payload.data.email.trim(),
      password: payload.data.password
    })

    toast.add({ title: 'Welcome back!', description: 'You are signed in.' })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect.trim() : ''
    await navigateTo(redirect || '/partners')
  } catch (error) {
    const isRestricted = isRestrictedAccountError(error)
    toast.add({
      title: isRestricted ? 'Account restricted' : 'Sign in failed',
      description: isRestricted
        ? RESTRICTED_ACCOUNT_MESSAGE
        : getApiErrorMessage(error, 'Unable to sign in. Check your email and password.'),
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen">


      <UPageCard class="h-2/3 w-full max-w-sm ring ring-transparent p-2 sm:p-4 bg-toast-700 text-white">
                    

        <div class="my-auto">
            <NuxtLink to="/" class="flex justify-center items-center" aria-label="Back to Bread + Butter home">
              <img src="..\assets\bpb-icons\logo-white.svg" class="h-12 mb-2" alt="Bread + Butter" />
              <div class="text-4xl font-bold font-serif ml-3 mt-1">Partners</div>
            </NuxtLink>
                <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <div class="text-center text-sm mb-6">
            <div class="text-xl font-serif font-semibold">Login</div>
          </div>

          <UFormField label="Email" name="email" required :ui="{label: ' text-white'}">
            <UInput v-model="state.email" type="email" class="w-full" placeholder="Enter your email"/>
          </UFormField>

          <UFormField label="Password" name="password" required :ui="{label: ' text-white'}">
            <UInput
              v-model="state.password"
              :type="isPasswordVisible ? 'text' : 'password'"
              class="w-full"
              placeholder="Enter your password"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :padded="false"
                  aria-label="Toggle password visibility"
                  @click="isPasswordVisible = !isPasswordVisible"
                />
              </template>
            </UInput>
            <template #hint>
              <ULink to="/partners/forgot-password" class="text-bread-400 font-medium hover:text-bread-50" tabindex="-1">Forgot password?</ULink>
            </template>
          </UFormField>

          <UButton type="submit" block :loading="isSubmitting">Sign in</UButton>

          <p class="text-sm text-center mb-2">
            New Partner? <ULink to="/partners/signup" class="text-bread-400 font-medium hover:text-bread-50">Sign up here.</ULink>
          </p>
        </UForm></div>
      </UPageCard>
  </div>
</template>

<style>
.login-bg {
  background-image: url('../assets/bpb-images/login-aisle.jpg');
  background-size: cover;
}
</style>