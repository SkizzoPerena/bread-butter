<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuth } from '~/composables/useAuth'
import { useEvents } from '~/composables/useEvents'
import { getApiErrorMessage } from '~/types/auth'
import { isRestrictedAccountError, RESTRICTED_ACCOUNT_MESSAGE } from '~/utils/restrictedAccount'

const toast = useToast()
const route = useRoute()
const { login } = useAuth()
const { fetchUserEvents } = useEvents()
const { isUiOnlyMode } = useApiMode()

onMounted(async () => {
  const authenticated = await ensureSession()
  if (!authenticated) return
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect.trim() : ''
  await navigateTo(redirect || '/')
})

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
    await login({
      email: payload.data.email.trim(),
      password: payload.data.password
    })

    toast.add({ title: 'Welcome back!', description: 'You are signed in.' })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect.trim() : ''
    if (redirect) {
      await navigateTo(redirect)
      return
    }

    if (isUiOnlyMode.value) {
      await navigateTo('/')
      return
    }

    const events = await fetchUserEvents(true)
    if (events.length === 0) {
      await navigateTo('/user/create-event')
    } else {
      await navigateTo('/')
    }
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
    <div class=" justify-center items-center bg-toast-500/70 bread-container  w-2/3 h-2/3 hidden lg:flex">
      <UPageCard class=" bg-transparent w-full text-center flex flex-col justify-center mx-15" variant="ghost">
        <NuxtLink to="/" aria-label="Back to Bread + Butter home">
          <img src="../assets/bpb-icons/logo-white.svg" alt="Bread + Butter" class="w-50 mx-auto">
        </NuxtLink>
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

      <UPageCard class="w-full max-w-sm h-full rounded-l-none ring ring-transparent p-3 sm:p-4 bg-bread-200">
        <div class="my-auto">
          <UForm :schema="schema" :state="state" class="space-y-3 sm:space-y-4" @submit="onSubmit">
            <div class="text-left text-xs sm:text-sm">
              <div class="text-lg sm:text-xl font-serif font-semibold text-toast-700">Welcome back!</div>
              Sign in to continue planning your perfect day
            </div>

            <UFormField label="Email" name="email" required :ui="{ label: 'text-xs sm:text-sm' }">
              <UInput v-model="state.email" type="email" class="w-full text-xs sm:text-sm" placeholder="Enter your email" />
            </UFormField>

            <UFormField label="Password" name="password" required :ui="{ label: 'text-xs sm:text-sm' }">
              <UInput v-model="state.password" type="password" class="w-full text-xs sm:text-sm" placeholder="Enter your password" />
              <template #hint>
                <ULink to="/user/forgot-password" class="text-primary font-medium text-xs sm:text-sm" tabindex="-1">Forgot password?</ULink>
              </template>
            </UFormField>

            <UButton type="submit" block size="sm" class="text-xs sm:text-sm py-1.5 sm:py-2" :loading="isSubmitting">Sign in</UButton>

            <p class="text-xs sm:text-sm text-center">
              New to Bread+Butter? <ULink to="/user/signup" class="text-primary font-medium">Sign up here.</ULink>
            </p>
          </UForm>
        </div>
      </UPageCard>
    </div>

    <UPageCard class="w-full max-w-sm ring ring-transparent p-3 sm:p-4 bg-bread-200 lg:hidden">
      <div class="my-auto">
        <UForm :schema="schema" :state="state" class="space-y-3 sm:space-y-4 mb-4 mt-2 sm:mb-6 sm:mt-4" @submit="onSubmit">
          <NuxtLink to="/" aria-label="Back to Bread + Butter home" class="block w-fit mx-auto">
            <img src="..\assets\bpb-icons\logo.svg" alt="Bread + Butter" class="h-10 sm:h-12 mb-2 mx-auto" />
          </NuxtLink>
          <div class="text-center text-xs sm:text-sm mx-2">
            <div class="text-lg sm:text-xl font-serif font-semibold text-toast-700">Welcome back!</div>
            Sign in to continue planning your perfect day
          </div>

          <UFormField label="Email" name="email" required :ui="{ label: 'text-xs sm:text-sm' }">
            <UInput v-model="state.email" type="email" class="w-full text-xs sm:text-sm" placeholder="Enter your email" />
          </UFormField>

          <UFormField label="Password" name="password" required :ui="{ label: 'text-xs sm:text-sm' }">
            <UInput v-model="state.password" type="password" class="w-full text-xs sm:text-sm" placeholder="Enter your password" />
            <template #hint>
              <ULink to="/user/forgot-password" class="text-primary font-medium text-xs sm:text-sm" tabindex="-1">Forgot password?</ULink>
            </template>
          </UFormField>

          <UButton type="submit" block size="sm" class="text-xs sm:text-sm py-1.5 sm:py-2" :loading="isSubmitting">Sign in</UButton>

          <p class="text-xs sm:text-sm text-center">
            New to Bread+Butter? <ULink to="/user/signup" class="text-primary font-medium">Sign up here.</ULink>
          </p>
        </UForm>
      </div>
    </UPageCard>
  </div>
</template>

<style>
.login-bg {
  background-image: url('../assets/bpb-images/login-aisle.jpg');
  background-size: cover;
}
</style>
