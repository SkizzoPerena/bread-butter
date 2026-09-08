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
  name1: z.string().min(4, 'Enter a name'),
  name2: z.string().min(4, 'Enter a name'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(11, 'Invalid phone number'),
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

const state = reactive<Schema>({
  name1: '',
  name2: '',
  email: '',
  phone: '',
  password: '',
  repass: '',
  tnc: false,
  updates: false
})

const isPasswordVisible = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Submitted', payload)
  await navigateTo('/')
}

</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen">

    <UPageCard class="bread-container w-full max-w-md ring ring-transparent p-2 sm:p-4">
      <div class="gap-8">
        <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
          <div class="flex justify-between mt-1 mb-6 items-center">
            <div class="text-left text-sm text-muted">
              <div class="text-xl font-serif font-semibold text-toast-700">Warm up the ovens</div>
              Create your account and start planning
            </div>

            <img src="..\assets\bpb-icons\logomark.svg" class="h-10" />
          </div>
          <UFormField label="Names" name="names" class="" required>
            <div class="flex justify-between items-center">
              <UInput class="w-full" v-model="state.name1" placeholder="The Bride" />
              <div class="mx-1 font-semibold text-toast-400">&</div>
              <UInput class="w-full" v-model="state.name2" placeholder="The Groom" />
            </div>
          </UFormField>
          <UFormField label="Email" name="email" class="" required>
            <UInput class="w-full" v-model="state.email" placeholder="Enter your email" />
          </UFormField>
          <UFormField label="Phone number" name="phone" class="" required>
            <UInput class="w-full" v-model="state.phone">
              <template #leading>
                <div id="country-code" class=" text-muted" aria-live="polite" role="status">+63
                </div>
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Password" name="password" required>
            <UInput v-model="state.password" :type="isPasswordVisible ? 'text' : 'password'" class="w-full"
              placeholder="Enter your password">
              <template #trailing>
                <UButton color="neutral" variant="link" size="sm"
                  :icon="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" :padded="false"
                  @click="() => { isPasswordVisible = !isPasswordVisible }" />
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Re-type password" name="repass" required>
            <UInput v-model="state.repass" :type="isPasswordVisible ? 'text' : 'password'" class="w-full"
              placeholder="Enter your password">
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
                  <span class="text-sm">I agree to Bread+Butter's <ULink to="/terms" class="text-primary font-medium">
                      Terms and
                      Conditions.</ULink></span>
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="updates">
              <UCheckbox v-model="state.updates" name="updates" label="I want to receive updates from Bread+Butter." />
            </UFormField>
          </div>
          <UButton type="submit" block>Sign up</UButton>
          <div class="text-sm text-center mt-1">
            Already have an account? <ULink to="/user/login" class="text-primary font-medium">Sign in</ULink> instead.
          </div>
        </UForm>
      </div>
    </UPageCard>
  </div>

</template>

<style></style>