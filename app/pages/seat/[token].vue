<script setup lang="ts">
import type { PublicSeatDetail, PublicSeatList } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({ layout: false, middleware: 'seating-enabled' })

const route = useRoute()
const { fetchPublicSeatList, fetchPublicGuestSeat } = useSeating()

const token = computed(() => String(route.params.token || ''))
const listing = ref<PublicSeatList | null>(null)
const seat = ref<PublicSeatDetail | null>(null)
const selectedId = ref('')
const errorMessage = ref('')
const loading = ref(true)

useHead({ title: 'Find your seat' })

onMounted(async () => {
  try {
    listing.value = await fetchPublicSeatList(token.value)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'This seating plan is not available.')
  } finally {
    loading.value = false
  }
})

async function showSeat() {
  if (!selectedId.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    seat.value = await fetchPublicGuestSeat(token.value, selectedId.value)
  } catch (error) {
    seat.value = null
    errorMessage.value = getApiErrorMessage(error, 'That name is not on the attending list.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-toast-800 text-bread-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4">
      <p class="text-sm uppercase tracking-wide">
        Find your seat
      </p>
      <h1 class="text-3xl font-serif font-bold">
        {{ listing?.gatheringName || 'Seating' }}
      </h1>
      <p
        v-if="listing"
        class="text-sm"
      >
        {{ listing.venue }}
      </p>
      <p
        v-if="loading"
        class="text-sm"
      >
        Loading...
      </p>
      <p
        v-else-if="errorMessage"
        class="text-sm"
      >
        {{ errorMessage }}
      </p>
      <form
        v-if="listing"
        class="space-y-3"
        @submit.prevent="showSeat"
      >
        <label class="block text-sm font-semibold">
          Your name
          <select
            v-model="selectedId"
            class="mt-1 w-full rounded-md border border-toast-700/30 bg-white px-3 py-2"
            required
          >
            <option
              value=""
              disabled
            >
              Select your name
            </option>
            <option
              v-for="guest in listing.guests"
              :key="guest.id"
              :value="guest.id"
            >
              {{ guest.name }}{{ guest.hint ? ` (${guest.hint})` : '' }}
            </option>
          </select>
        </label>
        <button
          type="submit"
          class="w-full rounded-md bg-toast-800 text-bread-100 py-2 font-semibold"
        >
          Show my seat
        </button>
      </form>
      <div
        v-if="seat"
        class="rounded-xl bg-white p-4 space-y-1"
      >
        <p class="font-semibold">
          {{ seat.name }}
        </p>
        <p v-if="seat.seated">
          {{ seat.tableLabel }}, seat {{ seat.seatNumber }}
        </p>
        <p v-else>
          Your seat is not assigned yet.
        </p>
      </div>
    </div>
  </div>
</template>
