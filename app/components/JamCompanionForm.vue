<script setup lang="ts">
import type { JamCompanion, JamCompanionRow } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

const props = defineProps<{ token: string }>()
const emit = defineEmits<{ changed: [] }>()

const { fetchCompanions, saveCompanions } = useSeating()

type Row = { key: string, _id?: string, firstName: string, lastName: string, placeholder: string }

const maxCompanions = ref(0)
const rows = ref<Row[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')
let nextKey = 0

const canAdd = computed(() => rows.value.length < maxCompanions.value)

function rowsFrom(companions: JamCompanion[]): Row[] {
  return companions.map((companion) => ({
    key: companion._id,
    _id: companion._id,
    // A placeholder isn't a name, so the guest sees an empty field to fill in.
    firstName: companion.namePending ? '' : companion.firstName,
    lastName: companion.namePending ? '' : companion.lastName,
    placeholder: companion.namePending ? companion.name : '',
  }))
}

onMounted(async () => {
  try {
    const list = await fetchCompanions(props.token)
    maxCompanions.value = list.maxCompanions ?? 0
    rows.value = rowsFrom(list.companions ?? [])
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Companions are not available right now.')
  } finally {
    loading.value = false
  }
})

function addRow() {
  if (!canAdd.value) return
  nextKey += 1
  rows.value.push({ key: `new-${nextKey}`, firstName: '', lastName: '', placeholder: '' })
}

function removeRow(key: string) {
  rows.value = rows.value.filter((row) => row.key !== key)
}

async function save() {
  errorMessage.value = ''
  notice.value = ''
  if (rows.value.some((row) => Boolean(row.firstName.trim()) !== Boolean(row.lastName.trim()))) {
    errorMessage.value = 'Enter both a first and last name, or leave both empty for now.'
    return
  }
  saving.value = true
  try {
    const body: JamCompanionRow[] = rows.value.map((row) => ({
      ...(row._id ? { _id: row._id } : {}),
      ...(row.firstName.trim() ? { firstName: row.firstName.trim(), lastName: row.lastName.trim() } : {}),
    }))
    const list = await saveCompanions(props.token, body)
    rows.value = rowsFrom(list.companions)
    notice.value = list.message || 'Your companions are saved.'
    emit('changed')
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Could not save your companions.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section
    v-if="loading || maxCompanions > 0 || rows.length > 0"
    class="w-full space-y-3 text-left"
    aria-label="Companions"
  >
    <h2 class="text-xl font-serif font-bold">
      Bringing anyone?
    </h2>
    <p v-if="loading">
      Loading...
    </p>
    <template v-else>
      <p class="text-sm">
        You can bring up to {{ maxCompanions }} {{ maxCompanions === 1 ? 'companion' : 'companions' }}.
        If you don't know a name yet, leave it empty and add it here later.
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
      <div
        v-for="(row, index) in rows"
        :key="row.key"
        class="rounded-xl border border-jam-700/20 bg-white p-3 space-y-2"
        data-testid="companion-row"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold">
            Companion {{ index + 1 }}
          </p>
          <button
            type="button"
            class="text-xs underline disabled:opacity-50"
            :disabled="saving"
            :aria-label="`Remove companion ${index + 1}`"
            @click="removeRow(row.key)"
          >
            Remove
          </button>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="block text-sm">
            First name
            <input
              v-model="row.firstName"
              maxlength="50"
              :placeholder="row.placeholder || 'Optional'"
              class="mt-1 w-full rounded-md border border-jam-700/30 bg-white px-3 py-2"
            >
          </label>
          <label class="block text-sm">
            Last name
            <input
              v-model="row.lastName"
              maxlength="50"
              :placeholder="row.placeholder ? '' : 'Optional'"
              class="mt-1 w-full rounded-md border border-jam-700/30 bg-white px-3 py-2"
            >
          </label>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="canAdd"
          type="button"
          class="rounded-md border border-jam-800 px-3 py-1 text-sm disabled:opacity-50"
          :disabled="saving"
          @click="addRow"
        >
          Add a companion
        </button>
        <button
          type="button"
          class="rounded-md bg-jam-800 px-3 py-1 text-sm text-bread-100 disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          Save companions
        </button>
      </div>
    </template>
  </section>
</template>
