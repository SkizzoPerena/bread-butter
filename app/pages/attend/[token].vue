<script setup lang="ts">
import type { PublicSeatDetail } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { currentOriginPath } from '~/utils/seatingQr'
import SeatingQrImage from '~/components/SeatingQrImage.vue'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { fetchAttendance } = useSeating()

const token = computed(() => String(route.params.token || ''))
const checkIn = computed(() => String(route.query.checkin || '') === '1')
const pass = ref<PublicSeatDetail | null>(null)
const errorMessage = ref('')
const loading = ref(true)

const qrValue = computed(() => currentOriginPath(`/attend/${token.value}?checkin=1`))

useHead({ title: 'Your seat pass' })

onMounted(async () => {
  try {
    pass.value = await fetchAttendance(token.value, checkIn.value)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'This pass is not available.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-toast-800 text-bread-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4 text-center">
      <p class="text-sm uppercase tracking-wide">
        Seat pass
      </p>
      <h1 class="text-3xl font-serif font-bold">
        {{ pass?.gatheringName || 'Attendance' }}
      </h1>
      <p v-if="loading">
        Loading...
      </p>
      <p v-else-if="errorMessage">
        {{ errorMessage }}
      </p>
      <template v-else-if="pass">
        <p class="text-xl font-semibold">
          {{ pass.name }}
        </p>
        <p v-if="pass.seated">
          {{ pass.tableLabel }}, seat {{ pass.seatNumber }}
        </p>
        <p v-else>
          Your seat is not assigned yet.
        </p>
        <p class="text-sm">
          {{ pass.checkedInAt ? `Checked in ${new Date(pass.checkedInAt).toLocaleString()}` : 'Not checked in yet' }}
        </p>
        <div class="flex justify-center">
          <SeatingQrImage
            :value="qrValue"
            alt="Attendance QR code"
          />
        </div>
        <p class="text-xs">
          Show this QR at the door.
        </p>
      </template>
    </div>
  </div>
</template>
