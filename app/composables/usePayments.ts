import type { EventRecord } from '~/types/event'
import type {
  CheckoutSessionResponse,
  EventPaymentsListResponse,
  PaymentMessageResponse,
  PaymentsListResponse,
  SubmitEventPaymentPayload
} from '~/types/payment'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'
import { ALREADY_PAID_REASONS, actorRole, tracked } from '~/utils/analytics'

export function usePayments() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  async function getMyPayments(page = 1, limit = 20): Promise<PaymentsListResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        payments: [],
        pagination: { page, limit, total: 0 }
      }
    }

    return apiRequest<PaymentsListResponse>('/user/payments', {
      query: { page, limit }
    })
  }

  async function getEventPayments(eventId: string): Promise<EventPaymentsListResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        payments: [],
      }
    }

    return apiRequest<EventPaymentsListResponse>(`/user/events/${eventId}/payments`)
  }

  async function submitEventPaymentProof(
    eventId: string,
    payload: SubmitEventPaymentPayload
  ): Promise<EventRecord> {
    if (isUiOnlyMode.value) {
      return {
        _id: eventId,
        eventType: 'WEDDING',
        eventName: 'Mock Event',
        description: '',
        venue: '',
        eventDate: new Date().toISOString(),
        status: 'ONGOING',
        latestPayment: {
          _id: 'mock-payment-id',
          type: 'EVENT_CREATION_FEE',
          amount: 10000,
          transactionId: payload.transactionId,
          proofOfPaymentURL: demoCoverImage,
          status: 'PENDING'
        }
      }
    }

    const formData = new FormData()
    formData.append('transactionId', payload.transactionId.trim())
    formData.append('paymentMethod', payload.paymentMethod.trim())
    formData.append(
      'proofOfPayment',
      payload.proofOfPayment,
      payload.proofOfPayment.name || 'payment-proof.png',
    )
    if (payload.provider) {
      formData.append('provider', String(payload.provider).trim())
    } else {
      formData.append('provider', 'MANUAL')
    }
    if (payload.type) {
      formData.append('type', String(payload.type).trim())
    } else {
      formData.append('type', 'EVENT_CREATION_FEE')
    }
    if (typeof payload.amount === 'number') {
      formData.append('amount', String(payload.amount))
    }
    if (typeof payload.convenienceFeePhp === 'number') {
      formData.append('convenienceFeePhp', String(payload.convenienceFeePhp))
    }

    const response = await tracked(actorRole(), () => apiUpload<PaymentMessageResponse>(
      `/user/events/${eventId}/payment-proof`,
      formData
    ), {
      event: 'payment_submitted',
      props: (value) => ({
        event_id: eventId,
        tier: value.event && typeof value.event.priceTier === 'object' && value.event.priceTier
          ? value.event.priceTier.code
          : undefined,
      }),
    }, {
      event: 'payment_submit_rejected',
      reasons: ALREADY_PAID_REASONS,
      props: { event_id: eventId },
    })

    if (response.event) {
      return response.event
    }

    return {
      _id: eventId,
      eventType: '',
      eventName: '',
      description: '',
      venue: '',
      eventDate: '',
      status: 'ONGOING',
      latestPayment: response.payment ?? null
    }
  }

  async function createEventFeeCheckoutSession(
    eventId: string,
    options?: { cancelPath?: string; idempotencyKey?: string },
  ): Promise<CheckoutSessionResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        checkoutUrl: '/user/payment/success?payment_id=mock-payment-id',
        checkoutId: 'cs_mock',
        paymentId: 'mock-payment-id',
      }
    }

    return apiRequest<CheckoutSessionResponse>(`/user/events/${eventId}/checkout-session`, {
      method: 'POST',
      body: {
        ...(options?.cancelPath ? { cancelPath: options.cancelPath } : {}),
      },
      headers: options?.idempotencyKey
        ? { 'Idempotency-Key': options.idempotencyKey }
        : undefined,
    })
  }

  async function getCheckoutStatus(checkoutId: string): Promise<CheckoutSessionResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 200,
        checkoutId,
        paymentId: checkoutId,
        payment: {
          _id: checkoutId,
          type: 'EVENT_CREATION_FEE',
          amount: 10000,
          transactionId: checkoutId,
          status: 'APPROVED',
          provider: 'PAYMONGO',
        },
      }
    }

    return apiRequest<CheckoutSessionResponse>(`/user/payments/checkout/${checkoutId}`)
  }

  return {
    getMyPayments,
    getEventPayments,
    submitEventPaymentProof,
    createEventFeeCheckoutSession,
    getCheckoutStatus,
  }
}
