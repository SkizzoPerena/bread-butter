import type { CashoutRequestPayload, CashoutResponse, CashoutsListResponse } from '~/types/cashout'
import { CASHOUT_REASONS, tracked } from '~/utils/analytics'

const mockCashouts = [
  {
    _id: 'mock-cashout-1',
    amountPhp: 15000,
    paymentMethod: 'BANK_TRANSFER',
    status: 'PENDING' as const,
    createdAt: new Date().toISOString()
  }
]

export function useCashouts() {
  const { apiRequest, loadPageData, isUiOnlyMode } = useApiMode()

  async function listCashouts(): Promise<CashoutsListResponse> {
    return loadPageData({
      mock: () => ({ success: true, status: 200, cashouts: mockCashouts }),
      fetch: () => apiRequest<CashoutsListResponse>('/partner/cashouts')
    })
  }

  async function requestCashout(payload: CashoutRequestPayload): Promise<CashoutResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Cashout requested successfully.',
        cashout: {
          _id: `mock-${Date.now()}`,
          amountPhp: payload.amountPhp,
          paymentMethod: payload.paymentMethod || 'BANK_TRANSFER',
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
      }
    }

    return tracked('partner', () => apiRequest<CashoutResponse>('/partner/cashouts', {
      method: 'POST',
      body: payload
    }), { event: 'cashout_requested' }, {
      event: 'cashout_request_rejected',
      reasons: CASHOUT_REASONS,
    })
  }

  async function getAvailableBalance(): Promise<number> {
    const response = await loadPageData({
      mock: () => ({ success: true, account: { partnerCreditPhp: 125500 } }),
      fetch: () => apiRequest<{ success: boolean; account: { partnerCreditPhp?: number } }>('/partner/account')
    })

    return response.account?.partnerCreditPhp ?? 0
  }

  return {
    listCashouts,
    requestCashout,
    getAvailableBalance
  }
}
