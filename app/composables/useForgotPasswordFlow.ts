import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AuthRole } from '~/composables/useAuth'

export type ForgotPasswordStep = 'email' | 'otp' | 'password'
export type ForgotPasswordVariant = 'user' | 'partner'

const emailSchema = z.object({
  email: z.string().email('Invalid email'),
})

const otpSchema = z.object({
  pinCode: z.string().regex(/^[0-9]{4}$/, 'OTP must be a 4-digit code'),
})

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmNewPassword: z.string().min(6, 'Confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })

export type ForgotPasswordEmailSchema = z.output<typeof emailSchema>
export type ForgotPasswordOtpSchema = z.output<typeof otpSchema>
export type ForgotPasswordPasswordSchema = z.output<typeof passwordSchema>

type OtpMessageResponse = { message?: string }
type GenerateOtpResponse = { otpId?: string; message?: string }

function otpApiPrefix(role: AuthRole): string {
  return role === 'partner' ? '/partner/otp' : '/user/otp'
}

function loginPathForVariant(variant: ForgotPasswordVariant): string {
  return variant === 'partner' ? '/partners/login' : '/user/login'
}

export function useForgotPasswordFlow(variant: ForgotPasswordVariant) {
  const role: AuthRole = variant === 'partner' ? 'partner' : 'user'
  const otpPrefix = otpApiPrefix(role)
  const loginPath = loginPathForVariant(variant)

  const toast = useToast()
  const { executeAction, apiRequest } = useApiMode()

  const step = ref<ForgotPasswordStep>('email')
  const otpId = ref('')
  const isSubmitting = ref(false)

  const state = reactive({
    email: '',
    pinCode: '',
    newPassword: '',
    confirmNewPassword: '',
  })

  async function submitEmail(event: FormSubmitEvent<ForgotPasswordEmailSchema>) {
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
          apiRequest<GenerateOtpResponse>(`${otpPrefix}/generate`, {
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
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Could not request OTP. Please try again.')
      toast.add({ title: 'Request failed', description: msg, color: 'error' })
    } finally {
      isSubmitting.value = false
    }
  }

  async function submitOtp(event: FormSubmitEvent<ForgotPasswordOtpSchema>) {
    if (!otpId.value) return
    isSubmitting.value = true
    try {
      await executeAction({
        uiOnly: async () => {
          toast.add({ title: 'OTP verified', color: 'success' })
          step.value = 'password'
        },
        api: () =>
          apiRequest<OtpMessageResponse>(`${otpPrefix}/verify/${otpId.value}`, {
            method: 'PATCH',
            authenticated: false,
            body: { pinCode: event.data.pinCode },
          }),
        onApiSuccess: async (res) => {
          toast.add({
            title: 'OTP verified',
            description: res?.message ?? undefined,
            color: 'success',
          })
          step.value = 'password'
        },
      })
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Invalid or expired OTP.')
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
          apiRequest<OtpMessageResponse>(`${otpPrefix}/resend/${otpId.value}`, {
            method: 'PATCH',
            authenticated: false,
          }),
        onApiSuccess: async (res) => {
          toast.add({
            title: 'OTP resent',
            description: res?.message ?? 'A new OTP was generated.',
            color: 'success',
          })
        },
      })
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Could not resend OTP.')
      toast.add({ title: 'Resend failed', description: msg, color: 'error' })
    } finally {
      isSubmitting.value = false
    }
  }

  async function submitNewPassword(event: FormSubmitEvent<ForgotPasswordPasswordSchema>) {
    if (!otpId.value) return
    isSubmitting.value = true
    try {
      await executeAction({
        uiOnly: async () => {
          toast.add({
            title: 'Password updated',
            description: 'Sign in with your new password.',
            color: 'success',
          })
          await navigateTo(loginPath)
        },
        api: () =>
          apiRequest<OtpMessageResponse>(`${otpPrefix}/change-password/${otpId.value}`, {
            method: 'PATCH',
            authenticated: false,
            body: {
              newPassword: event.data.newPassword,
              confirmNewPassword: event.data.confirmNewPassword,
            },
          }),
        onApiSuccess: async (res) => {
          toast.add({
            title: 'Password updated',
            description: res?.message ?? 'Sign in with your new password.',
            color: 'success',
          })
          await navigateTo(loginPath)
        },
      })
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Could not update password.')
      toast.add({ title: 'Update failed', description: msg, color: 'error' })
    } finally {
      isSubmitting.value = false
    }
  }

  function resetToEmailStep() {
    step.value = 'email'
  }

  return {
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
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}
