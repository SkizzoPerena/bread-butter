<script setup lang="ts">
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{
  value: string
  size?: number
  alt?: string
}>(), {
  size: 220,
  alt: 'QR code',
})

const src = ref('')

watchEffect(async () => {
  if (!props.value) {
    src.value = ''
    return
  }
  src.value = await QRCode.toDataURL(props.value, {
    width: props.size,
    margin: 1,
  })
})
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :width="size"
    :height="size"
    :alt="alt"
    class="rounded-md bg-white p-2"
  >
</template>
