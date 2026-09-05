import type {
  VoucherPayload,
  VoucherResponse,
  VoucherValidateResponse,
  VouchersListResponse
} from '~/types/voucher'
import { PACKAGE_SLUG_TO_TIER_CODE } from '~/composables/usePriceTiers'
import { normalizeVoucherCode } from '~/utils/referralCode'

const mockVouchers = [
  {
    _id: 'mock-voucher-1',
    code: 'BLINK5',
    discountAmountPhp: 500,
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
          discountAmountPhp: 500
        }
      }
      return Promise.reject({
        data: { message: 'Voucher not found.' },
        statusCode: 404
      })
    }

    return apiRequest<VoucherValidateResponse>('/user/vouchers/validate', {
      method: 'POST',
      body: { code: normalized, priceTierCode }
    })
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

    return apiRequest<VoucherResponse>('/partner/vouchers', {
      method: 'POST',
      body: payload
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

    return apiRequest<VoucherResponse>(`/partner/vouchers/${voucherId}`, {
      method: 'PATCH',
      body: payload
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

    return apiRequest<VoucherResponse>(`/partner/vouchers/${voucherId}/deactivate`, {
      method: 'PATCH'
    })
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

    return apiRequest<VoucherResponse>(`/partner/vouchers/${voucherId}/reactivate`, {
      method: 'PATCH'
    })
  }

  async function deleteVoucher(voucherId: string): Promise<{ success: boolean; status?: number; message: string }> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        message: 'Voucher deleted successfully.'
      }
    }

    return apiRequest<{ success: boolean; status?: number; message: string }>(`/partner/vouchers/${voucherId}`, {
      method: 'DELETE'
    })
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
