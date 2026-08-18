<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()

const isSubmitting = ref(false)

const genderOptions = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' }
]

const schema = z.object({
  firstName: z.string().min(1, 'Enter your first name'),
  lastName: z.string().min(1, 'Enter your last name'),
  email: z.string().email('Invalid email'),
  gender: z.enum(['MALE', 'FEMALE'], { message: 'Please select a gender' }),
  password: z.string().min(8, 'Must be at least 8 characters'),
  repass: z.string().min(8, 'Must be at least 8 characters'),
  tnc: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions.'),
  updates: z.boolean().optional()
}).refine((data) => {
  if (data.repass) {
    return data.password === data.repass
  }
  return true
}, {
  message: "Passwords don't match",
  path: ['repass'],
})

type Schema = z.output<typeof schema>

const defaultForm: Schema = {
  firstName: '',
  lastName: '',
  email: '',
  gender: undefined as unknown as Schema['gender'],
  password: '',
  repass: '',
  tnc: false,
  updates: false
}

const state = useState<Schema>('partner-signup-draft', () => {
  if (import.meta.client) {
    try {
      const saved = sessionStorage.getItem('bpb_partner_signup_draft')
      if (saved) return JSON.parse(saved)
    } catch {}
  }
  return { ...defaultForm }
})

// Sync draft changes to sessionStorage
watch(state, (val) => {
  if (import.meta.client) {
    try {
      sessionStorage.setItem('bpb_partner_signup_draft', JSON.stringify(val))
    } catch {}
  }
}, { deep: true })

const isPasswordVisible = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000))

  if (import.meta.client) {
    sessionStorage.removeItem('bpb_partner_signup_draft')
  }
  state.value = { ...defaultForm }

  console.log('Frontend-only registration with:', payload.data)
  toast.add({ title: 'Partner account created', description: 'Welcome to Bread+Butter!' })
  await navigateTo('/partners')

  isSubmitting.value = false
}

</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen text-white">

    <UPageCard class="bread-container w-full max-w-md ring ring-transparent p-2 sm:p-4 bg-toast-700 text-white">
      <div class="gap-8">
        <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
          <div class="flex justify-between mt-1 mb-6 items-center">
            <div class="text-left text-sm text-bread-400">
              <div class="text-xl font-serif font-semibold text-white">Become a Partner</div>
              Create your partner account
            </div>

            <img src="..\assets\bpb-icons\logomark.svg" class="h-10" />
          </div>
          <UFormField label="First name":ui="{label: ' text-white'}" name="firstName" required>
            <UInput v-model="state.firstName" class="w-full" placeholder="First name" />
          </UFormField>
          <UFormField label="Last name":ui="{label: ' text-white'}" name="lastName" required>
            <UInput v-model="state.lastName" class="w-full" placeholder="Last name" />
          </UFormField>
          <UFormField label="Email":ui="{label: ' text-white'}" name="email" required>
            <UInput v-model="state.email" class="w-full" placeholder="Enter your email" />
          </UFormField>
          <UFormField label="Gender":ui="{label: ' text-white'}" name="gender" required>
            <USelect v-model="state.gender" :items="genderOptions" placeholder="Select gender" class="w-full" />
          </UFormField>
          <UFormField label="Password":ui="{label: ' text-white'}" name="password" required>
            <UInput v-model="state.password" :type="isPasswordVisible ? 'text' : 'password'" class="w-full"
              placeholder="Enter your password">
              <template #trailing>
                <UButton color="neutral" variant="link" size="sm"
                  :icon="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" :padded="false"
                  @click="() => { isPasswordVisible = !isPasswordVisible }" />
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Verify password":ui="{label: ' text-white'}" name="repass" required>
            <UInput v-model="state.repass" :type="isPasswordVisible ? 'text' : 'password'" class="w-full"
              placeholder="Re-enter your password">
              <template #trailing>
                <UButton color="neutral" variant="link" size="sm"
                  :icon="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" :padded="false"
                  @click="() => { isPasswordVisible = !isPasswordVisible }" />
              </template>
            </UInput>
          </UFormField>
          <div class="space-y-1">
            <UFormField name="tnc">
              <UCheckbox v-model="state.tnc" name="tnc">
                <template #label>
                  <span class="text-sm text-white">I agree to Bread+Butter's <ULink :to="{ path: '/terms', query: { from: 'partner-signup' } }" class="text-bread-400 font-medium">
                      Terms and
                      Conditions.</ULink></span>
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="updates">
              <UCheckbox v-model="state.updates" name="updates":ui="{label: ' text-white'}" label="I want to receive updates from Bread+Butter." />
            </UFormField>
          </div>
          <UButton type="submit" block :loading="isSubmitting">Sign up</UButton>
          <div class="text-sm text-center mt-1">
            Already a partner? <ULink to="/partners/login" class="text-bread-400 font-medium">Sign in</ULink> instead.
          </div>
        </UForm>
      </div>
    </UPageCard>
  </div>

</template>

<style></style>