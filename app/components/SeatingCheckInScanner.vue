<script setup lang="ts">
import { attendanceTokenFromScan } from '~/utils/seatingQr'

const emit = defineEmits<{
  scan: [value: string]
}>()

const errorMessage = ref('')
const uploadError = ref('')
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
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
    errorMessage.value = 'Camera scanning is unavailable on this device. Upload a QR image or check guests in from the list.'
  }
})

onBeforeUnmount(async () => {
  try {
    await scanner?.stop()
  } catch {
    // The camera is already stopped.
  }
})

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    // A file scan cannot share an instance with a running camera scan.
    const decoded = await new Html5Qrcode('seating-checkin-file-scanner').scanFile(file, false)
    if (attendanceTokenFromScan(decoded)) {
      emit('scan', decoded)
    } else {
      uploadError.value = 'This QR code is not a guest pass.'
    }
  } catch {
    uploadError.value = 'No QR code was found in that image. Try a clearer one.'
  } finally {
    uploading.value = false
    input.value = ''
  }
}
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
    <div
      id="seating-checkin-file-scanner"
      class="hidden"
    />
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    >
    <UButton
      type="button"
      variant="outline"
      icon="i-lucide-upload"
      :loading="uploading"
      @click="fileInput?.click()"
    >
      Upload QR image
    </UButton>
    <p
      v-if="uploadError"
      class="text-sm text-error"
    >
      {{ uploadError }}
    </p>
  </div>
</template>
