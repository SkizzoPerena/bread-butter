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
