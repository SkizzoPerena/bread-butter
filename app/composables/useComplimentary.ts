import type {
  ComplimentaryGrantRecord,
  ComplimentaryGrantsResponse,
  ComplimentaryProduct,
  RedeemCodeResponse
} from '~/types/complimentary'

const mockGrants: ComplimentaryGrantRecord[] = [
  {
    _id: 'mock-grant-event',
    product: 'EVENT',
    priceTier: { _id: 'mock-tier-bread-butter', name: 'Bread + Butter', code: 'BREAD_BUTTER', pricePhp: 10000 },
    jamPackage: null,
    packageName: 'Bread + Butter',
    source: 'CODE',
    status: 'AVAILABLE',
    currentPricePhp: 10000,
    createdAt: new Date().toISOString()
  }
]

/** The user's free events and Jams, and redeeming a code for one. */
export function useComplimentary() {
  const { apiRequest, loadPageData, isUiOnlyMode } = useApiMode()
  // Shared, so a code redeemed on one page shows straight away on the others.
  const grants = useState<ComplimentaryGrantRecord[]>('complimentary-grants', () => [])
  const loaded = useState<boolean>('complimentary-grants-loaded', () => false)

  async function loadGrants(): Promise<ComplimentaryGrantRecord[]> {
    try {
      const response = await loadPageData<ComplimentaryGrantsResponse>({
        mock: () => ({ success: true, status: 200, grants: mockGrants }),
        fetch: () => apiRequest<ComplimentaryGrantsResponse>('/user/complimentary/grants')
      })
      grants.value = response.grants ?? []
    } catch {
      // A missing list only hides the free credits. Paying still works.
      grants.value = []
    }
    loaded.value = true
    return grants.value
  }

  async function redeemCode(code: string): Promise<RedeemCodeResponse> {
    const normalized = code.trim().toUpperCase()
    if (isUiOnlyMode.value) {
      const grant: ComplimentaryGrantRecord = { ...mockGrants[0]!, _id: `mock-${Date.now()}` }
      grants.value = [...grants.value, grant]
      return { success: true, status: 201, message: `You've got a free ${grant.packageName} event.`, grant }
    }
    const response = await apiRequest<RedeemCodeResponse>('/user/redemption-codes/redeem', {
      method: 'POST',
      body: { code: normalized }
    })
    grants.value = [...grants.value.filter(item => item._id !== response.grant._id), response.grant]
    return response
  }

  function grantsFor(product: ComplimentaryProduct) {
    return grants.value.filter(item => item.product === product && item.status === 'AVAILABLE')
  }

  function findGrant(grantId: string | null | undefined): ComplimentaryGrantRecord | null {
    if (!grantId) return null
    return grants.value.find(item => item._id === grantId && item.status === 'AVAILABLE') ?? null
  }

  return { grants, loaded, loadGrants, redeemCode, grantsFor, findGrant }
}
