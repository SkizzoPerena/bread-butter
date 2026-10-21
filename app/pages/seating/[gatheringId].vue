<script setup lang="ts">
import type { GatheringRecord, SeatingGuestRecord } from '~/types/seating'
import { guestDisplayName } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { attendanceTokenFromScan, currentOriginPath } from '~/utils/seatingQr'
import SeatingQrImage from '~/components/SeatingQrImage.vue'
import SeatingCheckInScanner from '~/components/SeatingCheckInScanner.vue'

definePageMeta({ layout: 'signed-in-navbar' })

const route = useRoute()
const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const seating = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const guests = ref<SeatingGuestRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const section = ref<'guests' | 'tables' | 'checkin'>('guests')
const tableCount = ref(1)
const seatsPerTable = ref(8)
const lastScan = ref('')

const guestForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  partyName: '',
  isAttending: true,
})

const active = computed(() => gathering.value?.status === 'ACTIVE')
const lookupUrl = computed(() => gathering.value ? currentOriginPath(`/seat/${gathering.value.publicToken}`) : '')

useHead({ title: computed(() => gathering.value ? `${gathering.value.name} seating` : 'Seating plan') })

onMounted(load)

async function load() {
  loading.value = true
  try {
    gathering.value = await seating.getGathering(gatheringId.value)
    if (gathering.value.status === 'ACTIVE') {
      const listed = await seating.listGuests(gatheringId.value)
      guests.value = listed.guests
    }
  } catch (error) {
    toast.add({ title: 'Could not load seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function addGuest() {
  saving.value = true
  try {
    await seating.createGuest(gatheringId.value, { ...guestForm })
    guestForm.firstName = ''
    guestForm.lastName = ''
    guestForm.email = ''
    guestForm.partyName = ''
    await load()
  } catch (error) {
    toast.add({ title: 'Could not add guest', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleAttending(guest: SeatingGuestRecord) {
  try {
    await seating.updateGuest(gatheringId.value, guest._id, { isAttending: !guest.isAttending })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not update guest', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function removeGuest(guest: SeatingGuestRecord) {
  try {
    await seating.deleteGuest(gatheringId.value, guest._id)
    await load()
  } catch (error) {
    toast.add({ title: 'Could not remove guest', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function applyTables() {
  if (!gathering.value) return
  const seated = guests.value.some((guest) => guest.seatNumber != null)
  if (seated && !window.confirm('Replacing the table layout clears current seats. Continue?')) return
  saving.value = true
  try {
    const tables = Array.from({ length: tableCount.value }, () => ({ capacity: seatsPerTable.value }))
    gathering.value = await seating.replaceTables(gatheringId.value, tables, seated)
    await load()
    toast.add({ title: 'Tables updated', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not update tables', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function runAutoAssign() {
  saving.value = true
  try {
    const result = await seating.autoAssign(gatheringId.value)
    guests.value = result.guests
    gathering.value = result.gathering
    toast.add({
      title: result.splitParties.length ? 'Some parties were split' : 'Seats assigned',
      description: result.splitParties.length ? result.splitParties.join(', ') : result.message,
      color: result.splitParties.length ? 'warning' : 'success',
    })
  } catch (error) {
    toast.add({ title: 'Could not assign seats', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

function seatValue(guest: SeatingGuestRecord) {
  return guest.tableId && guest.seatNumber ? `${guest.tableId}:${guest.seatNumber}` : ''
}

async function onSeatChange(guest: SeatingGuestRecord, value: string) {
  try {
    if (!value) {
      await seating.moveSeat(gatheringId.value, guest._id, null, null)
    } else {
      const [tableId, seatNumber] = value.split(':')
      await seating.moveSeat(gatheringId.value, guest._id, tableId || null, Number(seatNumber))
    }
    await load()
  } catch (error) {
    toast.add({ title: 'Could not move seat', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function saveTableCapacity(tableId: string, capacity: number) {
  try {
    gathering.value = await seating.updateTableCapacity(gatheringId.value, tableId, capacity, false)
    await load()
  } catch (error) {
    const message = getApiErrorMessage(error)
    if (message.includes('Confirm to continue') && window.confirm(message)) {
      try {
        gathering.value = await seating.updateTableCapacity(gatheringId.value, tableId, capacity, true)
        await load()
      } catch (retryError) {
        toast.add({ title: 'Could not update table', description: getApiErrorMessage(retryError), color: 'error' })
      }
      return
    }
    toast.add({ title: 'Could not update table', description: message, color: 'error' })
  }
}

async function resend(guest: SeatingGuestRecord) {
  if (isUiOnlyMode.value) {
    toast.add({ title: 'Preview only', description: 'Seat pass emails send when the API is connected.', color: 'warning' })
    return
  }
  try {
    await seating.resendPass(gatheringId.value, guest._id)
    toast.add({ title: 'Seat pass sent', description: guest.email, color: 'success' })
  } catch (error) {
    toast.add({ title: 'Could not send pass', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function checkIn(guest: SeatingGuestRecord) {
  try {
    await seating.checkInGuest(gatheringId.value, guest._id)
    await load()
  } catch (error) {
    toast.add({ title: 'Could not check in', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function undo(guest: SeatingGuestRecord) {
  try {
    await seating.undoCheckIn(gatheringId.value, guest._id)
    await load()
  } catch (error) {
    toast.add({ title: 'Could not undo check-in', description: getApiErrorMessage(error), color: 'error' })
  }
}

async function onScan(value: string) {
  const token = attendanceTokenFromScan(value)
  if (!token || token === lastScan.value) return
  lastScan.value = token
  try {
    const guest = await seating.checkInByToken(gatheringId.value, token)
    toast.add({
      title: `${guest.name} checked in`,
      description: guest.tableLabel ? `${guest.tableLabel}, seat ${guest.seatNumber}` : 'No seat assigned yet',
      color: 'success',
    })
    await load()
  } catch (error) {
    toast.add({ title: 'Pass not recognized', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    setTimeout(() => {
      if (lastScan.value === token) lastScan.value = ''
    }, 2000)
  }
}

function tableFor(guest: SeatingGuestRecord) {
  return gathering.value?.tables.find((table) => table._id === guest.tableId)
}
</script>

<template>
  <div class="bg-bread-400 min-h-screen py-8">
    <UContainer class="space-y-6 max-w-5xl">
      <div
        v-if="loading"
        class="white-bread-container p-6"
      >
        Loading seating plan...
      </div>
      <template v-else-if="gathering">
        <div class="white-bread-container p-5 space-y-2">
          <p class="text-sm uppercase tracking-wide">
            {{ gathering.packageName }}
          </p>
          <h1 class="text-3xl font-serif font-bold">
            {{ gathering.name }}
          </h1>
          <p>{{ gathering.venue }} · {{ new Date(gathering.eventDate).toLocaleDateString() }}</p>
          <p class="text-sm">
            {{ gathering.guestCount }} / {{ gathering.maxGuests }} guests · {{ gathering.attendingCount }} attending
          </p>
          <UButton
            v-if="!active"
            :to="{ path: '/user/seating-payment', query: { gatheringId: gathering._id } }"
          >
            Complete payment to manage seats
          </UButton>
        </div>

        <div
          v-if="active"
          class="flex flex-wrap gap-2"
        >
          <UButton
            :variant="section === 'guests' ? 'solid' : 'outline'"
            @click="section = 'guests'"
          >
            Guests
          </UButton>
          <UButton
            :variant="section === 'tables' ? 'solid' : 'outline'"
            @click="section = 'tables'"
          >
            Tables and seats
          </UButton>
          <UButton
            :variant="section === 'checkin' ? 'solid' : 'outline'"
            @click="section = 'checkin'"
          >
            QR and check-in
          </UButton>
        </div>

        <section
          v-if="active && section === 'guests'"
          class="white-bread-container p-5 space-y-4"
        >
          <form
            class="grid gap-3 md:grid-cols-2"
            @submit.prevent="addGuest"
          >
            <UInput
              v-model="guestForm.firstName"
              placeholder="First name"
              required
            />
            <UInput
              v-model="guestForm.lastName"
              placeholder="Last name"
              required
            />
            <UInput
              v-model="guestForm.email"
              type="email"
              placeholder="Email"
              required
            />
            <UInput
              v-model="guestForm.partyName"
              placeholder="Party name (optional)"
            />
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="guestForm.isAttending"
                type="checkbox"
              >
              Mark as attending
            </label>
            <UButton
              type="submit"
              :loading="saving"
            >
              Add guest
            </UButton>
          </form>

          <div
            v-for="guest in guests"
            :key="guest._id"
            class="flex flex-col gap-2 border-t border-toast-600/20 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p class="font-semibold">
                {{ guestDisplayName(guest) }}
              </p>
              <p class="text-sm">
                {{ guest.email }}<span v-if="guest.partyName"> · {{ guest.partyName }}</span>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                size="xs"
                variant="outline"
                @click="toggleAttending(guest)"
              >
                {{ guest.isAttending ? 'Attending' : 'Not attending' }}
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="soft"
                @click="removeGuest(guest)"
              >
                Remove
              </UButton>
            </div>
          </div>
        </section>

        <section
          v-if="active && section === 'tables'"
          class="space-y-4"
        >
          <div class="white-bread-container p-5 space-y-3">
            <div class="grid gap-3 md:grid-cols-3">
              <UFormField label="Number of tables">
                <UInput
                  v-model.number="tableCount"
                  type="number"
                  min="1"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Seats per table">
                <UInput
                  v-model.number="seatsPerTable"
                  type="number"
                  min="1"
                  class="w-full"
                />
              </UFormField>
              <div class="flex items-end gap-2">
                <UButton
                  :loading="saving"
                  @click="applyTables"
                >
                  Save layout
                </UButton>
                <UButton
                  variant="outline"
                  :loading="saving"
                  @click="runAutoAssign"
                >
                  Auto-assign
                </UButton>
              </div>
            </div>
            <p class="text-sm">
              Total seats cannot exceed {{ gathering.maxGuests }}. Guests who share a party sit together when the table has room.
            </p>
          </div>

          <div
            v-for="guest in guests.filter((item) => item.isAttending)"
            :key="guest._id"
            class="white-bread-container p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p class="font-semibold">
                {{ guestDisplayName(guest) }}
              </p>
              <p class="text-sm">
                {{ tableFor(guest)?.label || 'Unassigned' }}<span v-if="guest.seatNumber">, seat {{ guest.seatNumber }}</span>
              </p>
            </div>
            <select
              class="rounded-md border border-toast-600/30 bg-white px-3 py-2"
              :value="seatValue(guest)"
              @change="onSeatChange(guest, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">
                Unassigned
              </option>
              <optgroup
                v-for="table in gathering.tables"
                :key="table._id"
                :label="table.label"
              >
                <option
                  v-for="seat in table.capacity"
                  :key="`${table._id}-${seat}`"
                  :value="`${table._id}:${seat}`"
                >
                  {{ table.label }} seat {{ seat }}
                </option>
              </optgroup>
            </select>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div
              v-for="table in gathering.tables"
              :key="table._id"
              class="white-bread-container p-4 space-y-2"
            >
              <h2 class="font-serif text-xl font-bold">
                {{ table.label }}
              </h2>
              <label class="flex items-center gap-2 text-sm">
                Seats
                <input
                  :value="table.capacity"
                  type="number"
                  min="1"
                  class="w-20 rounded-md border border-toast-600/30 bg-white px-2 py-1"
                  @change="saveTableCapacity(table._id, Number(($event.target as HTMLInputElement).value))"
                >
              </label>
              <p
                v-for="seat in table.capacity"
                :key="seat"
                class="text-sm"
              >
                Seat {{ seat }}:
                {{ guests.find((guest) => guest.tableId === table._id && guest.seatNumber === seat) ? guestDisplayName(guests.find((guest) => guest.tableId === table._id && guest.seatNumber === seat)!) : 'Empty' }}
              </p>
            </div>
          </div>
        </section>

        <section
          v-if="active && section === 'checkin'"
          class="grid gap-4 lg:grid-cols-2"
        >
          <div class="white-bread-container p-5 space-y-3">
            <h2 class="font-serif text-xl font-bold">
              Gathering QR
            </h2>
            <p class="text-sm">
              Guests scan this, choose their name, and see their table and seat.
            </p>
            <SeatingQrImage
              :value="lookupUrl"
              alt="Gathering seating QR code"
            />
            <p class="break-all text-xs">
              {{ lookupUrl }}
            </p>
          </div>
          <div class="white-bread-container p-5 space-y-3">
            <h2 class="font-serif text-xl font-bold">
              Scan a pass
            </h2>
            <ClientOnly>
              <SeatingCheckInScanner @scan="onScan" />
            </ClientOnly>
          </div>
          <div
            v-for="guest in guests.filter((item) => item.isAttending)"
            :key="guest._id"
            class="white-bread-container p-4 space-y-2"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold">
                  {{ guestDisplayName(guest) }}
                </p>
                <p class="text-sm">
                  {{ tableFor(guest)?.label || 'No table' }}<span v-if="guest.seatNumber">, seat {{ guest.seatNumber }}</span>
                </p>
                <p class="text-sm">
                  {{ guest.checkedInAt ? `Checked in ${new Date(guest.checkedInAt).toLocaleString()}` : 'Not checked in' }}
                </p>
              </div>
              <SeatingQrImage
                v-if="guest.seatNumber"
                :value="currentOriginPath(`/attend/${guest.attendanceToken}?checkin=1`)"
                :size="96"
                :alt="`${guestDisplayName(guest)} attendance QR`"
              />
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="!guest.checkedInAt"
                size="xs"
                @click="checkIn(guest)"
              >
                Check in
              </UButton>
              <UButton
                v-else
                size="xs"
                variant="outline"
                @click="undo(guest)"
              >
                Undo
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                :disabled="!guest.seatNumber"
                @click="resend(guest)"
              >
                Email pass
              </UButton>
            </div>
          </div>
        </section>
      </template>
    </UContainer>
  </div>
</template>
