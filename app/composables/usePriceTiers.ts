import type { PriceTierRecord, PriceTiersListResponse } from '~/types/priceTier'

export const PACKAGE_SLUG_TO_TIER_CODE: Record<string, string> = {
  bread: 'BREAD',
  butter: 'BUTTER',
  'bread-butter': 'BREAD_BUTTER',
}

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

  async function resolvePriceTierId(packageSlug: string): Promise<string> {
    const tierCode = PACKAGE_SLUG_TO_TIER_CODE[packageSlug]
    if (!tierCode) {
      throw new Error(`Unknown package: ${packageSlug}`)
    }

    const tiers = await fetchAvailablePriceTiers()
    const match = tiers.find((tier) => tier.code === tierCode && tier.isEnabled !== false)
    if (!match?._id) {
      throw new Error(`Price tier "${tierCode}" is not available. Please try again later.`)
    }

    return match._id
  }

  return { fetchAvailablePriceTiers, cachedPriceTiers, resolvePriceTierId, PACKAGE_SLUG_TO_TIER_CODE }
}
