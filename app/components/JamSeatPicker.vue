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
/** Who the next seat is for: empty for the guest, or one of their companions. */
const choosingFor = ref('')

const companions = computed(() => seatMap.value?.companions ?? [])
const chosenCompanion = computed(() => companions.value.find((item) => item._id === choosingFor.value))
const currentSeat = computed(() => (chosenCompanion.value ? chosenCompanion.value.seat : seatMap.value?.seat ?? null))

onMounted(load)

defineExpose({ reload: load })

async function load() {
  try {
    seatMap.value = await fetchSeatMap(props.token)
    if (choosingFor.value && !chosenCompanion.value) choosingFor.value = ''
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
  return runSeatChange(() => claimSeat(props.token, tableId, seatNumber, choosingFor.value || undefined))
}

function giveUp() {
  return runSeatChange(() => giveUpSeat(props.token, choosingFor.value || undefined))
}

function seatLabel(seat: JamSeatMap['tables'][number]['seats'][number]) {
  if (seat.status === 'OPEN') return 'Open'
  if (seat.status === 'COMPANION') return companions.value.find((item) => item._id === seat.companionId)?.name || 'Your companion'
  return SEAT_LABEL[seat.status]
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
      <label
        v-if="companions.length && !seatMap.locked"
        class="block text-sm font-semibold"
      >
        Who is this seat for?
        <select
          v-model="choosingFor"
          class="mt-1 w-full rounded-md border border-jam-700/30 bg-white px-3 py-2 font-normal"
        >
          <option value="">Me</option>
          <option
            v-for="companion in companions"
            :key="companion._id"
            :value="companion._id"
          >
            {{ companion.name }}
          </option>
        </select>
      </label>
      <p class="text-sm">
        <template v-if="chosenCompanion">
          <template v-if="chosenCompanion.seat">
            {{ chosenCompanion.name }} is at {{ chosenCompanion.seat.tableLabel }}, seat {{ chosenCompanion.seat.seatNumber }}.
          </template>
          <template v-else>
            {{ chosenCompanion.name }} doesn't have a seat yet.
          </template>
        </template>
        <template v-else-if="seatMap.seat">
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
        class="rounded-xl border border-jam-700/20 bg-white p-3 space-y-2"
      >
        <h3 class="font-semibold">
          {{ table.label }}
        </h3>
        <ul class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <li
            v-for="seat in table.seats"
            :key="seat.number"
            class="flex items-center justify-between gap-2 rounded-md bg-bread-100 px-2 py-1 text-sm"
            :class="{ 'ring-2 ring-jam-700': seat.status === 'YOURS' }"
          >
            <span>Seat {{ seat.number }}</span>
            <button
              v-if="seat.status === 'OPEN' && !seatMap.locked"
              type="button"
              class="rounded-md bg-jam-800 px-2 py-0.5 text-xs font-semibold text-bread-100 disabled:opacity-50"
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
              {{ seatLabel(seat) }}
            </span>
          </li>
        </ul>
      </div>
      <button
        v-if="currentSeat && !seatMap.locked"
        type="button"
        class="rounded-md border border-jam-800 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="saving"
        @click="giveUp"
      >
        {{ chosenCompanion ? `Give up ${chosenCompanion.name}'s seat` : 'Give up my seat' }}
      </button>
    </template>
  </section>
</template>
