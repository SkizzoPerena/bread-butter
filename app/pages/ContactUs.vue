<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

const route = useRoute()
const toast = useToast()
const { apiRequest } = useApiMode()
const { user } = useAuth('user')

const phoneNumber = '+639175869442'
const isCopied = ref(false)
const isSubmitting = ref(false)

const supplierName = computed(() => {
  const s = route.query.supplier
  if (typeof s === 'string' && s.trim()) return s.trim()
  return ''
})

const pageTitle = computed(() => {
  if (supplierName.value) {
    return `Inquiry re: ${supplierName.value}`
  }
  const customSubject = route.query.subject
  if (typeof customSubject === 'string' && customSubject.trim()) {
    return customSubject.trim()
  }
  return 'Contact Us'
})

useHead({
  title: computed(() => `${pageTitle.value} - Bread + Butter`)
})

const pageSubtitle = computed(() => {
  if (supplierName.value) {
    return `Have questions about ${supplierName.value}? Send us a message and our team will get in touch with you shortly.`
  }
  return "We'd love to hear from you!"
})

const backToSupplierUrl = computed(() => {
  if (route.query.eventId) {
    return `/event/bakers?eventId=${encodeURIComponent(String(route.query.eventId))}`
  }
  return '/event/bakers'
})

const state = ref({
  name: '',
  email: '',
  subject: '',
  message: '',
})

onMounted(() => {
  // Pre-fill user information if signed in
  if (user.value) {
    const fullName = `${user.value.firstName || ''} ${user.value.lastName || ''}`.trim()
    if (fullName) state.value.name = fullName
    if (user.value.email) state.value.email = user.value.email
  }

  // Pre-fill subject based on supplier or query
  if (supplierName.value) {
    state.value.subject = `Inquiry re: ${supplierName.value}`
  } else if (typeof route.query.subject === 'string' && route.query.subject.trim()) {
    state.value.subject = route.query.subject.trim()
  }
})

const messagePlaceholder = computed(() => {
  if (supplierName.value) {
    return `Hi Bread + Butter team, I'd like to check details, packages, or availability for ${supplierName.value}...`
  }
  return 'Type your message here...'
})

async function copyPhoneNumber() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(phoneNumber)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = phoneNumber
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)

    toast.add({
      title: 'Phone number copied!',
      description: 'Our mobile hotline has been copied to your clipboard.',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch {
    toast.add({
      title: 'Failed to copy',
      description: 'Please copy manually: +63 917 586 9442',
      color: 'error'
    })
  }
}

function triggerMailtoFallback(payload: { name: string; email: string; subject: string; message: string; supplier?: string }) {
  const encSubject = encodeURIComponent(payload.subject || 'Inquiry')
  const bodyText = `Name: ${payload.name}\nEmail: ${payload.email}\n${payload.supplier ? `Supplier: ${payload.supplier}\n` : ''}\nMessage:\n${payload.message}`
  const encBody = encodeURIComponent(bodyText)

  if (import.meta.client) {
    window.location.href = `mailto:hello@bread-plus-butter.com?subject=${encSubject}&body=${encBody}`
  }

  toast.add({
    title: 'Opening Email Client',
    description: 'We have pre-filled your email to hello@bread-plus-butter.com. Please review and send!',
    color: 'info',
    icon: 'i-lucide-mail'
  })
}

async function handleSubmit() {
  if (!state.value.name?.trim()) {
    toast.add({
      title: 'Name required',
      description: 'Please enter your name.',
      color: 'warning'
    })
    return
  }

  if (!state.value.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.value.email.trim())) {
    toast.add({
      title: 'Valid email required',
      description: 'Please enter a valid email address so we can reply to you.',
      color: 'warning'
    })
    return
  }

  if (!state.value.message?.trim()) {
    toast.add({
      title: 'Message required',
      description: 'Please enter your message or inquiry.',
      color: 'warning'
    })
    return
  }

  isSubmitting.value = true

  const payload = {
    name: state.value.name.trim(),
    email: state.value.email.trim(),
    subject: state.value.subject?.trim() || pageTitle.value,
    message: state.value.message.trim(),
    supplier: supplierName.value || undefined,
    eventId: typeof route.query.eventId === 'string' ? route.query.eventId : undefined
  }

  try {
    // Sent by the backend. In UI-only mode, or when email isn't set up, this throws
    // and the catch below opens the visitor's email app instead.
    const res = await apiRequest<{ success: boolean; fallbackMailto?: boolean; message?: string }>('/public/contact', {
      method: 'POST',
      authenticated: false,
      body: payload
    })

    if (res?.success) {
      toast.add({
        title: 'Message Sent!',
        description: `Thank you! Your email has been sent to hello@bread-plus-butter.com. We will reply to ${state.value.email} shortly.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      state.value.message = ''
    } else {
      triggerMailtoFallback(payload)
    }
  } catch (err: any) {
    console.error('Contact submission error:', err)
    triggerMailtoFallback(payload)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center py-8 px-4 sm:px-6 bg-toast-700 text-white">
    <UCard class="w-full max-w-lg mx-auto p-4 sm:p-6 space-y-6 bg-bread-400 text-toast-900 shadow-xl rounded-2xl border-0">
      <!-- Back Link when navigating from a supplier context -->
      <div v-if="supplierName" class="flex items-center justify-between border-b border-bread-200/80 pb-3">
        <NuxtLink
          :to="backToSupplierUrl"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-toast-700 hover:text-toast-950 transition-colors cursor-pointer"
        >
          <UIcon name="i-lucide-arrow-left" class="size-3.5" />
          <span>Back to Baker Database</span>
        </NuxtLink>

        <UBadge color="bread" variant="solid" size="xs" class="font-bold text-[11px] px-2.5 py-0.5 rounded-full text-toast-800 bg-bread-200/90">
          Supplier Inquiry
        </UBadge>
      </div>

      <div class="space-y-2 text-center">
        <h1 class="text-2xl sm:text-3xl font-bold font-serif text-toast-900 wrap-break-word">
          {{ pageTitle }}
        </h1>
        <p class="text-xs sm:text-sm text-toast-700 max-w-sm mx-auto leading-relaxed">
          {{ pageSubtitle }}
        </p>
      </div>

      <div class="space-y-4">
        <!-- Social Media & Contact Links -->
        <div class="flex justify-center items-center gap-2 sm:gap-3">
          <UButton
            :icon="isCopied ? 'i-lucide-check' : 'i-lucide-phone-call'"
            variant="ghost"
            color="neutral"
            size="lg"
            class="text-toast-800 hover:text-toast-950 hover:bg-bread-300/50 cursor-pointer"
            :aria-label="isCopied ? 'Phone number copied' : 'Copy phone number'"
            :title="isCopied ? 'Copied!' : 'Click to copy phone number'"
            @click="copyPhoneNumber"
          />
          <UButton
            icon="i-simple-icons-facebook"
            to="https://www.facebook.com/profile.php?id=61593088533548"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="lg"
            class="text-toast-800 hover:text-toast-950 hover:bg-bread-300/50"
            aria-label="Facebook"
            title="Visit our Facebook page"
          />
          <UButton
            icon="i-simple-icons-instagram"
            to="https://www.instagram.com/breadplusbutterph/"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="lg"
            class="text-toast-800 hover:text-toast-950 hover:bg-bread-300/50"
            aria-label="Instagram"
            title="Visit our Instagram profile"
          />
          <UButton
            icon="i-lucide-mail"
            :to="`mailto:hello@bread-plus-butter.com?subject=${encodeURIComponent(state.subject || pageTitle)}`"
            variant="ghost"
            color="neutral"
            size="lg"
            class="text-toast-800 hover:text-toast-950 hover:bg-bread-300/50"
            aria-label="Email"
            title="Send email directly via your mail client"
          />
        </div>

        <UDivider label="OR SEND A MESSAGE" class="text-toast-600/60 text-xs font-semibold" />

        <!-- Contact Form -->
        <UForm :state="state" class="space-y-3.5" @submit="handleSubmit">
          <UFormField label="Your Name" name="name" required>
            <UInput
              v-model="state.name"
              placeholder="John Doe"
              class="w-full bg-white/80 rounded-lg text-toast-900"
            />
          </UFormField>

          <UFormField label="Your Email" name="email" required>
            <UInput
              v-model="state.email"
              type="email"
              placeholder="you@example.com"
              class="w-full bg-white/80 rounded-lg text-toast-900"
            />
          </UFormField>

          <UFormField label="Subject" name="subject">
            <UInput
              v-model="state.subject"
              :placeholder="pageTitle"
              class="w-full bg-white/80 rounded-lg text-toast-900"
            />
          </UFormField>

          <UFormField label="Message" name="message" required>
            <UTextarea
              v-model="state.message"
              :rows="4"
              :placeholder="messagePlaceholder"
              class="w-full bg-white/80 rounded-lg text-toast-900"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            color="neutral"
            variant="solid"
            size="md"
            class="font-bold py-2.5 bg-toast-800 hover:bg-toast-900 text-white rounded-lg cursor-pointer shadow-sm mt-2"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            icon="i-lucide-send"
          >
            {{ isSubmitting ? 'Sending Email...' : 'Send Message' }}
          </UButton>
        </UForm>
      </div>
    </UCard>
  </div>
</template>
