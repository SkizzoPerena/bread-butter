<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue'
import { toCanvas } from 'html-to-image'
import type { ColorPalette, TypographySet } from '~/utils/websiteTheme'
import {
  buildHiddenInvitationPreviewText,
  resolveAbsoluteWebsiteUrl,
  type InvitationEmailData
} from '~/utils/invitationEmailTemplate'

const props = defineProps<{
  invitation: InvitationEmailData
  palette: ColorPalette
  typography: TypographySet
  websiteUrl?: string
  senderEmail?: string
  recipientEmail?: string
  eventId?: string
}>()

const cardImageRef = ref<HTMLElement | null>(null)
const isCapturing = ref(false)
const capturedCardDataUrl = ref<string | null>(null)

// Resolve absolute URL for RSVP destination
const resolvedAbsoluteUrl = computed(() => {
  const raw = props.websiteUrl || props.invitation.websiteUrl || ''
  return resolveAbsoluteWebsiteUrl(raw)
})

const emailSubject = computed(() => {
  return `${props.invitation.eventLabel || 'Alex & Jordan are getting married!'} — Your Invitation & RSVP`
})

const fromAddress = computed(() => {
  return props.senderEmail || 'Alex & Jordan via Bread + Butter <invites@bread-plus-butter.com>'
})

const toAddress = computed(() => {
  return props.recipientEmail || 'guest@example.com'
})

// Rich hidden preview text shown in recipient's inbox before opening
const hiddenInboxSnippet = computed(() => {
  return buildHiddenInvitationPreviewText({
    ...props.invitation,
    guestName: props.invitation.guestName || 'Guest'
  })
})

async function captureCardImage(): Promise<string | null> {
  if (!cardImageRef.value) return null
  try {
    isCapturing.value = true
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready
    }

    const canvas = await toCanvas(cardImageRef.value as unknown as HTMLElement, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#f7f4ef',
    })
    const dataUrl = canvas.toDataURL('image/jpeg', 0.90)
    capturedCardDataUrl.value = dataUrl
    if (typeof window !== 'undefined' && dataUrl) {
      try {
        localStorage.setItem('bpb_invitation_card_latest', dataUrl)
        const evId = props.eventId || (props.invitation as { eventId?: string })?.eventId
        if (evId) {
          localStorage.setItem(`bpb_invitation_card_${evId}`, dataUrl)
        }
      } catch (err) {
        // quota exceeded or private mode, fallback gracefully
      }
    }
    return dataUrl
  } catch (err) {

    console.warn('Could not capture card as image:', err)
    return null
  } finally {
    isCapturing.value = false
  }
}

onMounted(() => {
  // Warm-up initial card snapshot after fonts render
  setTimeout(() => {
    captureCardImage()
  }, 350)
})

</script>

<template>
  <div class="space-y-4">
    <!-- Email Client Window Mockup -->
    <div class="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden transition-all duration-300">
      
      <!-- Window Chrome / Title Bar -->
      <div class="flex items-center justify-between px-4 py-3 bg-stone-100 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700/60 select-none">
        <!-- Window Traffic Lights -->
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-400/90 inline-block"></span>
          <span class="w-3 h-3 rounded-full bg-amber-400/90 inline-block"></span>
          <span class="w-3 h-3 rounded-full bg-emerald-400/90 inline-block"></span>
          <span class="ml-2 text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
            <UIcon name="i-lucide-mail" class="w-3.5 h-3.5 text-stone-500" />
            Email Client Preview
          </span>
        </div>
      </div>

      <!-- Email Header Fields (From / To / Subject / Inbox Snippet / RSVP Target) -->
      <div class="p-4 sm:px-6 bg-stone-50/70 dark:bg-stone-900/50 border-b border-stone-200/80 dark:border-stone-800 space-y-2 text-xs select-none">
        <div class="flex items-start gap-2">
          <span class="font-semibold text-stone-400 w-24 shrink-0">From:</span>
          <span class="font-medium text-stone-800 dark:text-stone-200 truncate">{{ fromAddress }}</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="font-semibold text-stone-400 w-24 shrink-0">To:</span>
          <span class="font-medium text-stone-800 dark:text-stone-200">{{ toAddress }}</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="font-semibold text-stone-400 w-24 shrink-0">Subject:</span>
          <span class="font-semibold text-stone-900 dark:text-stone-100">{{ emailSubject }}</span>
        </div>
        <!-- Inbox Snippet (Hidden preheader text) -->
        <div class="flex items-start gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800/60">
          <div class="flex items-center gap-1 font-semibold text-stone-400 w-24 shrink-0">
            <UIcon name="i-lucide-eye-off" class="w-3.5 h-3.5 text-violet-500" />
            <span>Inbox Snippet:</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-stone-700 dark:text-stone-200 italic text-[11px] leading-relaxed line-clamp-2">
              "{{ hiddenInboxSnippet }}"
            </p>
            <span class="text-[10px] text-stone-400 block mt-0.5">
              (Hidden from visual email body • Displayed in recipient's Gmail, Apple Mail, &amp; Outlook inbox preview list)
            </span>
          </div>
        </div>
        <div class="flex items-start gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800/60">
          <span class="font-semibold text-stone-400 w-24 shrink-0">RSVP Target:</span>
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span
              v-if="resolvedAbsoluteUrl && resolvedAbsoluteUrl !== '#'"
              class="font-mono text-[11px] text-stone-700 dark:text-stone-300 truncate"
            >
              {{ resolvedAbsoluteUrl }}
            </span>
            <span v-else class="text-stone-400 italic">No custom website attached yet</span>
          </div>
        </div>
      </div>

      <!-- Live Email Body Preview Container (Pure Stationery PNG Card) -->
      <div class="bg-[#f7f4ef] p-4 sm:p-8 flex flex-col justify-center items-center overflow-x-auto min-h-130">
        
        <!-- Rendered Email Card Container -->
        <div
          ref="cardImageRef"
          class="w-full max-w-145 rounded-2xl shadow-md text-center transition-all duration-300 overflow-hidden"
          :class="invitation.bannerImageUrl ? '' : 'p-3'"
          :style="{
            backgroundColor: palette.colors.primary,
            border: `2px solid ${palette.colors.secondary}`
          }"
        >
          <!-- Top Banner Image Component (Flush Top & Sides, 1:5 Horizontal Banner) -->
          <div
            v-if="invitation.bannerImageUrl"
            class="w-full overflow-hidden border-b"
            :style="{ borderColor: `${palette.colors.secondary}40` }"
          >
            <img
              :src="invitation.bannerImageUrl"
              alt="Invitation Header Banner"
              class="w-full aspect-5/1 object-cover object-center block"
            />
          </div>

          <!-- Card Content Body -->
          <div :class="invitation.bannerImageUrl ? 'p-3' : ''">
            <!-- Inner Double Border Frame -->
            <div
              class="rounded-xl p-6 sm:p-9 text-center space-y-6"
              :style="{
                border: `1px solid ${palette.colors.secondary}55`
              }"
            >
              <!-- Personal Greeting -->
            <div
              class="text-xs font-semibold uppercase tracking-[0.18em]"
              :style="{
                color: palette.colors.secondary_text_color,
                fontFamily: typography.subheaderFont
              }"
            >
              Dear Guest,
            </div>

            <!-- Introductory Request Line -->
            <div
              class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em]"
              :style="{
                color: palette.colors.secondary_text_color,
                fontFamily: typography.subheaderFont
              }"
            >
              {{ invitation.requestLine || 'Together with their families' }}
            </div>

            <!-- Event Headline -->
            <h1
              class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight"
              :style="{
                color: palette.colors.text_color,
                fontFamily: typography.headerFont
              }"
            >
              {{ invitation.eventLabel || 'Alex & Jordan are getting married!' }}
            </h1>

            <!-- Date, Time and Venue Details -->
            <div class="space-y-1">
              <div
                class="text-base sm:text-lg font-semibold uppercase tracking-wider"
                :style="{
                  color: palette.colors.text_color,
                  fontFamily: typography.subheaderFont
                }"
              >
                {{ invitation.eventDate || 'Saturday, October 24, 2026' }}
              </div>
              <div
                v-if="invitation.eventTime"
                class="text-xs sm:text-sm"
                :style="{
                  color: palette.colors.secondary_text_color,
                  fontFamily: typography.bodyFont
                }"
              >
                {{ invitation.eventTime }}
              </div>
              <div
                v-if="invitation.eventVenue"
                class="text-sm sm:text-base font-medium pt-1"
                :style="{
                  color: palette.colors.text_color,
                  fontFamily: typography.subheaderFont
                }"
              >
                📍 {{ invitation.eventVenue }}
              </div>
            </div>

            <!-- Decorative Divider -->
            <div class="flex items-center justify-center my-1">
              <div class="w-12 h-[1.5px]" :style="{ backgroundColor: `${palette.colors.secondary}90` }"></div>
              <span class="mx-3 text-xs" :style="{ color: palette.colors.secondary }">✦</span>
              <div class="w-12 h-[1.5px]" :style="{ backgroundColor: `${palette.colors.secondary}90` }"></div>
            </div>

            <!-- RSVP Here Button (Stationery visual element) -->
            <div class="pt-1 pb-2 flex flex-col items-center justify-center">
              <div
                class="inline-flex items-center justify-center gap-2 px-9 py-3.5 rounded-full font-semibold text-sm sm:text-base shadow-md cursor-default select-none"
                :style="{
                  backgroundColor: palette.colors.secondary,
                  color: palette.colors.secondary_text_color,
                  fontFamily: typography.subheaderFont
                }"
              >
                <span>RSVP Here</span>
                <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
              </div>
            </div>

            <!-- Deadline & Notice -->
            <div
              v-if="invitation.deadlineText || invitation.deadlineDate"
              class="pt-4 border-t space-y-3"
              :style="{ borderColor: `${palette.colors.secondary}35` }"
            >
              <div
                v-if="invitation.deadlineText"
                class="text-xs sm:text-sm max-w-md mx-auto"
                :style="{
                  color: palette.colors.secondary_text_color,
                  fontFamily: typography.bodyFont
                }"
              >
                {{ invitation.deadlineText }}
              </div>
              <div
                v-if="invitation.deadlineDate"
                class="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full font-medium text-xs border"
                :style="{
                  backgroundColor: `${palette.colors.secondary}18`,
                  borderColor: `${palette.colors.secondary}50`,
                  color: palette.colors.secondary_text_color,
                  fontFamily: typography.subheaderFont
                }"
              >
                <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                <span>RSVP Deadline: {{ invitation.deadlineDate }}</span>
              </div>
            </div>

            </div>
          </div>
        </div>

        <!-- Explanatory note below card -->
        <div class="mt-4 text-center text-xs text-stone-500 flex items-center justify-center gap-1.5 select-none">
          <UIcon name="i-lucide-mouse-pointer-click" class="w-4 h-4 text-violet-500" />
          <span>Guests receive your banner and invitation details by email, and the RSVP button opens their RSVP page.</span>
        </div>
      </div>

      <!-- Resend Compatibility Note Banner -->
      <div class="px-5 py-3 bg-stone-100 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-emerald-500 shrink-0" />
          <span><strong>Resend Ready:</strong> Pure PNG invitation with exact custom fonts &amp; hidden inbox preview text.</span>
        </div>
      </div>

    </div>

  </div>
</template>
