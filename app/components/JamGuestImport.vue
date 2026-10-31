<script setup lang="ts">
import type { GatheringRecord, JamImportableGuest } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

const props = defineProps<{
  gatheringId: string
  guestCount: number
}>()

const emit = defineEmits<{ imported: [] }>()

const toast = useToast()
const seating = useSeating()

const otherPlans = ref<GatheringRecord[]>([])
const sourceId = ref('')
const importable = ref<JamImportableGuest[]>([])
const selected = ref<string[]>([])
const creditsRemaining = ref(0)
const loading = ref(false)
const saving = ref(false)

const selectable = computed(() => importable.value.filter((guest) => !guest.alreadyOnList))
const overLimit = computed(() => selected.value.length > creditsRemaining.value)

function displayName(guest: JamImportableGuest) {
  return `${guest.firstName} ${guest.lastName}`.trim() || guest.email
}

onMounted(async () => {
  const plans = await seating.listGatherings().catch(() => [])
  otherPlans.value = plans.filter((plan) => plan._id !== props.gatheringId)
})

async function loadGuests() {
  selected.value = []
  importable.value = []
  if (!sourceId.value) return
  loading.value = true
  try {
    const result = await seating.listImportableGuests(props.gatheringId, sourceId.value)
    importable.value = result.guests
    creditsRemaining.value = result.creditsRemaining
    selected.value = selectable.value.map((guest) => guest._id)
  } catch (error) {
    toast.add({ title: 'Could not load those guests', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function addSelected() {
  saving.value = true
  try {
    const result = await seating.importGuests(props.gatheringId, sourceId.value, selected.value)
    toast.add({ title: result.message, description: 'They are pending until you send their invitations.', color: 'success' })
    emit('imported')
    await loadGuests()
  } catch (error) {
    toast.add({ title: 'Could not add those guests', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <details
    v-if="otherPlans.length"
    class="white-bread-container p-4 sm:p-5 shadow-xs"
    :open="guestCount === 0"
    data-testid="guest-import"
  >
    <summary class="cursor-pointer font-serif font-bold text-base text-toast-900">
      Invite the same guests from another Jam
    </summary>
    <div class="mt-3 space-y-3">
      <label class="block text-xs font-semibold text-toast-800">
        Copy guests from
        <select
          v-model="sourceId"
          class="mt-1 w-full rounded-lg border border-toast-300 bg-white px-2 py-1.5 text-sm font-normal"
          @change="loadGuests"
        >
          <option value="">
            Choose a Jam
          </option>
          <option
            v-for="plan in otherPlans"
            :key="plan._id"
            :value="plan._id"
          >
            {{ plan.name }}
          </option>
        </select>
      </label>
      <p
        v-if="loading"
        class="text-xs text-muted"
      >
        Loading guests...
      </p>
      <p
        v-else-if="sourceId && !importable.length"
        class="text-xs text-muted"
      >
        That Jam has no guests yet.
      </p>
      <template v-else-if="importable.length">
        <ul class="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-bread-200 bg-white p-2">
          <li
            v-for="guest in importable"
            :key="guest._id"
          >
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="selected"
                type="checkbox"
                :value="guest._id"
                :disabled="guest.alreadyOnList"
              >
              <span class="min-w-0 truncate">{{ displayName(guest) }}</span>
              <span class="min-w-0 truncate text-xs text-muted">{{ guest.alreadyOnList ? 'Already on this list' : guest.email }}</span>
            </label>
          </li>
        </ul>
        <p
          class="text-xs"
          :class="overLimit ? 'font-semibold text-red-700' : 'text-muted'"
        >
          {{ selected.length }} selected · {{ creditsRemaining }} guest slots left
          <NuxtLink
            v-if="overLimit"
            :to="`/user/seating-upgrade/${gatheringId}`"
            class="underline"
          >
            Upgrade your plan
          </NuxtLink>
        </p>
        <UButton
          size="sm"
          color="primary"
          icon="i-lucide-user-plus"
          :loading="saving"
          :disabled="!selected.length || overLimit"
          @click="addSelected"
        >
          Add Selected Guests
        </UButton>
      </template>
      <p class="text-[11px] text-muted italic">
        This copies names and emails only. Seats and replies stay with the other Jam, and nothing is sent until you send invitations.
      </p>
    </div>
  </details>
</template>
