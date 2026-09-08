<script setup lang="ts">
import type { ForgotPasswordVariant } from '~/composables/useForgotPasswordFlow'
import { useForgotPasswordFlow } from '~/composables/useForgotPasswordFlow'

const props = defineProps<{
  variant: ForgotPasswordVariant
}>()

const isPartner = computed(() => props.variant === 'partner')

const {
  emailSchema,
  otpSchema,
  passwordSchema,
  step,
  state,
  isSubmitting,
  loginPath,
  submitEmail,
  submitOtp,
  resendOtp,
  submitNewPassword,
  resetToEmailStep,
} = useForgotPasswordFlow(props.variant)

const cardClass = computed(() =>
  isPartner.value
    ? 'h-auto w-full max-w-sm ring ring-transparent p-2 sm:p-4 bg-toast-700 text-white'
    : 'bread-container w-full max-w-md ring ring-transparent p-2 sm:p-4 bg-bread-200'
)

const titleClass = computed(() =>
  isPartner.value ? 'text-xl font-serif font-semibold text-white' : 'text-xl font-serif font-semibold text-toast-700'
)

const subtitleClass = computed(() =>
  isPartner.value ? 'text-sm text-bread-200' : 'text-sm text-muted'
)

const fieldLabelUi = computed(() =>
  isPartner.value ? { label: 'text-white' } : undefined
)

const linkClass = computed(() =>
  isPartner.value ? 'text-bread-400 font-medium hover:text-bread-50' : 'text-primary font-medium'
)
</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen">
    <UPageCard :class="cardClass">
      <div class="gap-8">
        <div v-if="isPartner" class="flex justify-center mb-4">
          <img src="../assets/bpb-icons/logo-white.svg" class="h-10" alt="Bread + Butter">
          <div class="text-2xl font-bold font-serif ml-3 mt-0.5 text-white">Partners</div>
        </div>

        <div :class="['text-left mt-1 mb-6', isPartner ? 'text-center' : '']">
          <div :class="titleClass">Forgot your password?</div>
          <div :class="subtitleClass">
            <template v-if="step === 'email'">Enter your email and we’ll send an OTP.</template>
            <template v-else-if="step === 'otp'">Enter the 4-digit OTP from your email.</template>
            <template v-else>Set your new password.</template>
          </div>
        </div>

        <UForm v-if="step === 'email'" :schema="emailSchema" :state="state" class="space-y-5" @submit="submitEmail">
          <UFormField label="Email" name="email" required :ui="fieldLabelUi">
            <UInput v-model="state.email" type="email" class="w-full" placeholder="Enter your email" />
          </UFormField>
          <UButton type="submit" block :loading="isSubmitting">Generate OTP</UButton>
        </UForm>

        <UForm v-else-if="step === 'otp'" :schema="otpSchema" :state="state" class="space-y-5" @submit="submitOtp">
          <UFormField label="OTP" name="pinCode" required :ui="fieldLabelUi">
            <UInput
              v-model="state.pinCode"
              class="w-full"
              placeholder="4-digit OTP"
              inputmode="numeric"
              maxlength="4"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UButton type="button" variant="soft" block :loading="isSubmitting" @click="resendOtp">
              Resend
            </UButton>
            <UButton type="submit" block :loading="isSubmitting">Verify</UButton>
          </div>
          <UButton type="button" variant="link" block @click="resetToEmailStep">Use a different email</UButton>
        </UForm>

        <UForm v-else :schema="passwordSchema" :state="state" class="space-y-5" @submit="submitNewPassword">
          <UFormField label="New password" name="newPassword" required :ui="fieldLabelUi">
            <UInput v-model="state.newPassword" type="password" class="w-full" placeholder="New password" />
          </UFormField>
          <UFormField label="Confirm new password" name="confirmNewPassword" required :ui="fieldLabelUi">
            <UInput
              v-model="state.confirmNewPassword"
              type="password"
              class="w-full"
              placeholder="Confirm new password"
            />
          </UFormField>
          <UButton type="submit" block :loading="isSubmitting">Update password</UButton>
        </UForm>

        <div class="text-sm text-center mt-4">
          Remembered your password?
          <ULink :to="loginPath" :class="linkClass">Sign in</ULink>
          instead.
        </div>
      </div>
    </UPageCard>
  </div>
</template>
