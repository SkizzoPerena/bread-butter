<script setup lang="ts">
const emit = defineEmits<{
  scan: [value: string]
}>()

const errorMessage = ref('')
let scanner: { stop: () => Promise<void> } | null = null

onMounted(async () => {
  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    const instance = new Html5Qrcode('seating-checkin-scanner')
    scanner = instance
    await instance.start(
      { facingMode: 'environment' },
      { fps: 8, qrbox: 220 },
      (decoded: string) => emit('scan', decoded),
      () => undefined,
    )
  } catch {
    errorMessage.value = 'Camera scanning is unavailable on this device. Check guests in from the list.'
  }
})

onBeforeUnmount(async () => {
  try {
    await scanner?.stop()
  } catch {
    // The camera is already stopped.
  }
})
</script>

<template>
  <div class="space-y-2">
    <div
      id="seating-checkin-scanner"
      class="overflow-hidden rounded-lg bg-black/80"
    />
    <p
      v-if="errorMessage"
      class="text-sm text-muted"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
