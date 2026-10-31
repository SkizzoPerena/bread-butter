<script setup lang="ts">
import type { JamSeatMap } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

const props = defineProps<{ token: string }>()
const emit = defineEmits<{ changed: [] }>()

const { fetchSeatMap, claimSeat, giveUpSeat } = useSeating()

const seatMap = ref<JamSeatMap | null>(null)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')

onMounted(load)

async function load() {
  try {
    seatMap.value = await fetchSeatMap(props.token)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Seats are not available right now.')
  } finally {
    loading.value = false
  }
}

async function runSeatChange(change: () => Promise<JamSeatMap>) {
  saving.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    seatMap.value = await change()
    notice.value = seatMap.value.message || ''
    emit('changed')
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Could not save your seat.')
    // Someone else may have just taken it, so show the seats as they are now.
    await load()
  } finally {
    saving.value = false
  }
}

function sitHere(tableId: string, seatNumber: number) {
  return runSeatChange(() => claimSeat(props.token, tableId, seatNumber))
}

function giveUp() {
  return runSeatChange(() => giveUpSeat(props.token))
}

const SEAT_LABEL = { TAKEN: 'Taken', UNAVAILABLE: 'Unavailable', YOURS: 'Your seat' } as const
</script>

<template>
  <section
    class="w-full space-y-3 text-left"
    aria-label="Choose your seat"
  >
    <h2 class="text-xl font-serif font-bold">
      Choose your seat
    </h2>
    <p v-if="loading">
      Loading seats...
    </p>
    <p
      v-if="errorMessage"
      role="alert"
      class="rounded-md bg-red-100 p-2 text-sm text-red-900"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="notice"
      role="status"
      class="rounded-md bg-emerald-100 p-2 text-sm text-emerald-900"
    >
      {{ notice }}
    </p>
    <template v-if="seatMap">
      <p class="text-sm">
        <template v-if="seatMap.seat">
          You are at {{ seatMap.seat.tableLabel }}, seat {{ seatMap.seat.seatNumber }}.
        </template>
        <template v-else>
          You don't have a seat yet.
        </template>
        <template v-if="seatMap.locked">
          The host has locked seat selection.
        </template>
      </p>
      <p
        v-if="!seatMap.tables.length"
        class="text-sm"
      >
        Your host hasn't set up the tables yet. Check back here later.
      </p>
      <div
        v-for="table in seatMap.tables"
        :key="table._id"
        class="rounded-xl border border-toast-700/20 bg-white p-3 space-y-2"
      >
        <h3 class="font-semibold">
          {{ table.label }}
        </h3>
        <ul class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <li
            v-for="seat in table.seats"
            :key="seat.number"
            class="flex items-center justify-between gap-2 rounded-md bg-bread-100 px-2 py-1 text-sm"
            :class="{ 'ring-2 ring-toast-700': seat.status === 'YOURS' }"
          >
            <span>Seat {{ seat.number }}</span>
            <button
              v-if="seat.status === 'OPEN' && !seatMap.locked"
              type="button"
              class="rounded-md bg-toast-800 px-2 py-0.5 text-xs font-semibold text-bread-100 disabled:opacity-50"
              :disabled="saving"
              :aria-label="`Sit here: ${table.label}, seat ${seat.number}`"
              @click="sitHere(table._id, seat.number)"
            >
              Sit here
            </button>
            <span
              v-else
              class="text-xs"
            >
              {{ seat.status === 'OPEN' ? 'Open' : SEAT_LABEL[seat.status] }}
            </span>
          </li>
        </ul>
      </div>
      <button
        v-if="seatMap.seat && !seatMap.locked"
        type="button"
        class="rounded-md border border-toast-800 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="saving"
        @click="giveUp"
      >
        Give up my seat
      </button>
    </template>
  </section>
</template>
