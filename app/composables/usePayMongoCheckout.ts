const STORAGE_PREFIX = 'bpb_paymongo_idempotency:'

export function usePayMongoCheckout() {
  function storageKey(scope: string) {
    return `${STORAGE_PREFIX}${scope}`
  }

  function getOrCreateIdempotencyKey(scope: string): string {
    if (!import.meta.client) {
      return crypto.randomUUID()
    }
    const key = storageKey(scope)
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
    return id
  }

  function clearIdempotencyKey(scope: string) {
    if (!import.meta.client) return
    sessionStorage.removeItem(storageKey(scope))
  }

  function rememberCheckoutIds(checkoutId?: string | null, paymentId?: string | null) {
    if (!import.meta.client) return
    if (checkoutId) sessionStorage.setItem('bpb_paymongo_checkout_id', checkoutId)
    if (paymentId) sessionStorage.setItem('bpb_paymongo_payment_id', paymentId)
  }

  function readRememberedCheckoutIds() {
    if (!import.meta.client) {
      return { checkoutId: '', paymentId: '' }
    }
    return {
      checkoutId: sessionStorage.getItem('bpb_paymongo_checkout_id') || '',
      paymentId: sessionStorage.getItem('bpb_paymongo_payment_id') || '',
    }
  }

  function redirectToCheckout(url: string) {
    window.location.assign(url)
  }

  return {
    getOrCreateIdempotencyKey,
    clearIdempotencyKey,
    rememberCheckoutIds,
    readRememberedCheckoutIds,
    redirectToCheckout,
  }
}
