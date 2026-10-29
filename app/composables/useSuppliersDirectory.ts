import { ref, computed } from 'vue'
import { getApiErrorMessage } from '~/types/auth'
import {
  SUPPLIERS_DIRECTORY_DATA,
  type SupplierCategory,
  type DirectorySupplier,
  type SupplierTier
} from '~/data/suppliersDirectory'

export interface DirectorySuppliersResponse {
  success?: boolean
  status?: number
  message?: string
  categories?: SupplierCategory[]
  suppliers?: DirectorySupplier[]
  data?: SupplierCategory[] | DirectorySupplier[] | { categories?: SupplierCategory[]; suppliers?: DirectorySupplier[] }
}

function cloneInitialDirectory(): SupplierCategory[] {
  return SUPPLIERS_DIRECTORY_DATA.map((cat) => ({
    ...cat,
    subcategories: cat.subcategories.map((sub) => ({
      ...sub,
      vendors: [...sub.vendors]
    }))
  }))
}

function emptyCategoryShells(): SupplierCategory[] {
  return SUPPLIERS_DIRECTORY_DATA.map((cat) => ({
    ...cat,
    subcategories: cat.subcategories.map((sub) => ({
      ...sub,
      vendors: []
    }))
  }))
}

export function useSuppliersDirectory() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  const suppliersData = ref<SupplierCategory[]>(cloneInitialDirectory())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isFetched = ref(false)

  const totalDirectorySuppliersCount = computed(() => {
    let count = 0
    for (const cat of suppliersData.value) {
      for (const sub of cat.subcategories) {
        count += sub.vendors.length
      }
    }
    return count
  })

  function normalizeSuppliersResponse(raw: unknown): SupplierCategory[] {
    if (!raw) return cloneInitialDirectory()

    // 1. If payload is directly an array
    if (Array.isArray(raw)) {
      if (raw.length === 0) return cloneInitialDirectory()
      // Check if it's an array of categories
      if (typeof raw[0] === 'object' && raw[0] !== null && 'subcategories' in raw[0]) {
        return raw as SupplierCategory[]
      }
      // Otherwise it's a flat list of suppliers
      return populateCategoriesFromFlatSuppliers(raw as DirectorySupplier[])
    }

    if (typeof raw !== 'object' || raw === null) {
      return cloneInitialDirectory()
    }

    const payload = raw as Record<string, unknown>

    // 2. If payload has categories array
    if (Array.isArray(payload.categories)) {
      return payload.categories as SupplierCategory[]
    }

    // 3. If payload has suppliers array
    if (Array.isArray(payload.suppliers)) {
      return populateCategoriesFromFlatSuppliers(payload.suppliers as DirectorySupplier[])
    }

    // 4. If payload has data wrapper
    if (payload.data) {
      if (Array.isArray(payload.data)) {
        if (payload.data.length > 0 && typeof payload.data[0] === 'object' && payload.data[0] !== null && 'subcategories' in payload.data[0]) {
          return payload.data as SupplierCategory[]
        }
        return populateCategoriesFromFlatSuppliers(payload.data as DirectorySupplier[])
      }
      if (typeof payload.data === 'object' && payload.data !== null) {
        const nestedData = payload.data as Record<string, unknown>
        if (Array.isArray(nestedData.categories)) {
          return nestedData.categories as SupplierCategory[]
        }
        if (Array.isArray(nestedData.suppliers)) {
          return populateCategoriesFromFlatSuppliers(nestedData.suppliers as DirectorySupplier[])
        }
      }
    }

    return cloneInitialDirectory()
  }

  function populateCategoriesFromFlatSuppliers(
    suppliers: DirectorySupplier[],
    template = cloneInitialDirectory()
  ): SupplierCategory[] {

    for (const rawSupplier of suppliers) {
      if (!rawSupplier || !rawSupplier.name) continue

      const tier: SupplierTier =
        rawSupplier.tier === 'bread-basket' || rawSupplier.tier === 'loaf' || rawSupplier.tier === 'slice'
          ? rawSupplier.tier
          : 'slice'

      const supplier: DirectorySupplier = {
        ...rawSupplier,
        tier
      }

      // Find matching category by id or title
      const targetCat = template.find(
        (c) =>
          (supplier.categoryId && c.id.toLowerCase() === supplier.categoryId.toLowerCase()) ||
          (supplier.categoryName && c.title.toLowerCase() === supplier.categoryName.toLowerCase())
      )

      if (targetCat) {
        // Find matching subcategory
        const targetSub = targetCat.subcategories.find(
          (s) =>
            supplier.subCategory &&
            s.title.toLowerCase() === supplier.subCategory.toLowerCase()
        )

        if (targetSub) {
          targetSub.vendors.push(supplier)
        } else if (targetCat.subcategories.length > 0) {
          targetCat.subcategories[0]?.vendors.push(supplier)
        }
      }
    }

    return template
  }

  async function fetchSuppliersDirectory(): Promise<SupplierCategory[]> {
    isLoading.value = true
    error.value = null

    if (isUiOnlyMode.value) {
      suppliersData.value = cloneInitialDirectory()
      isLoading.value = false
      isFetched.value = true
      return suppliersData.value
    }

    try {
      const response = await apiRequest<DirectorySuppliersResponse>('/public/suppliers', { authenticated: false })
      const suppliers = Array.isArray(response?.suppliers) ? response.suppliers : null
      suppliersData.value = suppliers
        ? populateCategoriesFromFlatSuppliers(suppliers, emptyCategoryShells())
        : normalizeSuppliersResponse(response)
      error.value = null
      isFetched.value = true
      return suppliersData.value
    } catch (err) {
      error.value = getApiErrorMessage(err, 'The supplier directory could not be loaded.')
      suppliersData.value = emptyCategoryShells()
      isFetched.value = true
      return suppliersData.value
    } finally {
      isLoading.value = false
    }
  }

  return {
    suppliersData,
    isLoading,
    error,
    isFetched,
    totalDirectorySuppliersCount,
    fetchSuppliersDirectory,
    refresh: fetchSuppliersDirectory
  }
}
