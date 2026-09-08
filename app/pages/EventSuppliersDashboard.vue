<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import type {
  ContractStatus,
  CreateSupplierPayload,
  PermitStatus,
  SupplierRecord,
  SupplierSummary,
  SupplierType,
  UpdateSupplierPayload,
} from '~/types/supplier'
import {
  CONTRACT_STATUS_OPTIONS,
  PERMIT_STATUS_OPTIONS,
  SUPPLIER_TYPE_ORDER,
  formatCurrency,
  groupSuppliersByType,
} from '~/types/supplier'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { EVENT_FEATURE } from '~/utils/eventTierFeatures'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Suppliers',
  bgClass: 'bg-fuchsia-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { requireEventFeature } = useEventFeatureGate()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { isExporting, exportEventPdf } = useEventPdfExport()
const {
  isLoading: isLoadingSuppliers,
  isSubmitting,
  fetchSuppliers,
  fetchSupplierSummary,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = useEventSuppliers()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const suppliers = ref<SupplierRecord[]>([])
const summary = ref<SupplierSummary | null>(null)
const isLoadingEvent = ref(false)
const savingSupplierId = ref<string | null>(null)
const deletingSupplierId = ref<string | null>(null)
const supplierToDelete = ref<SupplierRecord | null>(null)
const isDeleteModalOpen = ref(false)
const isAddSupplierModalOpen = ref(false)

type NewSupplierForm = {
  supplierType: SupplierType
  supplierTitle: string
  vendorName: string
  totalBalance: number
  contract: ContractStatus
  permit: PermitStatus
}

function createEmptyNewSupplierForm(): NewSupplierForm {
  return {
    supplierType: 'Uncategorized',
    supplierTitle: '',
    vendorName: '',
    totalBalance: 0,
    contract: 'N/A',
    permit: 'N/A',
  }
}

const newSupplierForm = ref<NewSupplierForm>(createEmptyNewSupplierForm())

type SupplierDraft = {
  supplierType: SupplierType
  vendorName: string
  totalBalance: number
  settledBalance: number
  contract: ContractStatus
  permit: PermitStatus
}

const supplierDrafts = ref<Record<string, SupplierDraft>>({})
const savedSupplierDrafts = ref<Record<string, SupplierDraft>>({})

const supplierModalUi = {
  header: 'bg-fuchsia-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md',
  overlay: 'bg-fuchsia-900/30',
}

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const mutationsDisabled = computed(
  () => isEventCancelled.value || (!eventId.value && !isUiOnlyMode.value)
)

const isPageLoading = computed(() => isLoadingEvent.value || isLoadingSuppliers.value)
const isSupplierListEmpty = computed(() => suppliers.value.length === 0)

const groupedSuppliers = computed(() => groupSuppliersByType(suppliers.value))

const contractSelectItems = computed(() =>
  CONTRACT_STATUS_OPTIONS.map((value) => ({ label: value, value }))
)

const permitSelectItems = computed(() =>
  PERMIT_STATUS_OPTIONS.map((value) => ({ label: value, value }))
)

const supplierTypeSelectItems = computed(() =>
  SUPPLIER_TYPE_ORDER.map((value) => ({ label: value, value }))
)

function toBalanceAmount(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function buildSupplierDraft(supplier: SupplierRecord): SupplierDraft {
  return {
    supplierType: supplier.supplierType,
    vendorName: supplier.vendorName ?? '',
    totalBalance: toBalanceAmount(supplier.totalBalance),
    settledBalance: toBalanceAmount(supplier.settledBalance),
    contract: supplier.contract ?? 'N/A',
    permit: supplier.permit ?? 'N/A',
  }
}

function cloneSupplierDrafts(source: Record<string, SupplierDraft>): Record<string, SupplierDraft> {
  const next: Record<string, SupplierDraft> = {}
  for (const [id, draft] of Object.entries(source)) {
    next[id] = { ...draft }
  }
  return next
}

function syncDraftsFromSuppliers(list: SupplierRecord[]) {
  const next: Record<string, SupplierDraft> = {}
  for (const supplier of list) {
    next[supplier._id] = buildSupplierDraft(supplier)
  }
  supplierDrafts.value = next
  savedSupplierDrafts.value = cloneSupplierDrafts(next)
}

function isSupplierDraftDirty(supplierId: string): boolean {
  const current = supplierDrafts.value[supplierId]
  const saved = savedSupplierDrafts.value[supplierId]
  if (!current || !saved) {
    return false
  }
  return (
    current.supplierType !== saved.supplierType ||
    current.vendorName !== saved.vendorName ||
    toBalanceAmount(current.totalBalance) !== toBalanceAmount(saved.totalBalance) ||
    toBalanceAmount(current.settledBalance) !== toBalanceAmount(saved.settledBalance) ||
    current.contract !== saved.contract ||
    current.permit !== saved.permit
  )
}

function isSavingSupplier(supplierId: string): boolean {
  return savingSupplierId.value === supplierId
}

function isDeletingSupplier(supplierId: string): boolean {
  return deletingSupplierId.value === supplierId
}

function buildUpdatePayload(draft: SupplierDraft, saved: SupplierDraft): UpdateSupplierPayload {
  const payload: UpdateSupplierPayload = {}
  if (draft.supplierType !== saved.supplierType) {
    payload.supplierType = draft.supplierType
  }
  if (draft.vendorName !== saved.vendorName) {
    payload.vendorName = draft.vendorName
  }
  if (toBalanceAmount(draft.totalBalance) !== toBalanceAmount(saved.totalBalance)) {
    payload.totalBalance = toBalanceAmount(draft.totalBalance)
  }
  if (toBalanceAmount(draft.settledBalance) !== toBalanceAmount(saved.settledBalance)) {
    payload.settledBalance = toBalanceAmount(draft.settledBalance)
  }
  if (draft.contract !== saved.contract) {
    payload.contract = draft.contract
  }
  if (draft.permit !== saved.permit) {
    payload.permit = draft.permit
  }
  return payload
}

async function loadEventData() {
  isLoadingEvent.value = true
  try {
    const detail = await loadPageData({
      fetch: () => fetchEvent(eventId.value),
      mock: () => ({
        event: {
          _id: eventId.value || 'mock-event-id',
          eventType: 'WEDDING',
          eventName: 'Sample Wedding',
          description: 'UI-only preview',
          venue: 'Sample Venue',
          eventDate: new Date().toISOString(),
          status: 'ONGOING',
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(eventRecord.value)
  } catch (error) {
    reportApiError(toast, { title: 'Failed to load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

async function loadSuppliersData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    return
  }

  const id = eventId.value || 'mock-event-id'

  try {
    const [suppliersResponse, summaryResponse] = await Promise.all([
      fetchSuppliers(id),
      fetchSupplierSummary(id),
    ])

    if (suppliersResponse?.suppliers) {
      suppliers.value = suppliersResponse.suppliers
      syncDraftsFromSuppliers(suppliersResponse.suppliers)
    }
    if (summaryResponse?.summary) {
      summary.value = summaryResponse.summary
    }
  } catch (error) {
    reportApiError(toast, { title: 'Failed to load suppliers', error })
  }
}

async function refreshAfterMutation() {
  await loadSuppliersData()
}

async function saveSupplier(supplierId: string) {
  const draft = supplierDrafts.value[supplierId]
  const saved = savedSupplierDrafts.value[supplierId]
  if (!draft || !saved || !isSupplierDraftDirty(supplierId)) {
    return
  }

  if (toBalanceAmount(draft.settledBalance) > toBalanceAmount(draft.totalBalance)) {
    toast.add({
      title: 'Invalid balances',
      description: 'Settled balance cannot exceed total balance.',
      color: 'error',
    })
    return
  }

  const payload = buildUpdatePayload(draft, saved)
  if (Object.keys(payload).length === 0) {
    return
  }

  savingSupplierId.value = supplierId
  try {
    const response = await updateSupplier(supplierId, payload)
    if (response?.success) {
      toast.add({
        title: 'Supplier saved',
        color: 'success',
      })
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Failed to save supplier', error })
  } finally {
    savingSupplierId.value = null
  }
}

async function confirmDeleteSupplier() {
  const supplier = supplierToDelete.value
  if (!supplier) {
    return
  }

  deletingSupplierId.value = supplier._id
  try {
    const response = await deleteSupplier(supplier._id)
    if (response?.success) {
      toast.add({
        title: 'Supplier removed',
        color: 'success',
      })
      isDeleteModalOpen.value = false
      supplierToDelete.value = null
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Failed to delete supplier', error })
  } finally {
    deletingSupplierId.value = null
  }
}

function openDeleteModal(supplier: SupplierRecord) {
  supplierToDelete.value = supplier
  isDeleteModalOpen.value = true
}

function openAddSupplierModal() {
  newSupplierForm.value = createEmptyNewSupplierForm()
  isAddSupplierModalOpen.value = true
}

async function handleCreateSupplier() {
  const form = newSupplierForm.value
  const supplierTitle = form.supplierTitle.trim()

  if (!supplierTitle) {
    toast.add({
      title: 'Supplier title required',
      description: 'Enter a title for this supplier (e.g. Photographer, Caterer).',
      color: 'error',
    })
    return
  }

  const id = eventId.value || 'mock-event-id'
  const payload: CreateSupplierPayload = {
    supplierType: form.supplierType,
    supplierTitle,
    vendorName: form.vendorName.trim(),
    totalBalance: toBalanceAmount(form.totalBalance),
    contract: form.contract,
    permit: form.permit,
  }

  try {
    const response = await createSupplier(id, payload)
    if (response?.success) {
      toast.add({
        title: 'Supplier added',
        color: 'success',
      })
      isAddSupplierModalOpen.value = false
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Failed to add supplier', error })
  }
}

onMounted(async () => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/')
    return
  }

  const allowed = await requireEventFeature(EVENT_FEATURE.SUPPLIERS)
  if (!allowed) {
    return
  }

  await loadEventData()
  await loadSuppliersData()
})

watch(eventId, async () => {
  await loadEventData()
  await loadSuppliersData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            icon="i-lucide-plus"
            color="fuchsia"
            :disabled="mutationsDisabled || isSubmitting"
            @click="openAddSupplierModal"
          >
            Add Supplier
          </UButton>
          <UButton
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            :loading="isExporting"
            :disabled="!eventId || isExporting"
            @click="exportEventPdf(eventId, 'suppliers')"
          >
            Export PDF
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <div
      v-if="isPageLoading"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading suppliers...</span>
    </div>

    <div v-else class="space-y-6">
      <UAlert
        v-if="isEventCancelled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="Supplier updates are disabled for a cancelled event."
      />

      <UPageGrid v-if="summary">
        <UPageCard
          class="bg-fuchsia-50 dark:bg-fuchsia-900/20 ring ring-inset ring-fuchsia-500/25"
          description="Total budget"
          :ui="{ title: 'text-fuchsia-600 dark:text-fuchsia-400', description: 'text-fuchsia-600/70 dark:text-fuchsia-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ formatCurrency(summary.totalBudget) }}</div>
          </template>
        </UPageCard>
        <UPageCard
          class="bg-fuchsia-50 dark:bg-fuchsia-900/20 ring ring-inset ring-fuchsia-500/25"
          description="Paid"
          :ui="{ title: 'text-fuchsia-600 dark:text-fuchsia-400', description: 'text-fuchsia-600/70 dark:text-fuchsia-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ formatCurrency(summary.totalPaid) }}</div>
          </template>
        </UPageCard>
        <UPageCard
          class="bg-fuchsia-50 dark:bg-fuchsia-900/20 ring ring-inset ring-fuchsia-500/25"
          description="Remaining"
          :ui="{ title: 'text-fuchsia-600 dark:text-fuchsia-400', description: 'text-fuchsia-600/70 dark:text-fuchsia-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ formatCurrency(summary.totalRemaining) }}</div>
          </template>
        </UPageCard>
      </UPageGrid>

      <div
        v-if="isSupplierListEmpty"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
      >
        <UIcon name="i-lucide-briefcase" class="size-10 text-muted" />
        <p class="mt-4 text-base font-medium">No suppliers yet</p>
        <p class="mt-1 max-w-sm text-sm text-muted">
          Add your own suppliers or use the default wedding list when you create a wedding event.
        </p>
        <UButton
          v-if="!mutationsDisabled"
          class="mt-6"
          icon="i-lucide-plus"
          color="fuchsia"
          :disabled="isSubmitting"
          @click="openAddSupplierModal"
        >
          Add Supplier
        </UButton>
      </div>

      <div v-else class="space-y-8">
        <section
          v-for="section in groupedSuppliers"
          :key="section.supplierType"
          class="space-y-4"
        >
          <h2 class="text-2xl font-semibold font-serif text-muted">
            {{ section.supplierType }}
          </h2>

          <div class="space-y-4">
            <template
              v-for="supplier in section.suppliers"
              :key="supplier._id"
            >
              <UPageCard
                v-if="supplierDrafts[supplier._id]"
                class="space-y-4"
              >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-lg font-medium text-highlighted">
                    {{ supplier.supplierTitle }}
                  </h3>
                  <p
                    v-if="supplier.vendorName"
                    class="text-sm text-muted"
                  >
                    {{ supplier.vendorName }}
                  </p>
                </div>
                <UButton
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :disabled="mutationsDisabled || isSubmitting"
                  :loading="isDeletingSupplier(supplier._id)"
                  aria-label="Delete supplier"
                  @click="openDeleteModal(supplier)"
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField label="Category" :name="`${supplier._id}-type`">
                  <USelect
                    v-model="supplierDrafts[supplier._id]!.supplierType"
                    :items="supplierTypeSelectItems"
                    class="w-full"
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>

                <UFormField label="Vendor name" :name="`${supplier._id}-vendor`">
                  <UInput
                    v-model="supplierDrafts[supplier._id]!.vendorName"
                    class="w-full"
                    placeholder="Company or vendor name"
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>

                <UFormField label="Contract" :name="`${supplier._id}-contract`">
                  <USelect
                    v-model="supplierDrafts[supplier._id]!.contract"
                    :items="contractSelectItems"
                    class="w-full"
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>

                <UFormField label="Permit" :name="`${supplier._id}-permit`">
                  <USelect
                    v-model="supplierDrafts[supplier._id]!.permit"
                    :items="permitSelectItems"
                    class="w-full"
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>

                <UFormField label="Total balance" :name="`${supplier._id}-total`">
                  <UInput
                    v-model.number="supplierDrafts[supplier._id]!.totalBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full"
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>

                <UFormField label="Settled balance" :name="`${supplier._id}-settled`">
                  <UInput
                    v-model.number="supplierDrafts[supplier._id]!.settledBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full"
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>
              </div>

              <div class="flex justify-end">
                <UButton
                  icon="i-lucide-save"
                  color="fuchsia"
                  :loading="isSavingSupplier(supplier._id)"
                  :disabled="mutationsDisabled || isSubmitting || !isSupplierDraftDirty(supplier._id)"
                  @click="saveSupplier(supplier._id)"
                >
                  Save
                </UButton>
              </div>
            </UPageCard>
            </template>
          </div>
        </section>
      </div>
    </div>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Remove supplier"
      :ui="supplierModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <p class="text-sm text-muted">
          Remove
          <span class="font-medium text-highlighted">{{ supplierToDelete?.supplierTitle }}</span>
          from your supplier list? This cannot be undone.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="() => { isDeleteModalOpen = false }"
          />
          <UButton
            label="Remove"
            color="error"
            :loading="Boolean(deletingSupplierId)"
            :disabled="mutationsDisabled"
            @click="confirmDeleteSupplier"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isAddSupplierModalOpen"
      title="Add supplier"
      :ui="supplierModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Category" name="new-supplier-type" required>
            <USelect
              v-model="newSupplierForm.supplierType"
              :items="supplierTypeSelectItems"
              class="w-full"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>

          <UFormField label="Supplier title" name="new-supplier-title" required>
            <UInput
              v-model="newSupplierForm.supplierTitle"
              class="w-full"
              placeholder="e.g. Photographer, Caterer, Venue"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>

          <UFormField label="Vendor name" name="new-vendor-name">
            <UInput
              v-model="newSupplierForm.vendorName"
              class="w-full"
              placeholder="Company or vendor name"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>

          <UFormField label="Contract" name="new-contract">
            <USelect
              v-model="newSupplierForm.contract"
              :items="contractSelectItems"
              class="w-full"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>

          <UFormField label="Permit" name="new-permit">
            <USelect
              v-model="newSupplierForm.permit"
              :items="permitSelectItems"
              class="w-full"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>

          <UFormField label="Total balance" name="new-total-balance">
            <UInput
              v-model.number="newSupplierForm.totalBalance"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="() => { isAddSupplierModalOpen = false }"
          />
          <UButton
            label="Add supplier"
            color="fuchsia"
            :loading="isSubmitting"
            :disabled="mutationsDisabled"
            @click="handleCreateSupplier"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
