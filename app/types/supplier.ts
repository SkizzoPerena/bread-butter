export type SupplierType =
  | 'Prenuptial Shoot'
  | 'Preparation'
  | 'Ceremony'
  | 'Cocktail'
  | 'Reception'
  | 'After Party'
  | 'Uncategorized'

export type ContractStatus = 'Received' | 'Unsigned' | 'Signed' | 'N/A'

export type PermitStatus = 'Shared' | 'Submitted' | 'N/A'

export const SUPPLIER_TYPE_ORDER: SupplierType[] = [
  'Prenuptial Shoot',
  'Preparation',
  'Ceremony',
  'Cocktail',
  'Reception',
  'After Party',
  'Uncategorized',
]

export const CONTRACT_STATUS_OPTIONS: ContractStatus[] = [
  'Received',
  'Unsigned',
  'Signed',
  'N/A',
]

export const PERMIT_STATUS_OPTIONS: PermitStatus[] = ['Shared', 'Submitted', 'N/A']

export interface SupplierRecord {
  _id: string
  event: string
  supplierType: SupplierType
  supplierTitle: string
  vendorName: string
  totalBalance: number
  settledBalance: number
  contract: ContractStatus
  permit: PermitStatus
}

export interface SuppliersByEventResponse {
  success: boolean
  status: number
  suppliers: SupplierRecord[]
}

export interface SupplierSummary {
  totalBudget: number
  totalRemaining: number
  totalPaid: number
  supplierCount: number
}

export interface SupplierSummaryResponse {
  success: boolean
  status: number
  summary: SupplierSummary
}

export interface UpdateSupplierPayload {
  supplierType?: SupplierType
  vendorName?: string
  totalBalance?: number
  settledBalance?: number
  contract?: ContractStatus
  permit?: PermitStatus
}

export interface CreateSupplierPayload {
  supplierType: SupplierType
  supplierTitle: string
  vendorName?: string
  totalBalance?: number
  contract?: ContractStatus
  permit?: PermitStatus
}

export interface SupplierResponse {
  success: boolean
  status: number
  message: string
  supplier: SupplierRecord
}

export interface DeleteSupplierResponse {
  success: boolean
  status: number
  message: string
}

export interface GroupedSupplierSection {
  supplierType: SupplierType
  suppliers: SupplierRecord[]
}

export function groupSuppliersByType(suppliers: SupplierRecord[]): GroupedSupplierSection[] {
  const grouped = new Map<SupplierType, SupplierRecord[]>()

  for (const type of SUPPLIER_TYPE_ORDER) {
    grouped.set(type, [])
  }

  for (const supplier of suppliers) {
    const list = grouped.get(supplier.supplierType)
    if (list) {
      list.push(supplier)
    }
  }

  return SUPPLIER_TYPE_ORDER.map((supplierType) => ({
    supplierType,
    suppliers: grouped.get(supplierType) ?? [],
  })).filter((section) => section.suppliers.length > 0)
}

export function formatCurrency(amount: number): string {
  return `Php ${amount.toLocaleString()}`
}

export function computeSupplierSummary(suppliers: SupplierRecord[]): SupplierSummary {
  let totalBudget = 0
  let totalPaid = 0

  for (const supplier of suppliers) {
    totalBudget += supplier.totalBalance ?? 0
    totalPaid += supplier.settledBalance ?? 0
  }

  return {
    totalBudget,
    totalPaid,
    totalRemaining: totalBudget - totalPaid,
    supplierCount: suppliers.length,
  }
}
