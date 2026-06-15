import type { EventRecord } from '~/types/event'
import type {
  PaymentMessageResponse,
  PaymentsListResponse,
  SubmitEventPaymentPayload
} from '~/types/payment'
import demoCoverImage from '~/assets/bpb-images/wedding-1.jpg'

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
    formData.append('proofOfPayment', payload.proofOfPayment)

    const response = await apiUpload<PaymentMessageResponse>(
      `/user/events/${eventId}/payment-proof`,
      formData
    )

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

  return {
    getMyPayments,
    submitEventPaymentProof
  }
}
