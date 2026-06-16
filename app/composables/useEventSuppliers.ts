import type {
  CreateSupplierPayload,
  DeleteSupplierResponse,
  SupplierRecord,
  SupplierResponse,
  SupplierSummary,
  SupplierSummaryResponse,
  SuppliersByEventResponse,
  UpdateSupplierPayload,
} from '~/types/supplier'
import { computeSupplierSummary } from '~/types/supplier'
import suppliersSeed from '~/data/suppliers.json'

type SupplierSeedEntry = {
  supplierType: SupplierRecord['supplierType']
  supplierTitle: string
}

let mockSuppliers: SupplierRecord[] = []

function buildMockSuppliers(eventId: string): SupplierRecord[] {
  return (suppliersSeed as SupplierSeedEntry[]).map((entry, index) => ({
    _id: `mock-supplier-${index}`,
    event: eventId,
    supplierType: entry.supplierType,
    supplierTitle: entry.supplierTitle,
    vendorName: '',
    totalBalance: 0,
    settledBalance: 0,
    contract: 'N/A',
    permit: 'N/A',
  }))
}

function ensureMockSuppliers(eventId: string): SupplierRecord[] {
  if (mockSuppliers.length === 0 || mockSuppliers[0]?.event !== eventId) {
    mockSuppliers = buildMockSuppliers(eventId)
  }
  return mockSuppliers
}

export function useEventSuppliers() {
  const { apiRequest, executeAction } = useApiMode()

  const isLoading = ref(false)
  const isSubmitting = ref(false)

  async function fetchSuppliers(eventId: string) {
    isLoading.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<SuppliersByEventResponse>(`/user/suppliers/event/${eventId}`),
        uiOnly: () => ({
          success: true,
          status: 200,
          suppliers: ensureMockSuppliers(eventId),
        }),
      })
    } finally {
      isLoading.value = false
    }
  }

  async function fetchSupplierSummary(eventId: string) {
    isLoading.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<SupplierSummaryResponse>(`/user/suppliers/event/${eventId}/summary`),
        uiOnly: () => ({
          success: true,
          status: 200,
          summary: computeSupplierSummary(ensureMockSuppliers(eventId)),
        }),
      })
    } finally {
      isLoading.value = false
    }
  }

  async function createSupplier(eventId: string, payload: CreateSupplierPayload) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<SupplierResponse>('/user/suppliers', {
            method: 'POST',
            body: { eventId, ...payload },
          }),
        uiOnly: () => {
          const supplier: SupplierRecord = {
            _id: `mock-supplier-${Date.now()}`,
            event: eventId,
            supplierType: payload.supplierType,
            supplierTitle: payload.supplierTitle.trim(),
            vendorName: payload.vendorName?.trim() ?? '',
            totalBalance: payload.totalBalance ?? 0,
            settledBalance: 0,
            contract: payload.contract ?? 'N/A',
            permit: payload.permit ?? 'N/A',
          }
          mockSuppliers.push(supplier)
          return {
            success: true,
            status: 201,
            message: 'Supplier created successfully.',
            supplier,
          }
        },
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateSupplier(supplierId: string, payload: UpdateSupplierPayload) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<SupplierResponse>(`/user/suppliers/${supplierId}`, {
            method: 'PATCH',
            body: payload,
          }),
        uiOnly: () => {
          const index = mockSuppliers.findIndex((item) => item._id === supplierId)
          if (index === -1) {
            throw new Error('Supplier not found.')
          }
          const current = mockSuppliers[index]!
          const updated: SupplierRecord = {
            ...current,
            ...(payload.supplierType !== undefined ? { supplierType: payload.supplierType } : {}),
            ...(payload.vendorName !== undefined ? { vendorName: payload.vendorName } : {}),
            ...(payload.totalBalance !== undefined ? { totalBalance: payload.totalBalance } : {}),
            ...(payload.settledBalance !== undefined
              ? { settledBalance: payload.settledBalance }
              : {}),
            ...(payload.contract !== undefined ? { contract: payload.contract } : {}),
            ...(payload.permit !== undefined ? { permit: payload.permit } : {}),
          }
          mockSuppliers[index] = updated
          return {
            success: true,
            status: 200,
            message: 'Supplier updated successfully.',
            supplier: updated,
          }
        },
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteSupplier(supplierId: string) {
    isSubmitting.value = true
    try {
      return await executeAction({
        api: () =>
          apiRequest<DeleteSupplierResponse>(`/user/suppliers/${supplierId}`, {
            method: 'DELETE',
          }),
        uiOnly: () => {
          mockSuppliers = mockSuppliers.filter((item) => item._id !== supplierId)
          return {
            success: true,
            status: 200,
            message: 'Supplier deleted successfully.',
          }
        },
      })
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isLoading,
    isSubmitting,
    fetchSuppliers,
    fetchSupplierSummary,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  }
}
