<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()
const { executeAction, apiRequest } = useApiMode()

type Step = 'email' | 'otp' | 'password'

const step = ref<Step>('email')
const otpId = ref<string>('')
const isSubmitting = ref(false)

const emailSchema = z.object({
  email: z.string().email('Invalid email'),
})
type EmailSchema = z.output<typeof emailSchema>

const otpSchema = z.object({
  pinCode: z.string().regex(/^[0-9]{4}$/, 'OTP must be a 4-digit code'),
})
type OtpSchema = z.output<typeof otpSchema>

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmNewPassword: z.string().min(6, 'Confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })
type PasswordSchema = z.output<typeof passwordSchema>

const state = reactive({
  email: '',
  pinCode: '',
  newPassword: '',
  confirmNewPassword: '',
})

async function submitEmail(event: FormSubmitEvent<EmailSchema>) {
  isSubmitting.value = true
  try {
    await executeAction({
      uiOnly: async () => {
        toast.add({
          title: 'OTP requested',
          description: 'If the email exists, an OTP was generated.',
          color: 'info',
        })
        otpId.value = 'ui-only'
        step.value = 'otp'
      },
      api: () =>
        apiRequest<{ otpId?: string; message?: string }>('/otp/generate', {
          method: 'POST',
          authenticated: false,
          body: { email: event.data.email },
        }),
      onApiSuccess: async (res) => {
        otpId.value = String(res?.otpId ?? '')
        toast.add({
          title: 'OTP requested',
          description: res?.message ?? 'If the email exists, an OTP was generated.',
          color: 'success',
        })
        step.value = 'otp'
      },
    })
  } catch (error: any) {
    const msg = error?.data?.message || 'Could not request OTP. Please try again.'
    toast.add({ title: 'Request failed', description: msg, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

async function submitOtp(event: FormSubmitEvent<OtpSchema>) {
  if (!otpId.value) return
  isSubmitting.value = true
  try {
    await executeAction({
      uiOnly: async () => {
        toast.add({ title: 'OTP verified', color: 'success' })
        step.value = 'password'
      },
      api: () =>
        apiRequest('/otp/verify/' + otpId.value, {
          method: 'PATCH',
          authenticated: false,
          body: { pinCode: event.data.pinCode },
        }),
      onApiSuccess: async (res: any) => {
        toast.add({
          title: 'OTP verified',
          description: res?.message ?? undefined,
          color: 'success',
        })
        step.value = 'password'
      },
    })
  } catch (error: any) {
    const msg = error?.data?.message || 'Invalid or expired OTP.'
    toast.add({ title: 'Verification failed', description: msg, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

async function resendOtp() {
  if (!otpId.value) return
  isSubmitting.value = true
  try {
    await executeAction({
      uiOnly: async () => {
        toast.add({ title: 'OTP resent', description: 'A new OTP was generated.', color: 'info' })
      },
      api: () =>
        apiRequest('/otp/resend/' + otpId.value, {
          method: 'PATCH',
          authenticated: false,
        }),
      onApiSuccess: async (res: any) => {
        toast.add({
          title: 'OTP resent',
          description: res?.message ?? 'A new OTP was generated.',
          color: 'success',
        })
      },
    })
  } catch (error: any) {
    const msg = error?.data?.message || 'Could not resend OTP.'
    toast.add({ title: 'Resend failed', description: msg, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

async function submitNewPassword(event: FormSubmitEvent<PasswordSchema>) {
  if (!otpId.value) return
  isSubmitting.value = true
  try {
    await executeAction({
      uiOnly: async () => {
        toast.add({ title: 'Password updated', description: 'Sign in with your new password.', color: 'success' })
        await navigateTo('/UserLogin')
      },
      api: () =>
        apiRequest('/otp/change-password/' + otpId.value, {
          method: 'PATCH',
          authenticated: false,
          body: {
            newPassword: event.data.newPassword,
            confirmNewPassword: event.data.confirmNewPassword,
          },
        }),
      onApiSuccess: async (res: any) => {
        toast.add({
          title: 'Password updated',
          description: res?.message ?? 'Sign in with your new password.',
          color: 'success',
        })
        await navigateTo('/UserLogin')
      },
    })
  } catch (error: any) {
    const msg = error?.data?.message || 'Could not update password.'
    toast.add({ title: 'Update failed', description: msg, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

</script>

<template>
    <div class="flex items-center justify-center p-4 bpb-pattern h-screen">
        <UPageCard class="bread-container w-full max-w-md ring ring-transparent p-2 sm:p-4 bg-bread-200">
            <div class="gap-8">
                <div class="text-left text-sm text-muted mt-1 mb-6">
                    <div class="text-xl font-serif font-semibold text-toast-700">Forgot your password?</div>
                    <div v-if="step === 'email'">Enter your email and we’ll generate an OTP.</div>
                    <div v-else-if="step === 'otp'">Enter the 4-digit OTP (check MongoDB for now).</div>
                    <div v-else>Set your new password.</div>
                </div>

                <UForm v-if="step === 'email'" :schema="emailSchema" :state="state" class="space-y-5" @submit="submitEmail">
                    <UFormField label="Email" name="email" required>
                        <UInput class="w-full" v-model="state.email" placeholder="Enter your email" />
                    </UFormField>
                    <UButton type="submit" block :loading="isSubmitting">Generate OTP</UButton>
                </UForm>

                <UForm v-else-if="step === 'otp'" :schema="otpSchema" :state="state" class="space-y-5" @submit="submitOtp">
                    <UFormField label="OTP" name="pinCode" required>
                        <UInput class="w-full" v-model="state.pinCode" placeholder="4-digit OTP" inputmode="numeric" />
                    </UFormField>
                    <div class="grid grid-cols-2 gap-3">
                        <UButton type="button" variant="soft" block :loading="isSubmitting" @click="resendOtp">Resend</UButton>
                        <UButton type="submit" block :loading="isSubmitting">Verify</UButton>
                    </div>
                    <UButton type="button" variant="link" block @click="step = 'email'">Use a different email</UButton>
                </UForm>

                <UForm v-else :schema="passwordSchema" :state="state" class="space-y-5" @submit="submitNewPassword">
                    <UFormField label="New password" name="newPassword" required>
                        <UInput class="w-full" v-model="state.newPassword" type="password" placeholder="New password" />
                    </UFormField>
                    <UFormField label="Confirm new password" name="confirmNewPassword" required>
                        <UInput class="w-full" v-model="state.confirmNewPassword" type="password" placeholder="Confirm new password" />
                    </UFormField>
                    <UButton type="submit" block :loading="isSubmitting">Update password</UButton>
                </UForm>

                <div class="text-sm text-center mt-4">
                    Remembered your password? <ULink to="/UserLogin" class="text-primary font-medium">Sign in</ULink> instead.
                </div>
            </div>
        </UPageCard>
    </div>
</template>

<style>
</style>