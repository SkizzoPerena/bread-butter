export type PaymentMethod = 'GCASH' | 'PAYMAYA' | 'BANK_TRANSFER'

const UI_TO_API: Record<string, PaymentMethod> = {
  gcash: 'GCASH',
  maya: 'PAYMAYA',
  qrph: 'BANK_TRANSFER',
}

export function mapUiPaymentMethodToApi(uiId: string | undefined | null): PaymentMethod | null {
  if (!uiId) return null
  return UI_TO_API[uiId.trim().toLowerCase()] ?? null
}

export type PaymentProofPanelExpose = {
  selectedQrId?: string
  transactionId?: string
  proofFile?: File | null
}

export function getProofSubmitPayload(panel: PaymentProofPanelExpose | null | undefined): {
  paymentMethod: PaymentMethod
  transactionId: string
  proofOfPayment: File
} | null {
  if (!panel) return null
  const paymentMethod = mapUiPaymentMethodToApi(panel.selectedQrId)
  const transactionId = panel.transactionId?.trim() ?? ''
  const proofOfPayment = panel.proofFile ?? null
  if (!paymentMethod || !transactionId || !proofOfPayment) return null
  return { paymentMethod, transactionId, proofOfPayment }
}

export function formatPaymentMethodLabel(method: PaymentMethod | string): string {
  switch (method) {
    case 'GCASH':
      return 'GCash'
    case 'PAYMAYA':
      return 'Maya'
    case 'BANK_TRANSFER':
      return 'Bank / QRPh'
    default:
      return String(method)
  }
}
