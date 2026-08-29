import type {
  EmailCreditPackagesResponse,
  SubmitEmailCreditPayload,
  SubmitTierUpgradePayload,
  TierUpgradeOptionsResponse,
  UpgradePaymentMessageResponse,
} from '~/types/upgrade'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'

export function useUpgrade() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  async function getTierUpgradeOptions(eventId: string): Promise<TierUpgradeOptionsResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        eventFullyPaid: true,
        hasPendingUpgrade: false,
        pendingUpgrade: null,
        currentTier: {
          tierId: 'mock-bread-id',
          name: 'Bread',
          code: 'BREAD',
          pricePhp: 5000,
          emailAllocation: 100,
        },
        allPlans: [
          {
            tierId: 'mock-bread-id',
            name: 'Bread',
            code: 'BREAD',
            pricePhp: 5000,
            emailAllocation: 100,
            isEnabled: true,
            status: 'current',
            eligible: false,
            reason: 'This is your current plan.',
            priceDifferencePhp: null,
            emailCreditsDelta: 0,
            paymentSummary: null,
          },
          {
            tierId: 'mock-butter-id',
            name: 'Butter',
            code: 'BUTTER',
            pricePhp: 7500,
            emailAllocation: 250,
            isEnabled: true,
            status: 'available',
            eligible: true,
            reason: null,
            priceDifferencePhp: 2500,
            emailCreditsDelta: 150,
            paymentSummary: {
              requiredAmount: 2500,
              totalReceived: 0,
              balanceDue: 2500,
              isFullyPaid: false,
            },
          },
          {
            tierId: 'mock-bread-butter-id',
            name: 'Bread + Butter',
            code: 'BREAD_BUTTER',
            pricePhp: 10000,
            emailAllocation: 250,
            isEnabled: true,
            status: 'available',
            eligible: true,
            reason: null,
            priceDifferencePhp: 5000,
            emailCreditsDelta: 150,
            paymentSummary: {
              requiredAmount: 5000,
              totalReceived: 0,
              balanceDue: 5000,
              isFullyPaid: false,
            },
          },
        ],
        upgrades: [
          {
            targetTierId: 'mock-butter-id',
            name: 'Butter',
            code: 'BUTTER',
            pricePhp: 7500,
            priceDifferencePhp: 2500,
            emailCreditsDelta: 150,
            paymentSummary: {
              requiredAmount: 2500,
              totalReceived: 0,
              balanceDue: 2500,
              isFullyPaid: false,
            },
          },
          {
            targetTierId: 'mock-bread-butter-id',
            name: 'Bread + Butter',
            code: 'BREAD_BUTTER',
            pricePhp: 10000,
            priceDifferencePhp: 5000,
            emailCreditsDelta: 150,
            paymentSummary: {
              requiredAmount: 5000,
              totalReceived: 0,
              balanceDue: 5000,
              isFullyPaid: false,
            },
          },
        ],
      }
    }

    return apiRequest<TierUpgradeOptionsResponse>(
      `/user/events/${eventId}/tier-upgrade-options`,
    )
  }

  async function submitTierUpgradePayment(
    eventId: string,
    payload: SubmitTierUpgradePayload,
  ): Promise<UpgradePaymentMessageResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Tier upgrade payment proof submitted successfully.',
        payment: {
          _id: 'mock-upgrade-payment',
          type: 'TIER_UPGRADE',
          amount: 2500,
          transactionId: payload.transactionId,
          proofOfPaymentURL: demoCoverImage,
          status: 'PENDING',
        },
      }
    }

    const formData = new FormData()
    formData.append('targetTierId', payload.targetTierId)
    formData.append('transactionId', payload.transactionId.trim())
    formData.append('paymentMethod', payload.paymentMethod.trim())
    formData.append('proofOfPayment', payload.proofOfPayment)

    return apiUpload<UpgradePaymentMessageResponse>(
      `/user/events/${eventId}/tier-upgrade/payment-proof`,
      formData,
    )
  }

  async function getEmailCreditPackages(): Promise<EmailCreditPackagesResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        packages: [
          { _id: 'mock-pack-100', name: '100 Emails', emailCredits: 100, pricePhp: 500, isEnabled: true },
          { _id: 'mock-pack-250', name: '250 Emails', emailCredits: 250, pricePhp: 1000, isEnabled: true },
        ],
      }
    }

    return apiRequest<EmailCreditPackagesResponse>('/user/email-credit-packages')
  }

  async function submitEmailCreditPayment(
    eventId: string,
    payload: SubmitEmailCreditPayload,
  ): Promise<UpgradePaymentMessageResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Email credit upgrade payment proof submitted successfully.',
        payment: {
          _id: 'mock-email-credit-payment',
          type: 'EMAIL_CREDIT_PURCHASE',
          amount: 500,
          transactionId: payload.transactionId,
          proofOfPaymentURL: demoCoverImage,
          status: 'PENDING',
        },
      }
    }

    const formData = new FormData()
    formData.append('emailCreditPackageId', payload.emailCreditPackageId)
    formData.append('transactionId', payload.transactionId.trim())
    formData.append('paymentMethod', payload.paymentMethod.trim())
    formData.append('proofOfPayment', payload.proofOfPayment)

    return apiUpload<UpgradePaymentMessageResponse>(
      `/user/events/${eventId}/email-credits/payment-proof`,
      formData,
    )
  }

  return {
    getTierUpgradeOptions,
    submitTierUpgradePayment,
    getEmailCreditPackages,
    submitEmailCreditPayment,
  }
}
