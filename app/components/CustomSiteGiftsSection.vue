<script lang="ts" setup>
import type { CustomSiteGiftRegistry } from '~/types/customSite'

const props = defineProps<{
  registry?: CustomSiteGiftRegistry | null
  colors: { bg: string; text: string; heading: string }
  headingFont: string
  minHeight?: string
}>()

const qrCodes = computed(() => props.registry?.qrCodes ?? [])
const giftItems = computed(() => props.registry?.wishedItems ?? [])
</script>

<template>
  <div
    id="section-gifts"
    class="flex flex-col justify-center gap-10 px-6 sm:px-10 lg:px-16 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-500"
    :style="{ minHeight, backgroundColor: colors.bg }"
  >
    <!-- Section Header -->
    <div class="space-y-3 max-w-2xl mx-auto">
      <div
        class="font-bold text-5xl pt-2 sm:pt-4"
        :style="{ color: colors.heading, fontFamily: `'${headingFont}'` }"
      >
        Gifts &amp; Registry
      </div>
      <div class="flex items-center justify-center gap-3 py-1.5" aria-hidden="true">
        <div class="w-12 sm:w-20 h-px opacity-40" :style="{ backgroundColor: colors.heading }" />
        <div class="size-1.5 rotate-45 opacity-70" :style="{ backgroundColor: colors.heading }" />
        <div class="w-12 sm:w-20 h-px opacity-40" :style="{ backgroundColor: colors.heading }" />
      </div>
      <p
        class="text-sm sm:text-base opacity-80 leading-relaxed"
        :style="{ color: colors.text }"
      >
        Your presence at our celebration is the greatest gift of all. If you wish to honor us with a gift, our registry options are shared below.
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-if="qrCodes.length === 0 && giftItems.length === 0"
      class="max-w-md mx-auto py-10 px-6 rounded-2xl border backdrop-blur-md shadow-xs"
      :style="{
        backgroundColor: colors.text + '0D',
        borderColor: colors.text + '25',
        color: colors.text,
      }"
    >
      <UIcon
        name="i-lucide-gift"
        class="size-8 mx-auto mb-2 opacity-60"
        :style="{ color: colors.heading }"
      />
      <p class="text-sm font-medium">Gift details will be shared soon.</p>
    </div>

    <!-- Monetary Gifts / QR Codes -->
    <div v-if="qrCodes.length > 0" class="max-w-5xl mx-auto w-full space-y-4">
      <div
        class="flex items-center justify-between text-xs uppercase tracking-wider font-semibold opacity-80"
        :style="{ color: colors.heading }"
      >
        <span class="inline-flex items-center gap-1.5">
          <UIcon name="i-lucide-qr-code" class="size-4" />
          Monetary Gifts &amp; E-Wallets
        </span>
        <span>{{ qrCodes.length }} QR code{{ qrCodes.length > 1 ? 's' : '' }}</span>
      </div>

      <div class="flex flex-wrap justify-center gap-6">
        <div
          v-for="(entry, index) in qrCodes"
          :key="entry.qrCodeUrl || index"
          class="flex w-64 sm:w-72 flex-col items-center gap-3 p-5 rounded-2xl border backdrop-blur-md shadow-xs transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          :style="{
            backgroundColor: colors.text + '0D',
            borderColor: colors.text + '25',
            color: colors.text,
          }"
        >
          <!-- Scannable High-Contrast Image Container -->
          <div class="w-full aspect-square bg-white rounded-xl border border-black/10 p-3 shadow-2xs flex items-center justify-center overflow-hidden">
            <img
              v-if="entry.qrCodeUrl"
              :src="entry.qrCodeUrl"
              :alt="`${entry.bankType || 'Payment'} QR code`"
              class="max-h-full max-w-full object-contain rounded"
            >
            <UIcon v-else name="i-lucide-qr-code" class="size-16 text-black/40" />
          </div>

          <!-- Bank Details -->
          <div class="space-y-1 w-full text-center">
            <div
              class="font-bold text-base tracking-wide"
              :style="{ color: colors.heading }"
            >
              {{ entry.bankType || 'E-Wallet / Bank' }}
            </div>
            <div v-if="entry.accountName" class="text-xs font-medium opacity-85 truncate">
              {{ entry.accountName }}
            </div>
            <div class="font-mono text-xs font-semibold px-2.5 py-1 rounded-md border border-current/20 bg-current/5 tracking-wider inline-block">
              {{ entry.accountNumber }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Physical Wishlist Items -->
    <div v-if="giftItems.length > 0" class="max-w-5xl mx-auto w-full space-y-4 pt-4">
      <div
        class="flex items-center justify-between text-xs uppercase tracking-wider font-semibold opacity-80"
        :style="{ color: colors.heading }"
      >
        <span class="inline-flex items-center gap-1.5">
          <UIcon name="i-lucide-package" class="size-4" />
          Physical Wishlist Items
        </span>
        <span>{{ giftItems.length }} item{{ giftItems.length > 1 ? 's' : '' }}</span>
      </div>

      <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
        <li
          v-for="(item, index) in giftItems"
          :key="`${item.name}-${index}`"
          class="flex items-center justify-between gap-4 p-4 sm:p-4.5 rounded-xl border backdrop-blur-md shadow-xs transition-all duration-200"
          :class="{ 'opacity-60': item.isFulfilled }"
          :style="{
            backgroundColor: colors.text + '0D',
            borderColor: colors.text + '25',
            color: colors.text,
          }"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-8 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
              <UIcon
                :name="item.isFulfilled ? 'i-lucide-check-circle-2' : 'i-lucide-gift'"
                class="size-4"
                :style="{ color: colors.heading }"
              />
            </div>
            <div class="min-w-0">
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-sm sm:text-base hover:underline inline-flex items-center gap-1.5 break-words"
                :class="{ 'line-through': item.isFulfilled }"
                :style="{ color: colors.heading }"
              >
                <span>{{ item.name }}</span>
                <UIcon name="i-lucide-external-link" class="size-3.5 shrink-0 opacity-70" />
              </a>
              <span
                v-else
                class="font-medium text-sm sm:text-base break-words"
                :class="{ 'line-through': item.isFulfilled }"
                :style="{ color: colors.heading }"
              >
                {{ item.name }}
              </span>
            </div>
          </div>

          <div class="shrink-0">
            <span
              v-if="item.isFulfilled"
              class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-current/30 opacity-75"
            >
              Taken
            </span>
            <span
              v-else
              class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-current/20 bg-current/5"
            >
              Available
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
