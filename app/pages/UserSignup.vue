<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuth } from '~/composables/useAuth'
import { getApiErrorMessage } from '~/types/auth'
import { isValidReferralCode, normalizeReferralCode } from '~/utils/referralCode'

const toast = useToast()
const route = useRoute()
const { register } = useAuth()

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
  referralCode: z.string().optional().refine(
    (value) => !value?.trim() || isValidReferralCode(value),
    'Referral code must be a 5-character hex string'
  ),
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
  referralCode: '',
  password: '',
  repass: '',
  tnc: false,
  updates: false
}

const state = useState<Schema>('user-signup-draft', () => {
  if (import.meta.client) {
    try {
      const saved = sessionStorage.getItem('bpb_user_signup_draft')
      if (saved) return JSON.parse(saved)
    } catch {}
  }
  return { ...defaultForm }
})

watch(
  () => state.value.referralCode,
  (value) => {
    const normalized = normalizeReferralCode(value)
    if (normalized !== value) {
      state.value.referralCode = normalized
    }
  }
)

onMounted(() => {
  const fromQuery =
    (typeof route.query.referralCode === 'string' && route.query.referralCode.trim())
    || (typeof route.query.ref === 'string' && route.query.ref.trim())
    || ''
  if (fromQuery && !state.value.referralCode?.trim()) {
    state.value.referralCode = normalizeReferralCode(fromQuery)
  }
})

// Sync draft changes to sessionStorage
watch(state, (val) => {
  if (import.meta.client) {
    try {
      sessionStorage.setItem('bpb_user_signup_draft', JSON.stringify(val))
    } catch {}
  }
}, { deep: true })

const isPasswordVisible = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) {
    return
  }

  const { email, password, firstName, lastName, gender, referralCode } = payload.data
  const normalizedReferral = normalizeReferralCode(referralCode)

  isSubmitting.value = true
  try {
    const res = await register({
      email,
      password,
      firstName,
      lastName,
      gender,
      ...(normalizedReferral ? { referralCode: normalizedReferral } : {})
    })
    if (import.meta.client) {
      sessionStorage.removeItem('bpb_user_signup_draft')
    }
    state.value = { ...defaultForm }
    toast.add({ title: 'Registration started', description: 'Please enter the verification code sent to your email.' })
    const otpId = res?.otpId || 'demo-otp-id'
    await navigateTo(`/user/otp?otpId=${encodeURIComponent(otpId)}&email=${encodeURIComponent(email)}`)
  } catch (error) {
    toast.add({
      title: 'Sign up failed',
      description: getApiErrorMessage(error, 'Unable to create your account.'),
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen">

    <UPageCard class="bread-container w-full max-w-md ring ring-transparent p-3 sm:p-4 bg-bread-200">
      <div class="gap-8">
        <UForm :schema="schema" :state="state" class="space-y-3 sm:space-y-4" @submit="onSubmit">
          <div class="flex justify-between mt-1 mb-4 sm:mb-6 items-center">
            <div class="text-left text-xs sm:text-sm text-muted">
              <div class="text-lg sm:text-xl font-serif font-semibold text-toast-700">Warm up the ovens</div>
              Create your account and start planning
            </div>

            <img src="..\assets\bpb-icons\logomark.svg" class="h-8 sm:h-10" />
          </div>
          <UFormField label="First name" name="firstName" required :ui="{ label: 'text-xs sm:text-sm' }">
            <UInput v-model="state.firstName" class="w-full text-xs sm:text-sm" placeholder="First name" />
          </UFormField>
          <UFormField label="Last name" name="lastName" required :ui="{ label: 'text-xs sm:text-sm' }">
            <UInput v-model="state.lastName" class="w-full text-xs sm:text-sm" placeholder="Last name" />
          </UFormField>
          <UFormField label="Email" name="email" required :ui="{ label: 'text-xs sm:text-sm' }">
            <UInput v-model="state.email" class="w-full text-xs sm:text-sm" placeholder="Enter your email" />
          </UFormField>
          <UFormField
            label="Referral code (optional)"
            name="referralCode"
            :ui="{ label: 'text-xs sm:text-sm' }"
            hint="Enter a friend's 5-character referral code to receive signup credit after email verification."
          >
            <UInput
              v-model="state.referralCode"
              class="w-full text-xs sm:text-sm uppercase"
              placeholder="e.g. 1A2B3"
              maxlength="5"
            />
          </UFormField>
          <UFormField label="Gender" name="gender" required :ui="{ label: 'text-xs sm:text-sm' }">
            <USelect v-model="state.gender" :items="genderOptions" placeholder="Select gender" class="w-full text-xs sm:text-sm" />
          </UFormField>
          <UFormField label="Password" name="password" required :ui="{ label: 'text-xs sm:text-sm' }">
            <UInput v-model="state.password" :type="isPasswordVisible ? 'text' : 'password'" class="w-full text-xs sm:text-sm"
              placeholder="Enter your password">
              <template #trailing>
                <UButton color="neutral" variant="link" size="sm"
                  :icon="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" :padded="false"
                  @click="() => { isPasswordVisible = !isPasswordVisible }" />
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Verify password" name="repass" required :ui="{ label: 'text-xs sm:text-sm' }">
            <UInput v-model="state.repass" :type="isPasswordVisible ? 'text' : 'password'" class="w-full text-xs sm:text-sm"
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
              <UCheckbox v-model="state.tnc" name="tnc" :ui="{ label: 'text-xs sm:text-sm' }">
                <template #label>
                  <span class="text-xs sm:text-sm">I agree to Bread+Butter's <ULink :to="{ path: '/terms', query: { from: 'user-signup' } }" class="text-primary font-medium">
                      Terms and
                      Conditions.</ULink></span>
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="updates">
              <UCheckbox v-model="state.updates" name="updates" label="I want to receive updates from Bread+Butter." :ui="{ label: 'text-xs sm:text-sm' }" />
            </UFormField>
          </div>
          <UButton type="submit" block size="sm" class="text-xs sm:text-sm py-1.5 sm:py-2" :loading="isSubmitting">Sign up</UButton>
          <div class="text-xs sm:text-sm text-center mt-1">
            Already have an account? <ULink to="/user/login" class="text-primary font-medium">Sign in</ULink> instead.
          </div>
        </UForm>
      </div>
    </UPageCard>
  </div>

</template>

<style></style>
