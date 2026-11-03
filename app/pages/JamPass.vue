<script setup lang="ts">
import type { PublicSeatDetail } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { currentOriginPath } from '~/utils/seatingQr'
import SeatingQrImage from '~/components/SeatingQrImage.vue'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { fetchAttendance } = useSeating()

const token = computed(() => String(route.params.token || route.query.token || ''))
const checkIn = computed(() => String(route.query.checkin || '') === '1')
const pass = ref<PublicSeatDetail | null>(null)
const errorMessage = ref('')
const loading = ref(true)
const seatPicker = ref<{ reload: () => Promise<void> } | null>(null)

const isCompanionPass = computed(() => Boolean(pass.value?.isCompanion))

const qrValue = computed(() => currentOriginPath(`/attend/${token.value}?checkin=1`))

async function reloadPass() {
  pass.value = await fetchAttendance(token.value).catch(() => pass.value)
}

async function companionsChanged() {
  await Promise.all([reloadPass(), seatPicker.value?.reload()])
}

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
    <div class="w-full max-w-xl rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4 text-center">
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
        <div
          v-if="pass.companions?.length"
          class="space-y-2 text-left"
          data-testid="pass-companions"
        >
          <h2 class="text-xl font-serif font-bold">
            Your companions
          </h2>
          <p class="text-sm">
            Each companion has their own pass. Share their link with them, or show it at the door.
          </p>
          <div
            v-for="companion in pass.companions"
            :key="companion._id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-toast-700/20 bg-white p-3 text-sm"
          >
            <div>
              <p class="font-semibold">
                {{ companion.name }}
              </p>
              <p>
                {{ companion.seatNumber ? `${companion.tableLabel}, seat ${companion.seatNumber}` : 'Seat not assigned yet' }}
              </p>
            </div>
            <NuxtLink
              :to="companion.attendPath"
              class="rounded-md border border-toast-800 px-3 py-1"
            >
              Open pass
            </NuxtLink>
          </div>
        </div>
        <JamCompanionForm
          v-if="!checkIn && !isCompanionPass"
          :token="token"
          @changed="companionsChanged"
        />
        <JamSeatPicker
          v-if="!checkIn && !isCompanionPass"
          ref="seatPicker"
          :token="token"
          @changed="reloadPass"
        />
      </template>
    </div>
  </div>
</template>
