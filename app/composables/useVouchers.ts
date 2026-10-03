import type {
  VoucherPayload,
  VoucherResponse,
  VoucherValidateResponse,
  VouchersListResponse
} from '~/types/voucher'
import { PACKAGE_SLUG_TO_TIER_CODE } from '~/composables/usePriceTiers'
import { normalizeVoucherCode } from '~/utils/referralCode'
import { VOUCHER_CREATE_REASONS, VOUCHER_REDEEM_REASONS, capture, matchReason, tracked } from '~/utils/analytics'

const mockVouchers = [
  {
    _id: 'mock-voucher-1',
    code: 'BLINK5',
    discountAmountPhp: 1000,
    discountPercent: 10,
    maxUses: 20,
    expiresAt: null,
    isActive: true,
    useCount: 5,
    createdAt: new Date().toISOString()
  }
]

export function useVouchers() {
  const { apiRequest, loadPageData, isUiOnlyMode } = useApiMode()

  async function listVouchers(): Promise<VouchersListResponse> {
    return loadPageData({
      mock: () => ({ success: true, status: 200, vouchers: mockVouchers }),
      fetch: () => apiRequest<VouchersListResponse>('/partner/vouchers')
    })
  }

  async function validateVoucherForUser(
    code: string,
    packageSlug = 'bread-butter'
  ): Promise<VoucherValidateResponse> {
    const normalized = normalizeVoucherCode(code)
    const priceTierCode = PACKAGE_SLUG_TO_TIER_CODE[packageSlug] || 'BREAD_BUTTER'

    if (isUiOnlyMode.value) {
      if (normalized === 'BLINK5' || normalized === 'VALID') {
        return {
          success: true,
          status: 200,
          message: 'Voucher is valid.',
          code: normalized,
          discountAmountPhp: 1000,
          discountPercent: 10,
        }
      }
      return Promise.reject({
        data: { message: 'Voucher not found.' },
        statusCode: 404
      })
    }

    try {
      return await apiRequest<VoucherValidateResponse>('/user/vouchers/validate', {
        method: 'POST',
        body: { code: normalized, priceTierCode }
      })
    } catch (error) {
      const reason = matchReason(error, VOUCHER_REDEEM_REASONS)
      if (reason) capture('voucher_redeem_rejected', { role: 'user', reason })
      throw error
    }
  }

  async function createVoucher(payload: VoucherPayload): Promise<VoucherResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Voucher created successfully.',
        voucher: {
          _id: `mock-${Date.now()}`,
          ...payload,
          isActive: true,
          useCount: 0,
          createdAt: new Date().toISOString()
        }
      }
    }

    return tracked('partner', () => apiRequest<VoucherResponse>('/partner/vouchers', {
      method: 'POST',
      body: payload
    }), {
      event: 'voucher_created',
      props: {
        has_expiry: Boolean(payload.expiresAt),
        has_max_uses: typeof payload.maxUses === 'number',
      },
    }, {
      event: 'voucher_create_rejected',
      reasons: VOUCHER_CREATE_REASONS,
    })
  }

  async function updateVoucher(voucherId: string, payload: VoucherPayload): Promise<VoucherResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Voucher updated successfully.',
        voucher: {
          _id: voucherId,
          ...payload,
          isActive: true,
          useCount: 0,
          updatedAt: new Date().toISOString()
        }
      }
    }

    return tracked('partner', () => apiRequest<VoucherResponse>(`/partner/vouchers/${voucherId}`, {
      method: 'PATCH',
      body: payload
    }), { event: 'voucher_updated' }, {
      event: 'voucher_create_rejected',
      reasons: VOUCHER_CREATE_REASONS,
    })
  }

  async function deactivateVoucher(voucherId: string): Promise<VoucherResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Voucher deactivated successfully.',
        voucher: {
          _id: voucherId,
          code: '',
          discountAmountPhp: 0,
          isActive: false
        }
      }
    }

    return tracked('partner', () => apiRequest<VoucherResponse>(`/partner/vouchers/${voucherId}/deactivate`, {
      method: 'PATCH'
    }), { event: 'voucher_deactivated' })
  }

  async function reactivateVoucher(voucherId: string): Promise<VoucherResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Voucher reactivated successfully.',
        voucher: {
          _id: voucherId,
          code: '',
          discountAmountPhp: 0,
          isActive: true
        }
      }
    }

    return tracked('partner', () => apiRequest<VoucherResponse>(`/partner/vouchers/${voucherId}/reactivate`, {
      method: 'PATCH'
    }), { event: 'voucher_reactivated' })
  }

  async function deleteVoucher(voucherId: string): Promise<{ success: boolean; status?: number; message: string }> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Voucher deleted successfully.'
      }
    }

    return tracked('partner', () => apiRequest<{ success: boolean; status?: number; message: string }>(`/partner/vouchers/${voucherId}`, {
      method: 'DELETE'
    }), { event: 'voucher_deleted' })
  }

  return {
    listVouchers,
    validateVoucherForUser,
    createVoucher,
    updateVoucher,
    deactivateVoucher,
    reactivateVoucher,
    deleteVoucher
  }
}
