import type { PriceTierRecord, PriceTiersListResponse } from '~/types/priceTier'

export function usePriceTiers() {
  const { apiRequest, isUiOnlyMode } = useApiMode()
  const cachedPriceTiers = useState<PriceTierRecord[]>('app-cached-price-tiers', () => [])

  async function fetchAvailablePriceTiers(): Promise<PriceTierRecord[]> {
    if (cachedPriceTiers.value.length > 0) {
      return cachedPriceTiers.value
    }

    if (isUiOnlyMode.value) {
      const mock = [
        { _id: 'mock-bread', code: 'BREAD', name: 'Bread', pricePhp: 5000, isEnabled: true },
        { _id: 'mock-butter', code: 'BUTTER', name: 'Butter', pricePhp: 7000, isEnabled: true },
        { _id: 'mock-bread-butter', code: 'BREAD_BUTTER', name: 'Bread + Butter', pricePhp: 10000, isEnabled: true }
      ]
      cachedPriceTiers.value = mock
      return mock
    }

    try {
      const response = await apiRequest<PriceTiersListResponse>('/user/price-tiers')
      if (response?.tiers) {
        cachedPriceTiers.value = response.tiers
        return response.tiers
      }
    } catch {
      // Fallback
    }

    return cachedPriceTiers.value
  }

  return { fetchAvailablePriceTiers, cachedPriceTiers }
}
