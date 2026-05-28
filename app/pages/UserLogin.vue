<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuth } from '~/composables/useAuth'
import { getApiErrorMessage } from '~/types/auth'
import { isRestrictedAccountError, RESTRICTED_ACCOUNT_MESSAGE } from '~/utils/restrictedAccount'

const toast = useToast()
const { login } = useAuth()

const isSubmitting = ref(false)

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Must be at least 6 characters'),
  remember: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: '',
  password: '',
  remember: false
})

const stats = [
  { value: '500+', description: 'Events planned' },
  { value: '10,000+', description: 'Invitations sent' },
  { value: '100%', description: 'Convenience' }
]

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  try {
    const result = await login({
      email: payload.data.email.trim(),
      password: payload.data.password,
      remember: payload.data.remember
    })

    if (!result) {
      return
    }

    toast.add({ title: 'Welcome back!', description: 'You are signed in.' })
    await navigateTo('/UserDashboard')
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
  <div class="flex items-center justify-center p-4 login-bg h-screen">
    <div class="flex justify-center items-center bg-toast-500/70 bread-container  w-2/3 ">
      <UPageCard class=" bg-transparent w-full text-center flex flex-col justify-center mx-15" variant="ghost">
        <img src="../assets/bpb-icons/logo-white.svg" class="w-50 mx-auto">
        <div class="text-3xl font-serif text-white mt-5">Today is the day!</div>
        <div class="text-white">Plan your perfect wedding with elegant tools designed for your special day. Create
          beautiful invitations and manage every detail with ease.</div>

        <UPageGrid class="gap-0 mt-5">
          <div v-for="(stat, index) in stats" :key="index" class="w-full">
            <div class="text-2xl text-white font-serif">
              {{ stat.value }}
            </div>
            <div class="text-md text-white">
              {{ stat.description }}
            </div>
          </div>
        </UPageGrid>
      </UPageCard>

      <UPageCard class=" w-full max-w-sm h-full rounded-l-none ring ring-transparent p-2 sm:p-4 bg-bread-200">
        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <div class="text-left text-sm">
            <div class="text-xl font-serif font-semibold text-toast-700">Welcome back!</div>
            Sign in to continue planning your perfect day
          </div>

          <UFormField label="Email" name="email" required>
            <UInput v-model="state.email" type="email" class="w-full" placeholder="Enter your email" />
          </UFormField>

          <UFormField label="Password" name="password" required>
            <UInput v-model="state.password" type="password" class="w-full" placeholder="Enter your password" />
            <template #hint>
              <ULink to="/UserForgotPassword" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
            </template>
          </UFormField>

          <UFormField name="remember">
            <UCheckbox v-model="state.remember" label="Remember me" />
          </UFormField>

          <UButton type="submit" block :loading="isSubmitting">Sign in</UButton>

          <p class="text-sm text-center">
            New to Bread+Butter? <ULink to="/UserSignup" class="text-primary font-medium">Sign up here.</ULink>
          </p>
        </UForm>
      </UPageCard>
    </div>
  </div>
</template>

<style>
.login-bg {
  background-image: url('../assets/bpb-images/login-aisle.jpg');
  background-size: cover;
}
</style>
