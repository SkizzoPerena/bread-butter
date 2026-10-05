import type { PriceTierRecord, PriceTiersListResponse } from '~/types/priceTier'

export const PACKAGE_SLUG_TO_TIER_CODE: Record<string, string> = {
  bread: 'BREAD',
  butter: 'BUTTER',
  'bread-butter': 'BREAD_BUTTER',
}

const TIER_CODE_TO_PACKAGE_SLUG: Record<string, 'bread' | 'butter' | 'bread-butter'> = {
  BREAD: 'bread',
  BUTTER: 'butter',
  BREAD_BUTTER: 'bread-butter',
}

/** Accepts checkout slugs, tier codes, and display names such as "Bread + Butter". */
export function resolvePackageTierCode(packageValue: string): string | null {
  const raw = packageValue.trim()
  if (!raw) return null

  const slug = PACKAGE_SLUG_TO_TIER_CODE[raw.toLowerCase()]
  if (slug) return slug

  const compact = raw.toLowerCase().replace(/[\s_+-]+/g, '')
  if (compact === 'breadbutter') return 'BREAD_BUTTER'
  if (compact === 'bread') return 'BREAD'
  if (compact === 'butter') return 'BUTTER'

  const code = raw.toUpperCase().replace(/[\s\-_+]+/g, '_')
  if (code === 'BREAD' || code === 'BUTTER' || code === 'BREAD_BUTTER') return code
  return null
}

export function resolvePackageSlug(packageValue: string): 'bread' | 'butter' | 'bread-butter' | null {
  const code = resolvePackageTierCode(packageValue)
  if (!code) return null
  return TIER_CODE_TO_PACKAGE_SLUG[code] ?? null
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
    const tierCode = resolvePackageTierCode(packageSlug)
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
