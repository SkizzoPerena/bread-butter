<script lang="ts" setup>
import { DateFormatter } from '@internationalized/date'
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
  computeSupplierSummary,
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

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { requireEventFeature } = useEventFeatureGate()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { isExporting, exportEventPdf } = useEventPdfExport()
const { finishPageTransition } = usePageTransition()
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

// Tabs and search state
type SupplierTab = 'assigned' | 'no-assignment'
const activeTab = ref<SupplierTab>('assigned')
const searchQuery = ref('')
const savedSupplierIds = ref<Set<string>>(new Set())
const selectedSupplierForModal = ref<SupplierRecord | null>(null)
const isSupplierModalOpen = ref(false)
const modalMode = ref<'assign' | 'edit'>('assign')

type NewSupplierForm = {
  supplierType: SupplierType
  supplierTitle: string
  vendorName: string
  totalBalance: number
  contract: ContractStatus
  permit: PermitStatus
}

function createEmptyNewSupplierForm(defaultType: SupplierType = 'Uncategorized'): NewSupplierForm {
  return {
    supplierType: defaultType,
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
const eventTitle = computed(() => eventRecord.value?.eventName ?? '')
const eventDateLabel = computed(() => {
  const dateValue = eventRecord.value?.eventDate
  if (!dateValue) return ''
  try {
    return df.format(new Date(dateValue))
  } catch {
    return ''
  }
})

const mutationsDisabled = computed(
  () => isEventCancelled.value || (!eventId.value && !isUiOnlyMode.value)
)

const isPageLoading = computed(() => isLoadingEvent.value || isLoadingSuppliers.value)
const isSupplierListEmpty = computed(() => suppliers.value.length === 0)

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
    if (isSupplierExplicitlySaved(supplier)) {
      savedSupplierIds.value.add(supplier._id)
    }
  }
  supplierDrafts.value = next
  savedSupplierDrafts.value = cloneSupplierDrafts(next)
}

function isSupplierExplicitlySaved(supplier: SupplierRecord): boolean {
  const vendor = (supplier.vendorName ?? '').trim()
  const total = toBalanceAmount(supplier.totalBalance)
  const settled = toBalanceAmount(supplier.settledBalance)
  const contract = supplier.contract ?? 'N/A'
  const permit = supplier.permit ?? 'N/A'
  return Boolean(vendor || total > 0 || settled > 0 || contract !== 'N/A' || permit !== 'N/A')
}

function isSupplierSaved(supplier: SupplierRecord): boolean {
  if (savedSupplierIds.value.has(supplier._id)) {
    return true
  }
  const draft = supplierDrafts.value[supplier._id]
  const vendor = (draft?.vendorName ?? supplier.vendorName ?? '').trim()
  const total = toBalanceAmount(draft?.totalBalance ?? supplier.totalBalance)
  const settled = toBalanceAmount(draft?.settledBalance ?? supplier.settledBalance)
  const contract = draft?.contract ?? supplier.contract ?? 'N/A'
  const permit = draft?.permit ?? supplier.permit ?? 'N/A'
  return Boolean(vendor || total > 0 || settled > 0 || contract !== 'N/A' || permit !== 'N/A')
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

// Summary Calculation
const displaySummary = computed<SupplierSummary>(() => {
  if (summary.value) {
    return summary.value
  }
  return computeSupplierSummary(suppliers.value)
})

const paymentProgressPercentage = computed(() => {
  const total = displaySummary.value.totalBudget
  const paid = displaySummary.value.totalPaid
  if (total <= 0) return 0
  return Math.min(100, Math.round((paid / total) * 100))
})

// Search & Filtering
const filteredSuppliers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return suppliers.value
  return suppliers.value.filter((s) => {
    const title = s.supplierTitle?.toLowerCase() || ''
    const vendor = (supplierDrafts.value[s._id]?.vendorName || s.vendorName || '').toLowerCase()
    const type = s.supplierType?.toLowerCase() || ''
    return title.includes(query) || vendor.includes(query) || type.includes(query)
  })
})

const savedSuppliers = computed(() => {
  return filteredSuppliers.value.filter((s) => isSupplierSaved(s))
})

const notSavedSuppliers = computed(() => {
  return filteredSuppliers.value.filter((s) => !isSupplierSaved(s))
})

const savedGroupedSuppliers = computed(() => {
  return groupSuppliersByType(savedSuppliers.value)
})

const notSavedCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return SUPPLIER_TYPE_ORDER.map((supplierType) => {
    const items = notSavedSuppliers.value.filter((s) => s.supplierType === supplierType)
    return {
      supplierType,
      suppliers: items,
    }
  }).filter((section) => {
    if (query) {
      return section.suppliers.length > 0 || section.supplierType.toLowerCase().includes(query)
    }
    return section.suppliers.length > 0
  })
})

const tabItems = computed(() => [
  {
    label: `Assigned Suppliers (${savedSuppliers.value.length})`,
    value: 'assigned' as const,
    icon: 'i-lucide-bookmark-check',
  },
  {
    label: `No Assignment (${notSavedSuppliers.value.length})`,
    value: 'no-assignment' as const,
    icon: 'i-lucide-list-plus',
  },
])

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
      savedSupplierIds.value.add(supplierId)
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Failed to save supplier', error })
  } finally {
    savingSupplierId.value = null
  }
}

function openSupplierModal(supplier: SupplierRecord, mode: 'assign' | 'edit') {
  selectedSupplierForModal.value = supplier
  modalMode.value = mode
  if (!supplierDrafts.value[supplier._id]) {
    supplierDrafts.value[supplier._id] = buildSupplierDraft(supplier)
  }
  isSupplierModalOpen.value = true
}

async function handleSaveSupplierModal() {
  const supplier = selectedSupplierForModal.value
  if (!supplier) return

  const draft = supplierDrafts.value[supplier._id]
  if (!draft) return

  if (toBalanceAmount(draft.settledBalance) > toBalanceAmount(draft.totalBalance)) {
    toast.add({
      title: 'Invalid balances',
      description: 'Settled balance cannot exceed total balance.',
      color: 'error',
    })
    return
  }

  // If assigning for the first time and vendor name is left blank, assign a recognizable status
  if (modalMode.value === 'assign' && !draft.vendorName.trim() && draft.totalBalance <= 0) {
    draft.vendorName = 'Assigned'
  }

  savedSupplierIds.value.add(supplier._id)
  await saveSupplier(supplier._id)
  isSupplierModalOpen.value = false
  selectedSupplierForModal.value = null
}

function getContractBadgeColor(status?: ContractStatus | string): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'Signed') return 'success'
  if (status === 'Unsigned') return 'warning'
  if (status === 'Received') return 'info'
  return 'neutral'
}

function getPermitBadgeColor(status?: PermitStatus | string): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'Shared') return 'success'
  if (status === 'Submitted') return 'warning'
  return 'neutral'
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
      savedSupplierIds.value.delete(supplier._id)
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

function openAddSupplierModalForType(type: SupplierType) {
  newSupplierForm.value = createEmptyNewSupplierForm(type)
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
      if (response.supplier?._id) {
        savedSupplierIds.value.add(response.supplier._id)
      }
      isAddSupplierModalOpen.value = false
      await refreshAfterMutation()
      activeTab.value = 'assigned'
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

  try {
    await loadEventData()
    await loadSuppliersData()
  } finally {
    finishPageTransition()
  }
})

watch(eventId, async () => {
  await loadEventData()
  await loadSuppliersData()
})
</script>

<template>
  <div
    class="suppliers-page-root w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-4 lg:overflow-hidden bg-bread-50/30"
  >
    <!-- Navbar Teleport Actions -->
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

    <!-- ================= LEFT DIVISION (col-span-1): Event Details & Budget Overview ================= -->
    <aside
      class="col-span-1 lg:col-span-1 w-full bg-white border-b lg:border-b-0 lg:border-r border-bread-200/80 shadow-xs flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] z-20 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6"
    >
      <div class="space-y-6">
        <!-- 1. Event Details -->
        <div class="space-y-2">
          <div>
            <h1
              class="font-serif text-xl sm:text-2xl font-bold text-highlighted leading-tight tracking-tight wrap-break-word"
            >
              {{ eventTitle || "Jane & John's Wedding" }}
            </h1>
          </div>

          <div class="flex items-center gap-3 pt-1 text-xs text-toast-700 font-sans min-w-0">
            <div v-if="eventDateLabel" class="flex items-center gap-1.5 shrink-0">
              <UIcon name="i-lucide-calendar" class="size-3.5 text-toast-500 shrink-0" />
              <span>{{ eventDateLabel }}</span>
            </div>
            <span v-if="eventDateLabel && eventRecord?.venue" class="text-toast-300">•</span>
            <div v-if="eventRecord?.venue" class="flex items-center gap-1.5 min-w-0 truncate">
              <UIcon name="i-lucide-map-pin" class="size-3.5 text-toast-500 shrink-0" />
              <span class="truncate">{{ eventRecord.venue }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Budget Overview (The Three Headers on Left Sidebar) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-1">
            <h2 class="font-bold font-serif text-sm text-highlighted">
              Budget Overview
            </h2>
            <span class="text-xs text-muted font-sans font-medium">
              {{ savedSuppliers.length }} assigned
            </span>
          </div>

          <!-- 3 Metric Cards -->
          <div class="space-y-2.5">
            <!-- Total Budget -->
            <div
              class="bg-fuchsia-50/70 border border-fuchsia-200/70 rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <span class="text-[11px] font-semibold text-fuchsia-700 font-sans block">Total Budget</span>
                <span class="text-xl sm:text-2xl font-bold font-serif text-fuchsia-950 tracking-tight mt-0.5 block">
                  {{ formatCurrency(displaySummary.totalBudget) }}
                </span>
              </div>
              <div class="size-9 rounded-lg bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 shrink-0">
                <UIcon name="i-lucide-wallet" class="size-5" />
              </div>
            </div>

            <!-- Paid & Remaining (2 columns) -->
            <div class="grid grid-cols-2 gap-2">
              <!-- Paid -->
              <div
                class="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 flex flex-col justify-between"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-emerald-700 font-sans">Paid</span>
                  <UIcon name="i-lucide-check-circle-2" class="size-4 text-emerald-600" />
                </div>
                <span class="text-lg sm:text-xl font-bold font-serif text-emerald-950 tracking-tight mt-1">
                  {{ formatCurrency(displaySummary.totalPaid) }}
                </span>
              </div>

              <!-- Remaining -->
              <div
                class="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 flex flex-col justify-between"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-amber-700 font-sans">Remaining</span>
                  <UIcon name="i-lucide-hourglass" class="size-4 text-amber-600" />
                </div>
                <span class="text-lg sm:text-xl font-bold font-serif text-amber-950 tracking-tight mt-1">
                  {{ formatCurrency(displaySummary.totalRemaining) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Payment Progress Card -->
          <div class="bg-toast-50/70 border border-bread-200/60 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-semibold text-toast-800">Payment Progress</span>
              <span class="font-bold font-serif text-black text-sm">{{ paymentProgressPercentage }}%</span>
            </div>
            <UProgress :model-value="paymentProgressPercentage" color="fuchsia" size="xs" />
            <div class="flex items-center justify-between text-[11px] text-muted font-sans pt-0.5">
              <span>{{ formatCurrency(displaySummary.totalPaid) }} of {{ formatCurrency(displaySummary.totalBudget) }}</span>
              <span v-if="displaySummary.totalRemaining > 0" class="text-amber-700 font-medium">
                {{ formatCurrency(displaySummary.totalRemaining) }} left
              </span>
              <span v-else class="text-emerald-700 font-medium">Fully Paid</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Panel Bottom Links -->
      <div class="space-y-2 pt-4">
        <UButton
          icon="i-lucide-file-down"
          color="neutral"
          variant="outline"
          size="sm"
          block
          class="w-full justify-center"
          :loading="isExporting"
          :disabled="!eventId || isExporting"
          @click="exportEventPdf(eventId, 'suppliers')"
        >
          Export PDF
        </UButton>
        <UButton
          icon="i-lucide-plus"
          color="fuchsia"
          size="md"
          block
          class="w-full font-semibold shadow-xs justify-center py-2.5 transition-all hover:shadow hover:brightness-105 active:scale-[0.99] cursor-pointer"
          :disabled="mutationsDisabled || isSubmitting"
          @click="openAddSupplierModal"
        >
          Add Custom Supplier
        </UButton>
      </div>
    </aside>

    <!-- ================= RIGHT DIVISION (col-span-3): Scrollable Suppliers View ================= -->
    <main
      class="col-span-1 lg:col-span-3 w-full h-full lg:h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden bg-toast-50/30"
    >
      <!-- Top Sticky Toolbar with UTabs and Search -->
      <header
        class="bg-white/95 backdrop-blur border-b border-bread-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10"
      >
        <div class="flex items-center gap-3">
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            value-key="value"
            color="fuchsia"
            :content="false"
          />
        </div>

        <div class="flex items-center gap-3">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            type="search"
            placeholder="Search suppliers..."
            class="w-full sm:w-64"
          />
        </div>
      </header>

      <!-- Scrollable Main Content -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <!-- Loading State -->
        <div
          v-if="isPageLoading"
          class="flex items-center justify-center py-16 text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-fuchsia-600" />
          <span class="ml-2 text-sm font-medium">Loading suppliers...</span>
        </div>

        <div v-else class="space-y-6">
          <UAlert
            v-if="isEventCancelled"
            color="warning"
            variant="subtle"
            title="Event cancelled"
            description="Supplier updates are disabled for a cancelled event."
          />

          <!-- Global empty state if no suppliers exist at all -->
          <div
            v-if="isSupplierListEmpty"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-200 bg-white/70 px-6 py-14 text-center"
          >
            <div class="size-12 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center mb-3">
              <UIcon name="i-lucide-briefcase" class="size-6" />
            </div>
            <p class="text-base font-semibold text-highlighted">No suppliers found</p>
            <p class="mt-1 max-w-sm text-sm text-muted">
              Add your own suppliers or use the default wedding list when you create a wedding event.
            </p>
            <UButton
              v-if="!mutationsDisabled"
              class="mt-5"
              icon="i-lucide-plus"
              color="fuchsia"
              :disabled="isSubmitting"
              @click="openAddSupplierModal"
            >
              Add Supplier
            </UButton>
          </div>

          <!-- ================= TAB 1: ASSIGNED SUPPLIERS ================= -->
          <div v-else-if="activeTab === 'assigned'" class="space-y-8">
            <!-- Empty state for Assigned Suppliers tab -->
            <div
              v-if="savedSuppliers.length === 0"
              class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-200 bg-white/70 px-6 py-14 text-center"
            >
              <div class="size-12 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center mb-3">
                <UIcon name="i-lucide-bookmark" class="size-6" />
              </div>
              <p class="text-base font-semibold text-highlighted">No assigned suppliers yet</p>
              <p class="mt-1 max-w-sm text-sm text-muted">
                You haven't assigned any suppliers yet. Switch to the "No Assignment" tab to add items from your checklist.
              </p>
              <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
                <UButton
                  color="fuchsia"
                  variant="subtle"
                  icon="i-lucide-list-plus"
                  @click="activeTab = 'no-assignment'"
                >
                  Browse No Assignment Suppliers
                </UButton>
                <UButton
                  v-if="!mutationsDisabled"
                  color="fuchsia"
                  icon="i-lucide-plus"
                  :disabled="isSubmitting"
                  @click="openAddSupplierModal"
                >
                  Add Custom Supplier
                </UButton>
              </div>
            </div>

            <!-- Grouped Assigned Suppliers in 3-column grid -->
            <template v-else>
              <section
                v-for="section in savedGroupedSuppliers"
                :key="section.supplierType"
                class="space-y-4"
              >
                <div class="flex items-center justify-between pb-1 border-b border-bread-200/70">
                  <div class="flex items-center gap-2.5">
                    <h2 class="text-xl font-bold font-serif text-highlighted">
                      {{ section.supplierType }}
                    </h2>
                    <UBadge color="fuchsia" variant="subtle" size="xs">
                      {{ section.suppliers.length }} assigned
                    </UBadge>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <template v-for="supplier in section.suppliers" :key="supplier._id">
                    <div
                      class="group p-4 rounded-xl border border-bread-200/90 bg-white hover:border-fuchsia-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-left"
                    >
                      <!-- Top: Enlarged Supplier Name, Supplier Type, and Edit button (replaces trash) -->
                      <div>
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0 flex-1">
                            <h3
                              class="text-base sm:text-lg font-bold font-serif text-highlighted group-hover:text-fuchsia-700 transition-colors truncate"
                              :title="supplierDrafts[supplier._id]?.vendorName || supplier.vendorName || 'No vendor specified'"
                            >
                              {{ supplierDrafts[supplier._id]?.vendorName || supplier.vendorName || 'No vendor specified' }}
                            </h3>
                            <p
                              class="text-xs text-fuchsia-700 font-medium mt-0.5 truncate flex items-center gap-1.5"
                              :title="supplier.supplierTitle"
                            >
                              <UIcon name="i-lucide-tag" class="size-3.5 shrink-0 text-fuchsia-500" />
                              <span class="truncate">{{ supplier.supplierTitle }}</span>
                            </p>
                          </div>

                          <!-- Replace trash button with edit button in top right -->
                          <div class="flex items-center gap-1 shrink-0">
                            <UButton
                              icon="i-lucide-pencil"
                              color="fuchsia"
                              variant="soft"
                              size="xs"
                              aria-label="Edit supplier"
                              @click="openSupplierModal(supplier, 'edit')"
                            />
                          </div>
                        </div>

                        <!-- Additional Details: Balances, Contract, Permit -->
                        <div class="mt-3 pt-3 border-t border-bread-100 space-y-2.5">
                          <!-- Financial Overview (Total & Paid) -->
                          <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="bg-bread-50/70 rounded-lg p-2 border border-bread-100/70">
                              <span class="text-[10px] text-muted font-sans font-medium uppercase tracking-wider block">Total Budget</span>
                              <span class="font-bold text-highlighted text-xs sm:text-sm block truncate mt-0.5">
                                {{ formatCurrency(supplierDrafts[supplier._id]?.totalBalance ?? supplier.totalBalance) }}
                              </span>
                            </div>
                            <div class="bg-bread-50/70 rounded-lg p-2 border border-bread-100/70">
                              <span class="text-[10px] text-muted font-sans font-medium uppercase tracking-wider block">Paid</span>
                              <span class="font-bold text-emerald-700 text-xs sm:text-sm block truncate mt-0.5">
                                {{ formatCurrency(supplierDrafts[supplier._id]?.settledBalance ?? supplier.settledBalance) }}
                              </span>
                            </div>
                          </div>

                          <!-- Badges: Contract & Permit -->
                          <div class="flex flex-wrap items-center gap-1.5">
                            <UBadge
                              :color="getContractBadgeColor(supplierDrafts[supplier._id]?.contract ?? supplier.contract)"
                              variant="subtle"
                              size="xs"
                              class="font-sans"
                            >
                              <UIcon name="i-lucide-file-text" class="size-3 mr-1" />
                              Contract: {{ supplierDrafts[supplier._id]?.contract ?? supplier.contract ?? 'N/A' }}
                            </UBadge>
                            <UBadge
                              :color="getPermitBadgeColor(supplierDrafts[supplier._id]?.permit ?? supplier.permit)"
                              variant="subtle"
                              size="xs"
                              class="font-sans"
                            >
                              <UIcon name="i-lucide-shield-check" class="size-3 mr-1" />
                              Permit: {{ supplierDrafts[supplier._id]?.permit ?? supplier.permit ?? 'N/A' }}
                            </UBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </section>
            </template>
          </div>

          <!-- ================= TAB 2: NO ASSIGNMENT ================= -->
          <div v-else class="space-y-8">
            <!-- Empty state for No Assignment tab -->
            <div
              v-if="notSavedSuppliers.length === 0"
              class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bread-200 bg-white/70 px-6 py-14 text-center"
            >
              <div class="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <UIcon name="i-lucide-check-circle-2" class="size-6" />
              </div>
              <p class="text-base font-semibold text-highlighted">All template suppliers assigned!</p>
              <p class="mt-1 max-w-sm text-sm text-muted">
                Great job! All of your checklist suppliers are now assigned. You can always add custom suppliers anytime.
              </p>
              <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
                <UButton
                  color="fuchsia"
                  variant="subtle"
                  icon="i-lucide-bookmark-check"
                  @click="activeTab = 'assigned'"
                >
                  View Assigned Suppliers
                </UButton>
                <UButton
                  v-if="!mutationsDisabled"
                  color="fuchsia"
                  icon="i-lucide-plus"
                  :disabled="isSubmitting"
                  @click="openAddSupplierModal"
                >
                  Add Custom Supplier
                </UButton>
              </div>
            </div>

            <!-- Categories with "Add [[supplier type]]" button & compact action cards -->
            <template v-else>
              <section
                v-for="section in notSavedCategories"
                :key="section.supplierType"
                class="space-y-4"
              >
                <!-- Category Header with Clean "Add [[supplier type]]" Button -->
                <div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-bread-200/70">
                  <div class="flex items-center gap-2.5">
                    <h2 class="text-xl font-bold font-serif text-highlighted">
                      {{ section.supplierType }}
                    </h2>
                    <UBadge color="neutral" variant="subtle" size="xs">
                      {{ section.suppliers.length }} to assign
                    </UBadge>
                  </div>

                  <!-- Prompt requirement: Every category should have "add [[supplier type]]" buttons -->
                  <UButton
                    icon="i-lucide-plus"
                    color="fuchsia"
                    variant="subtle"
                    size="sm"
                    :disabled="mutationsDisabled || isSubmitting"
                    @click="openAddSupplierModalForType(section.supplierType)"
                  >
                    Add {{ section.supplierType }} Supplier
                  </UButton>
                </div>

                <!-- 3-Column Grid of Clean Items (Opens Modal on Add Details) -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <template v-for="supplier in section.suppliers" :key="supplier._id">
                    <div
                      class="group p-4 rounded-xl border border-bread-200/90 bg-white hover:border-fuchsia-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-left"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <h3
                            class="text-sm font-semibold text-highlighted group-hover:text-fuchsia-700 transition-colors truncate"
                            :title="supplier.supplierTitle"
                          >
                            {{ supplier.supplierTitle }}
                          </h3>
                          <p class="text-xs text-muted mt-0.5 truncate">
                            {{ supplier.supplierType }}
                          </p>
                        </div>
                      </div>

                      <div class="flex items-center justify-between pt-2 border-t border-bread-100">
                        <span class="text-[11px] text-muted font-sans">No assignment</span>
                        <UButton
                          size="xs"
                          color="fuchsia"
                          variant="soft"
                          icon="i-lucide-plus"
                          @click="openSupplierModal(supplier, 'assign')"
                        >
                          Add Details
                        </UButton>
                      </div>
                    </div>
                  </template>
                </div>
              </section>
            </template>
          </div>
        </div>
      </div>
    </main>

    <!-- Supplier Details & Edit Modal (for both Add Details and Editing) -->
    <UModal
      v-model:open="isSupplierModalOpen"
      :title="modalMode === 'assign' ? `Assign ${selectedSupplierForModal?.supplierTitle}` : `Edit ${selectedSupplierForModal?.supplierTitle}`"
      :ui="supplierModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div v-if="selectedSupplierForModal && supplierDrafts[selectedSupplierForModal._id]" class="space-y-4">
          <div class="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <UFormField label="Category" :name="`${selectedSupplierForModal._id}-modal-type`">
              <USelect
                v-model="supplierDrafts[selectedSupplierForModal._id]!.supplierType"
                :items="supplierTypeSelectItems"
                class="w-full"
                :disabled="mutationsDisabled || isSubmitting"
              />
            </UFormField>

            <UFormField label="Vendor name" :name="`${selectedSupplierForModal._id}-modal-vendor`">
              <UInput
                v-model="supplierDrafts[selectedSupplierForModal._id]!.vendorName"
                class="w-full"
                placeholder="Company or vendor name"
                :disabled="mutationsDisabled || isSubmitting"
              />
            </UFormField>

            <UFormField label="Contract" :name="`${selectedSupplierForModal._id}-modal-contract`">
              <USelect
                v-model="supplierDrafts[selectedSupplierForModal._id]!.contract"
                :items="contractSelectItems"
                class="w-full"
                :disabled="mutationsDisabled || isSubmitting"
              />
            </UFormField>

            <UFormField label="Permit" :name="`${selectedSupplierForModal._id}-modal-permit`">
              <USelect
                v-model="supplierDrafts[selectedSupplierForModal._id]!.permit"
                :items="permitSelectItems"
                class="w-full"
                :disabled="mutationsDisabled || isSubmitting"
              />
            </UFormField>

            <UFormField label="Total balance" :name="`${selectedSupplierForModal._id}-modal-total`">
              <UInput
                v-model.number="supplierDrafts[selectedSupplierForModal._id]!.totalBalance"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
                :disabled="mutationsDisabled || isSubmitting"
              />
            </UFormField>

            <UFormField label="Settled balance" :name="`${selectedSupplierForModal._id}-modal-settled`">
              <UInput
                v-model.number="supplierDrafts[selectedSupplierForModal._id]!.settledBalance"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
                :disabled="mutationsDisabled || isSubmitting"
              />
            </UFormField>
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-bread-100">
            <div>
              <UButton
                v-if="modalMode === 'edit'"
                label="Delete Supplier"
                color="error"
                variant="ghost"
                size="sm"
                icon="i-lucide-trash-2"
                :disabled="mutationsDisabled || isSubmitting"
                @click="() => { const s = selectedSupplierForModal; isSupplierModalOpen = false; if (s) openDeleteModal(s); }"
              />
            </div>
            <div class="flex items-center gap-2 ml-auto">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                :disabled="isSubmitting"
                @click="() => { isSupplierModalOpen = false }"
              />
              <UButton
                :label="modalMode === 'assign' ? 'Save & Assign' : 'Save Changes'"
                color="fuchsia"
                :loading="isSavingSupplier(selectedSupplierForModal._id)"
                :disabled="mutationsDisabled || isSubmitting"
                @click="handleSaveSupplierModal"
              />
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Remove Supplier Modal -->
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

    <!-- Add Supplier Modal -->
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
  </div>
</template>
