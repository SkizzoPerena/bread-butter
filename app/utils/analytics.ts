import { resolveRouteRole } from '~/composables/useApiRole'

export type AnalyticsRole = 'user' | 'partner' | 'guest'

type AnalyticsValue = string | number | boolean
export type AnalyticsProps = Record<string, AnalyticsValue | undefined>

type AnalyticsClient = {
  capture: (
    event: string,
    properties?: Record<string, AnalyticsValue>,
    options?: { send_instantly?: boolean },
  ) => void
  identify: (distinctId: string, properties?: Record<string, AnalyticsValue>) => void
  reset: () => void
}

type ReasonRule = readonly [needle: string, reason: string]

let client: AnalyticsClient | null = null

export function setAnalyticsClient(next: AnalyticsClient | null) {
  client = next
}

export function actorRole(): AnalyticsRole | null {
  try {
    const role = resolveRouteRole(useRoute())
    if (role === 'admin') return null
    if (role === 'partner') return 'partner'
    return 'user'
  } catch {
    return 'user'
  }
}

function cleanProps(properties: AnalyticsProps | undefined): Record<string, AnalyticsValue> {
  const cleaned: Record<string, AnalyticsValue> = {}
  if (!properties) return cleaned
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) cleaned[key] = value
  }
  return cleaned
}

export function capture(event: string, properties?: AnalyticsProps, sendInstantly = false) {
  if (!import.meta.client || !client) return
  const role = properties?.role
  if (role === 'admin') return
  client.capture(event, cleanProps(properties), sendInstantly ? { send_instantly: true } : undefined)
}

export function identifyUser(userId: string, role: 'user' | 'partner') {
  if (!import.meta.client || !client || !userId) return
  client.identify(userId, { role })
}

export function resetAnalytics() {
  if (!import.meta.client || !client) return
  client.reset()
}

export function userIdFromAccessToken(token: string | null | undefined): string | null {
  if (!token || token.startsWith('ui-only-')) return null
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(normalized)) as { sub?: unknown }
    return typeof json.sub === 'string' && json.sub.trim() ? json.sub : null
  } catch {
    return null
  }
}

export function errorMessage(error: unknown): string {
  const value = error as {
    data?: { message?: unknown }
    response?: { _data?: { message?: unknown } }
    message?: unknown
  }
  const message = value?.data?.message ?? value?.response?._data?.message ?? value?.message
  return typeof message === 'string' ? message : ''
}

export function matchReason(error: unknown, rules: readonly ReasonRule[]): string | null {
  const message = errorMessage(error).toLowerCase()
  if (!message) return null
  for (const [needle, reason] of rules) {
    if (message.includes(needle.toLowerCase())) return reason
  }
  return null
}

export const AUTH_LOGIN_REASONS = [
  ['restricted', 'restricted'],
  ['email address not found', 'invalid_credentials'],
  ['password is incorrect', 'invalid_credentials'],
] as const satisfies readonly ReasonRule[]

export const AUTH_OTP_REASONS = [
  ['signup session has expired', 'session_expired'],
  ['already used', 'already_used'],
  ['otp has expired', 'expired'],
  ['otp not found', 'already_used'],
] as const satisfies readonly ReasonRule[]

export const EMAIL_TAKEN_REASONS = [
  ['email is already taken', 'email_taken'],
] as const satisfies readonly ReasonRule[]

export const REFERRAL_REASONS = [
  ['invalid referral code', 'invalid_code'],
] as const satisfies readonly ReasonRule[]

export const PASSWORD_REASONS = [
  ['current password is incorrect', 'incorrect_current'],
] as const satisfies readonly ReasonRule[]

export const VOUCHER_CREATE_REASONS = [
  ['already exists', 'code_taken'],
] as const satisfies readonly ReasonRule[]

export const VOUCHER_REDEEM_REASONS = [
  ['already used this voucher', 'already_used'],
  ['has expired', 'expired'],
  ['is inactive', 'inactive'],
  ['maximum uses', 'max_uses'],
  ['only be applied to bread + butter', 'wrong_tier'],
  ['already has a voucher applied', 'already_applied'],
  ['partner account is restricted', 'partner_restricted'],
  ['partner is no longer available', 'partner_unavailable'],
  ['voucher not found', 'not_found'],
] as const satisfies readonly ReasonRule[]

export const EVENT_PAST_REASONS = [
  ['no longer be cancelled', 'past_date'],
  ['no longer be resumed', 'past_date'],
] as const satisfies readonly ReasonRule[]

export const SUB_EVENT_REASONS = [
  ['before the main event date', 'date_not_before_main'],
] as const satisfies readonly ReasonRule[]

export const ALREADY_PAID_REASONS = [
  ['already fully paid', 'already_paid'],
  ['upgrade is already fully paid', 'already_paid'],
] as const satisfies readonly ReasonRule[]

export const NOT_FULLY_PAID_REASONS = [
  ['must be fully paid', 'not_fully_paid'],
] as const satisfies readonly ReasonRule[]

export const GUEST_ADD_REASONS = [
  ['already on the list', 'already_on_list'],
] as const satisfies readonly ReasonRule[]

export const GUEST_GROUP_REASONS = [
  ['already in a group', 'already_in_group'],
] as const satisfies readonly ReasonRule[]

export const GUEST_ROLE_REASONS = [
  ['role with this name already exists', 'name_taken'],
] as const satisfies readonly ReasonRule[]

export const INVITE_REASONS = [
  ['not enough email credits', 'insufficient_credits'],
  ['event has been cancelled', 'event_cancelled'],
] as const satisfies readonly ReasonRule[]

export const TASK_DELETE_REASONS = [
  ['only to do tasks', 'not_todo'],
] as const satisfies readonly ReasonRule[]

export const EVENT_CANCELLED_REASONS = [
  ['even has been cancelled', 'event_cancelled'],
  ['event has been cancelled', 'event_cancelled'],
] as const satisfies readonly ReasonRule[]

export const CHURCH_REASONS = [
  ['only available for wedding', 'not_wedding'],
  ['event has been cancelled', 'event_cancelled'],
] as const satisfies readonly ReasonRule[]

export const SUPPLIER_REASONS = [
  ['settled balance cannot exceed', 'settled_exceeds_total'],
  ['already exists on this event', 'already_exists'],
  ['event has been cancelled', 'event_cancelled'],
] as const satisfies readonly ReasonRule[]

export const CASHOUT_REASONS = [
  ['insufficient partner credit', 'insufficient_credit'],
] as const satisfies readonly ReasonRule[]

export const COLLABORATION_INVITE_REASONS = [
  ['cannot invite yourself', 'self'],
  ['already a collaborator', 'already_collaborator'],
  ['pending collaboration invite already exists', 'already_invited'],
  ['not found', 'not_found'],
] as const satisfies readonly ReasonRule[]

export const COLLABORATION_ACCEPT_REASONS = [
  ['not the invitee', 'not_invitee'],
] as const satisfies readonly ReasonRule[]

export async function tracked<T>(
  role: AnalyticsRole | null,
  request: () => Promise<T>,
  success: {
    event: string
    props?: AnalyticsProps | ((value: T) => AnalyticsProps)
  },
  rejected?: {
    event: string
    reasons: readonly ReasonRule[]
    props?: AnalyticsProps
  },
): Promise<T> {
  try {
    const value = await request()
    if (role) {
      const extra = typeof success.props === 'function' ? success.props(value) : success.props
      capture(success.event, { role, ...extra })
    }
    return value
  } catch (error) {
    if (role && rejected) {
      const reason = matchReason(error, rejected.reasons)
      if (reason) {
        capture(rejected.event, { role, ...rejected.props, reason })
      }
    }
    throw error
  }
}
