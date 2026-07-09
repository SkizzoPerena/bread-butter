import type { PriceTierRecord, PriceTiersListResponse } from '~/types/priceTier'

export function usePriceTiers() {
  const { apiRequest, isUiOnlyMode } = useApiMode()

  async function fetchAvailablePriceTiers(): Promise<PriceTierRecord[]> {
    if (isUiOnlyMode.value) {
      return [
        { _id: 'mock-bread', code: 'BREAD', name: 'Bread', pricePhp: 5000, isEnabled: true },
        { _id: 'mock-butter', code: 'BUTTER', name: 'Butter', pricePhp: 7000, isEnabled: true },
        { _id: 'mock-bread-butter', code: 'BREAD_BUTTER', name: 'Bread + Butter', pricePhp: 10000, isEnabled: true }
      ]
    }

    const response = await apiRequest<PriceTiersListResponse>('/user/price-tiers')
    return response.tiers
  }

  return { fetchAvailablePriceTiers }
}
