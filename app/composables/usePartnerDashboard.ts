import type { UserAccount } from '~/types/auth'
import type { EventRecord } from '~/types/event'

interface PartnerDashboardVoucher {
  _id: string
  isActive?: boolean
  code?: string
  createdAt?: string
  useCount?: number
}

interface PartnerDashboardCashout {
  _id: string
  amountPhp: number
  status: string
  createdAt?: string
}

interface PartnerVouchersResponse {
  success: boolean
  vouchers: PartnerDashboardVoucher[]
}

interface PartnerCashoutsResponse {
  success: boolean
  cashouts: PartnerDashboardCashout[]
}

interface PartnerEventsResponse {
  success: boolean
  events: EventRecord[]
}

interface PartnerDashboardSummary {
  balancePhp: number
  activeVouchers: number
  pendingCashoutsPhp: number
  collaboratedEvents: number
  recentVouchers: PartnerDashboardVoucher[]
  recentCashouts: PartnerDashboardCashout[]
}

function buildMockSummary(): PartnerDashboardSummary {
  return {
    balancePhp: 125500,
    activeVouchers: 4,
    pendingCashoutsPhp: 15000,
    collaboratedEvents: 3,
    recentVouchers: [
      { _id: 'mock-voucher-1', code: 'BLINK5', isActive: true, useCount: 5, createdAt: new Date().toISOString() },
      { _id: 'mock-voucher-2', code: 'WED10', isActive: true, useCount: 2, createdAt: new Date(Date.now() - 86400000).toISOString() }
    ],
    recentCashouts: [
      { _id: 'mock-cashout-1', amountPhp: 15000, status: 'PENDING', createdAt: new Date().toISOString() }
    ]
  }
}

export function usePartnerDashboard() {
  const { loadPageData, apiRequest } = useApiMode()

  async function fetchDashboardSummary(): Promise<PartnerDashboardSummary> {
    return loadPageData({
      mock: () => buildMockSummary(),
      fetch: async () => {
        const [accountResponse, vouchersResponse, cashoutsResponse, eventsResponse] = await Promise.all([
          apiRequest<{ success: boolean; account: UserAccount }>('/partner/account'),
          apiRequest<PartnerVouchersResponse>('/partner/vouchers'),
          apiRequest<PartnerCashoutsResponse>('/partner/cashouts'),
          apiRequest<PartnerEventsResponse>('/partner/events')
        ])

        const vouchers = vouchersResponse.vouchers ?? []
        const cashouts = cashoutsResponse.cashouts ?? []
        const events = eventsResponse.events ?? []

        const pendingCashoutsPhp = cashouts
          .filter((cashout) => cashout.status === 'PENDING')
          .reduce((total, cashout) => total + (cashout.amountPhp || 0), 0)

        return {
          balancePhp: accountResponse.account?.partnerCreditPhp ?? 0,
          activeVouchers: vouchers.filter((voucher) => voucher.isActive !== false).length,
          pendingCashoutsPhp,
          collaboratedEvents: events.length,
          recentVouchers: vouchers
            .slice()
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 5),
          recentCashouts: cashouts
            .slice()
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 5)
        }
      }
    })
  }

  return {
    fetchDashboardSummary
  }
}
