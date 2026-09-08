<script setup lang="ts">
defineProps<{
  logoText: string
}>()
</script>

<template>
  <div
    class="relative bg-white p-2.5 sm:p-3 rounded-xl border-2 border-toast-600/20 shadow-sm flex flex-col items-center"
  >
    <svg viewBox="0 0 160 160" class="w-36 h-36 sm:w-40 sm:h-40 text-toast-900" fill="currentColor">
      <rect x="10" y="10" width="42" height="42" rx="4" fill="currentColor" />
      <rect x="16" y="16" width="30" height="30" rx="2" fill="white" />
      <rect x="22" y="22" width="18" height="18" rx="1" fill="currentColor" />

      <rect x="108" y="10" width="42" height="42" rx="4" fill="currentColor" />
      <rect x="114" y="16" width="30" height="30" rx="2" fill="white" />
      <rect x="120" y="22" width="18" height="18" rx="1" fill="currentColor" />

      <rect x="10" y="108" width="42" height="42" rx="4" fill="currentColor" />
      <rect x="16" y="114" width="30" height="30" rx="2" fill="white" />
      <rect x="22" y="120" width="18" height="18" rx="1" fill="currentColor" />

      <rect x="60" y="14" width="6" height="6" fill="currentColor" />
      <rect x="74" y="14" width="6" height="6" fill="currentColor" />
      <rect x="88" y="14" width="6" height="6" fill="currentColor" />
      <rect x="60" y="28" width="6" height="6" fill="currentColor" />
      <rect x="88" y="28" width="6" height="6" fill="currentColor" />
      <rect x="60" y="42" width="6" height="6" fill="currentColor" />
      <rect x="74" y="42" width="6" height="6" fill="currentColor" />
      <rect x="88" y="42" width="6" height="6" fill="currentColor" />

      <rect x="14" y="60" width="6" height="6" fill="currentColor" />
      <rect x="28" y="60" width="6" height="6" fill="currentColor" />
      <rect x="42" y="60" width="6" height="6" fill="currentColor" />
      <rect x="14" y="74" width="6" height="6" fill="currentColor" />
      <rect x="42" y="74" width="6" height="6" fill="currentColor" />
      <rect x="14" y="88" width="6" height="6" fill="currentColor" />
      <rect x="28" y="88" width="6" height="6" fill="currentColor" />
      <rect x="42" y="88" width="6" height="6" fill="currentColor" />

      <rect x="60" y="60" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="76" y="60" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="92" y="60" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="108" y="60" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="124" y="60" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="140" y="60" width="8" height="8" rx="1" fill="currentColor" />

      <rect x="60" y="76" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="92" y="76" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="124" y="76" width="8" height="8" rx="1" fill="currentColor" />

      <rect x="60" y="92" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="76" y="92" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="108" y="92" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="140" y="92" width="8" height="8" rx="1" fill="currentColor" />

      <rect x="108" y="76" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="140" y="76" width="8" height="8" rx="1" fill="currentColor" />

      <rect x="60" y="108" width="6" height="6" fill="currentColor" />
      <rect x="74" y="108" width="6" height="6" fill="currentColor" />
      <rect x="88" y="108" width="6" height="6" fill="currentColor" />
      <rect x="108" y="108" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="124" y="108" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="140" y="108" width="8" height="8" rx="1" fill="currentColor" />

      <rect x="60" y="122" width="6" height="6" fill="currentColor" />
      <rect x="88" y="122" width="6" height="6" fill="currentColor" />
      <rect x="108" y="124" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="140" y="124" width="8" height="8" rx="1" fill="currentColor" />

      <rect x="60" y="136" width="6" height="6" fill="currentColor" />
      <rect x="74" y="136" width="6" height="6" fill="currentColor" />
      <rect x="88" y="136" width="6" height="6" fill="currentColor" />
      <rect x="108" y="140" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="124" y="140" width="8" height="8" rx="1" fill="currentColor" />

      <circle cx="80" cy="80" r="18" fill="white" stroke="currentColor" stroke-width="2" />
      <text
        x="80"
        y="83"
        font-size="7.5"
        font-family="sans-serif"
        font-weight="bold"
        fill="currentColor"
        text-anchor="middle"
      >
        {{ logoText }}
      </text>
    </svg>
  </div>
</template>
