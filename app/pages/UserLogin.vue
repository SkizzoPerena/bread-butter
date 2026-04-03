<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
}, {
  name: 'remember',
  label: 'Remember me',
  type: 'checkbox'
}]

const providers = [{
  label: 'Sign in with Google',
  icon: 'i-simple-icons-google',
  onClick: () => {
    toast.add({ title: 'Google', description: 'Sign in with Google' })
  }
}, {
  label: 'Sign in with Facebook',
  icon: 'i-simple-icons-facebook',
  onClick: () => {
    toast.add({ title: 'Facebook', description: 'Sign in with Facebook' })
  }
}]

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Submitted', payload)
  await navigateTo('/UserDashboard')
}
</script>

<template>
  <div class="flex items-center justify-center p-4 login-bg h-screen">

    <div class="flex justify-center items-center bg-toast-500/70 bread-container w-2/3 ">
      <UPageCard class=" bg-transparent w-full text-center flex flex-col justify-center mx-15" variant="ghost">
        <img src="../assets/bpb-icons/logo-white.svg" class="w-50 mx-auto" />
        <div class="text-3xl font-serif text-white mt-5">Today is the day!</div>
        <div class="text-white">Plan your perfect wedding with elegant tools designed for your special day. Create
          beautiful invitations and manage every detail with ease.</div>

        <UPageGrid class="gap-0 mt-5">
          <div class="w-full">
            <div class="text-2xl text-white font-serif">
              500+
            </div>
            <div class="text-md text-white">Events planned</div>
          </div>
                    <div class="w-full">
            <div class="text-2xl text-white font-serif">
              10,000+
            </div>
            <div class="text-md text-white">Invitations sent</div>
          </div>
                    <div class="w-full">
            <div class="text-2xl text-white font-serif">
              100%
            </div>
            <div class="text-md text-white">Convenience</div>
          </div>
        </UPageGrid>
      </UPageCard>




      <UPageCard class=" w-full max-w-sm h-full rounded-l-none ring ring-transparent p-2 sm:p-4">
        <UAuthForm :schema="schema" :fields="fields" @submit="onSubmit" class="my-0 py-0" :submit="{
          label: 'Sign-in',
        }">
          <template #description>
            <div class="text-left text-sm">
              <div class="text-xl font-serif font-semibold text-toast-700">Welcome back!</div>
              Sign in to continue planning your perfect day
            </div>
          </template>
          <template #password-hint>
            <ULink to="#" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
          </template>
          <template #footer>
            <USeparator label="or" class="mb-5" />
            <UButton icon="i-simple-icons-google" block variant="subtle"> Sign in with Google</UButton>
            <UButton icon="i-simple-icons-facebook" class="mb-5 mt-2" block variant="subtle"> Sign in with Facebook
            </UButton>
            <p class="text-sm text-center">
              By signing in, you agree to our <ULink to="#" class="text-primary font-medium">Terms of Service</ULink>.
            </p>
          </template>
        </UAuthForm>
      </UPageCard>
    </div>
  </div>
</template>


<style>
.login-bg {
  background-image: url('../assets/images/login-aisle.jpg');
  background-size: cover;
}
</style>