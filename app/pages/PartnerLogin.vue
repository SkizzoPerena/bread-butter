<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()

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
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000))

  console.log('Frontend-only login with:', payload.data)
  toast.add({ title: 'Welcome back!', description: 'You are signed in.' })
  await navigateTo('/partners')

  isSubmitting.value = false
}
</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen">


      <UPageCard class="h-2/3 w-full max-w-sm ring ring-transparent p-2 sm:p-4 bg-toast-700 text-white">
                    

        <div class="my-auto">
            <div class="flex justify-center"><img src="..\assets\bpb-icons\logo-white.svg" class="h-12 mb-2" />
            <div class="text-4xl font-bold font-serif ml-3 mt-1">Partners</div>
            </div>
                <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <div class="text-center text-sm mb-6">
            <div class="text-xl font-serif font-semibold">Login</div>
          </div>

          <UFormField label="Email" name="email" required :ui="{label: ' text-white'}">
            <UInput v-model="state.email" type="email" class="w-full" placeholder="Enter your email"/>
          </UFormField>

          <UFormField label="Password" name="password" required :ui="{label: ' text-white'}">
            <UInput v-model="state.password" type="password" class="w-full" placeholder="Enter your password" />
            <template #hint>
              <ULink to="/partners/forgot-password" class="text-bread-400 font-medium hover:text-bread-50" tabindex="-1">Forgot password?</ULink>
            </template>
          </UFormField>

          <UFormField name="remember">
            <UCheckbox v-model="state.remember" label="Remember me"  :ui="{label: ' text-white'}"/>
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