<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
},
{
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
},
{
  name: 'tnc',
  type: 'checkbox'
},
{
  name: 'updates',
  label: "I want to receive newsletter updates.",
  type: 'checkbox'
}]
const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  tnc: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions.'),
  updates: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: '',
  password: '',
  tnc: false,
  updates: false
})

const isPasswordVisible = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Submitted', payload)
  await navigateTo('/UserDashboard')
}

const stats = [
  { value: '500+', description: 'Events planned' },
  { value: '10,000+', description: 'Invitations sent' },
  { value: '100%', description: 'Convenience' }
]

</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen">

    <UPageCard class="bread-container w-auto max-w-3xl ring ring-transparent p-2 sm:p-4">
      <div class="flex gap-8">
        <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
          <div class="text-left text-sm text-muted mt-1 mb-6">
            <div class="text-xl font-serif font-semibold text-toast-700">UForm Signup</div>
            Create your account and start planning
          </div>
          <UFormField label="Email" name="email" class="" required>
            <UInput class="w-full" v-model="state.email" placeholder="Enter your email" />
          </UFormField>
          <UFormField label="Password" name="password" required>
            <UInput v-model="state.password" :type="isPasswordVisible ? 'text' : 'password'" class="w-full"
              placeholder="Enter your password">
              <template #trailing>
                <UButton color="neutral" variant="link" size="sm"
                  :icon="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" :padded="false"
                  @click="isPasswordVisible = !isPasswordVisible" />
              </template>
            </UInput>
          </UFormField>
          <UFormField name="tnc">
            <UCheckbox v-model="state.tnc" name="tnc">
              <template #label>
                <span class="text-sm">I agree to the <ULink to="/terms" class="text-primary font-medium">Terms and
                    Conditions.</ULink></span>
              </template>
            </UCheckbox>
          </UFormField>
          <UFormField name="updates">
            <UCheckbox v-model="state.updates" name="updates" label="I want to receive newsletter updates." />
          </UFormField>
          <UButton type="submit" block>Sign up</UButton>
          <div class="text-sm text-center mt-1">
            Already have an account? <ULink to="/UserLogin" class="text-primary font-medium">Sign in</ULink> instead.
          </div>
        </UForm>
      </div>
    </UPageCard>
  </div>

</template>

<style>

</style>