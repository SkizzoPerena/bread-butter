const REFERRAL_CODE_PATTERN = /^[0-9A-F]{5}$/

export function normalizeReferralCode(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase()
}

export function isValidReferralCode(value: string | null | undefined): boolean {
  const normalized = normalizeReferralCode(value)
  if (!normalized) return false
  return REFERRAL_CODE_PATTERN.test(normalized)
}

export function normalizeVoucherCode(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase()
}

export function hasVoucherCode(value: string | null | undefined): boolean {
  return normalizeVoucherCode(value).length > 0
}
