<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false,
})

useHead({
  title: 'Verify OTP - Bread + Butter',
})

const toast = useToast()
const route = useRoute()
const { executeAction, apiRequest } = useApiMode()

const isSubmitting = ref(false)
const otpId = computed(() => (typeof route.query.otpId === 'string' ? route.query.otpId : 'demo-otp-id'))
const userEmail = computed(() => (typeof route.query.email === 'string' && route.query.email.trim() ? route.query.email.trim() : 'your email address'))

// 4 individual digit boxes
const digits = ref<string[]>(['', '', '', ''])
const digitInputs = ref<(HTMLInputElement | null)[]>([])

const otpSchema = z.object({
  pinCode: z.string().regex(/^[0-9]{4}$/, 'OTP must be a 4-digit code'),
})
type OtpSchema = z.output<typeof otpSchema>

const state = reactive({
  pinCode: '',
})

// Sync digits array to state.pinCode
watch(digits, (newDigits) => {
  state.pinCode = newDigits.join('')
}, { deep: true })

onMounted(() => {
  // Auto focus first digit input
  setTimeout(() => {
    digitInputs.value[0]?.focus()
  }, 100)
})

function onInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^0-9]/g, '')

  if (value.length > 1) {
    // Handle multiple digits typed or pasted into single box
    const code = value.slice(0, 4).split('')
    for (let i = 0; i < 4; i++) {
      digits.value[i] = code[i] || ''
    }
    const nextFocus = Math.min(code.length, 3)
    digitInputs.value[nextFocus]?.focus()
    return
  }

  digits.value[index] = value

  // Auto-advance to next box if a digit was entered
  if (value && index < 3) {
    digitInputs.value[index + 1]?.focus()
  }
}

function onKeyDown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    if (!digits.value[index] && index > 0) {
      digitInputs.value[index - 1]?.focus()
      digits.value[index - 1] = ''
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    digitInputs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 3) {
    digitInputs.value[index + 1]?.focus()
  }
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text')?.replace(/[^0-9]/g, '') || ''
  if (!pastedData) return

  const code = pastedData.slice(0, 4).split('')
  for (let i = 0; i < 4; i++) {
    digits.value[i] = code[i] || ''
  }
  const nextFocusIndex = Math.min(code.length - 1, 3)
  digitInputs.value[Math.max(0, nextFocusIndex)]?.focus()
}

async function submitOtp(event: FormSubmitEvent<OtpSchema>) {
  isSubmitting.value = true
  try {
    await executeAction({
      uiOnly: async () => {
        toast.add({
          title: 'OTP verified',
          description: 'Your identity has been confirmed.',
          color: 'success',
        })
        const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/user/create-event'
        await navigateTo(target)
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
          description: res?.message ?? 'Verification successful.',
          color: 'success',
        })
        const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/user/create-event'
        await navigateTo(target)
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
  isSubmitting.value = true
  try {
    await executeAction({
      uiOnly: async () => {
        toast.add({ title: 'OTP resent', description: 'A new 4-digit code was sent to your email.', color: 'info' })
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
</script>

<template>
  <div class="flex items-center justify-center p-4 bpb-pattern h-screen">
    <UPageCard class="bread-container w-full max-w-md ring ring-transparent p-4 sm:p-6 bg-bread-200">
      <div class="space-y-6 text-center">

        <!-- Top Icon -->
        <div class="w-16 h-16 bg-toast-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
          <UIcon name="i-lucide-shield-check" class="w-9 h-9" />
        </div>

        <!-- Header -->
        <div class="space-y-1">
          <h1 class="text-2xl font-serif font-bold text-toast-700">Enter Verification Code</h1>
          <div class="text-sm text-toast-800">
            Enter the 4-digit code sent to
          </div>
          <div class="font-bold text-sm text-toast-900 -mt-1">{{ userEmail }}</div>
        </div>

        <!-- Form -->
        <UForm :schema="otpSchema" :state="state" class="space-y-6" @submit="submitOtp">
          <UFormField name="pinCode" class="space-y-2">

            <!-- 4 Large Number Input Boxes -->
            <div class="flex justify-center items-center gap-3 sm:gap-4 my-2" @paste="onPaste">
              <input v-for="(_, index) in 4" :key="index" :ref="(el) => { digitInputs[index] = el as HTMLInputElement }"
                v-model="digits[index]" type="text" inputmode="numeric" maxlength="1"
                class="w-14 h-16 sm:w-16 sm:h-20 text-center font-serif text-2xl sm:text-3xl font-bold text-toast-900 bg-white border-2 border-toast-300 rounded-xl shadow-sm focus:border-toast-600 focus:ring-4 focus:ring-toast-600/20 focus:outline-none transition-all"
                @input="onInput(index, $event)" @keydown="onKeyDown(index, $event)"
                @focus="($event.target as HTMLInputElement).select()" />
            </div>

          </UFormField>

          <!-- Buttons -->
          <div class="space-y-3 pt-2">
            <UButton type="submit" block color="primary" size="lg"
              class="font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md" :loading="isSubmitting">
              Verify OTP
            </UButton>

            <div class="flex justify-center items-center gap-1 text-xs text-toast-800">
              <span>Didn't receive code?</span>
              <button type="button" class="text-toast-600 hover:text-toast-800 font-bold underline cursor-pointer"
                :disabled="isSubmitting" @click="resendOtp">
                Resend OTP
              </button>
            </div>
          </div>

          <div class="flex justify-between items-center text-xs border-t border-toast-600/15 pt-4">
            <ULink to="/user/login" class="text-toast-600 hover:text-toast-800 font-medium">
              Back to Sign In
            </ULink>
            <ULink to="/user/forgot-password" class="text-toast-600 hover:text-toast-800 font-medium">
              Forgot Password?
            </ULink>
          </div>
        </UForm>
      </div>
    </UPageCard>
  </div>
</template>

<style scoped></style>
