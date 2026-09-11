export const REFERRAL_DISCOUNT_PERCENT = 5
export const PROMO_DISCOUNT_PERCENT = 10

export function percentOf(amount: number, percent: number): number {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0
  const safePercent = Number.isFinite(percent) ? Math.max(0, percent) : 0
  return Math.round((safeAmount * safePercent) / 100)
}
