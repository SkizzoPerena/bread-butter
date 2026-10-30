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
    class="flex flex-col justify-center gap-10 px-6 pt-28 sm:pt-36 pb-20 text-center scroll-mt-0 transition-colors duration-300"
    :style="{ minHeight, backgroundColor: colors.bg }"
  >
    <div class="font-bold text-5xl pt-2 sm:pt-4" :style="{ color: colors.heading, fontFamily: `'${headingFont}'` }">
      Gifts
    </div>

    <p v-if="qrCodes.length === 0 && giftItems.length === 0" class="text-sm opacity-80" :style="{ color: colors.text }">
      Gift details will be shared soon.
    </p>

    <div v-if="qrCodes.length > 0" class="flex flex-wrap justify-center gap-6">
      <div
        v-for="(entry, index) in qrCodes"
        :key="entry.qrCodeUrl || index"
        class="flex w-64 flex-col items-center gap-2"
        :style="{ color: colors.text }"
      >
        <img
          v-if="entry.qrCodeUrl"
          :src="entry.qrCodeUrl"
          :alt="`${entry.bankType || 'Payment'} QR code`"
          class="w-full rounded-lg bg-white object-contain p-2"
        >
        <div class="font-semibold">{{ entry.bankType }}</div>
        <div v-if="entry.accountName" class="text-sm">{{ entry.accountName }}</div>
        <div v-if="entry.accountNumber" class="text-sm opacity-80">{{ entry.accountNumber }}</div>
      </div>
    </div>

    <ul v-if="giftItems.length > 0" class="mx-auto flex w-full max-w-md flex-col gap-3 text-left">
      <li
        v-for="(item, index) in giftItems"
        :key="`${item.name}-${index}`"
        class="flex items-center gap-3"
        :class="{ 'opacity-50': item.isFulfilled }"
        :style="{ color: colors.text }"
      >
        <img v-if="item.imageURL" :src="item.imageURL" :alt="item.name" class="size-12 rounded object-cover">
        <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" class="underline">{{ item.name }}</a>
        <span v-else>{{ item.name }}</span>
        <span v-if="item.isFulfilled" class="ml-auto text-xs uppercase tracking-widest">Taken</span>
      </li>
    </ul>
  </div>
</template>
