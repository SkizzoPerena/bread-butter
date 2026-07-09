import type { EventRecord } from '~/types/event'

export const EVENT_FEATURE = {
  WEBSITE: 'website',
  GUEST_LIST: 'guestList',
  RSVP: 'rsvp',
  INVITATION: 'invitation',
  PLAYLIST: 'playlist',
  WISHLIST: 'wishlist',
  PAYMENTS: 'payments',
  TASKS: 'tasks',
  SUPPLIERS: 'suppliers',
  CHURCH_REQUIREMENTS: 'churchRequirements',
  SCHEDULES: 'schedules',
} as const

export type EventFeature = (typeof EVENT_FEATURE)[keyof typeof EVENT_FEATURE]

export const TIER_RANK = {
  BREAD: 1,
  BUTTER: 2,
  BREAD_BUTTER: 3,
} as const

export type TierCode = keyof typeof TIER_RANK

export const FEATURE_MIN_TIER: Record<EventFeature, TierCode> = {
  [EVENT_FEATURE.WEBSITE]: 'BREAD',
  [EVENT_FEATURE.GUEST_LIST]: 'BREAD',
  [EVENT_FEATURE.RSVP]: 'BREAD',
  [EVENT_FEATURE.INVITATION]: 'BREAD',
  [EVENT_FEATURE.PLAYLIST]: 'BREAD',
  [EVENT_FEATURE.WISHLIST]: 'BREAD',
  [EVENT_FEATURE.PAYMENTS]: 'BREAD',
  [EVENT_FEATURE.TASKS]: 'BUTTER',
  [EVENT_FEATURE.SUPPLIERS]: 'BUTTER',
  [EVENT_FEATURE.CHURCH_REQUIREMENTS]: 'BUTTER',
  [EVENT_FEATURE.SCHEDULES]: 'BUTTER',
}

export type DashboardAction =
  | 'website'
  | 'invitation'
  | 'guestList'
  | 'tasks'
  | 'rsvp'
  | 'settings'
  | 'payments'
  | 'schedules'
  | 'wishlist'
  | 'playlist'
  | 'churchRequirements'
  | 'suppliers'

export const DASHBOARD_FEATURE_BY_ACTION: Record<
  Exclude<DashboardAction, 'settings'>,
  EventFeature
> = {
  website: EVENT_FEATURE.WEBSITE,
  invitation: EVENT_FEATURE.INVITATION,
  guestList: EVENT_FEATURE.GUEST_LIST,
  tasks: EVENT_FEATURE.TASKS,
  rsvp: EVENT_FEATURE.RSVP,
  payments: EVENT_FEATURE.PAYMENTS,
  schedules: EVENT_FEATURE.SCHEDULES,
  wishlist: EVENT_FEATURE.WISHLIST,
  playlist: EVENT_FEATURE.PLAYLIST,
  churchRequirements: EVENT_FEATURE.CHURCH_REQUIREMENTS,
  suppliers: EVENT_FEATURE.SUPPLIERS,
}

type EventTierSource = Pick<EventRecord, 'priceTier' | 'tierPricePhp'>

function normalizeTierCode(value: string): TierCode | null {
  const normalized = value.trim().toUpperCase().replace(/-/g, '_')
  if (normalized === 'BREAD_BUTTER' || normalized === 'BREAD+BUTTER') {
    return 'BREAD_BUTTER'
  }
  if (normalized === 'BREAD') {
    return 'BREAD'
  }
  if (normalized === 'BUTTER') {
    return 'BUTTER'
  }
  return null
}

export function resolveEventTierCode(event: EventTierSource): TierCode {
  const tier = event.priceTier
  if (tier && typeof tier === 'object' && typeof tier.code === 'string') {
    const knownCode = normalizeTierCode(tier.code)
    if (knownCode) {
      return knownCode
    }
  }

  const snapshotPrice =
    typeof event.tierPricePhp === 'number' && event.tierPricePhp > 0
      ? event.tierPricePhp
      : null
  const tierPrice =
    tier && typeof tier === 'object' && typeof tier.pricePhp === 'number'
      ? tier.pricePhp
      : null
  const pricePhp = snapshotPrice ?? tierPrice

  if (typeof pricePhp === 'number' && pricePhp > 0) {
    if (pricePhp >= 10000) {
      return 'BREAD_BUTTER'
    }
    if (pricePhp >= 7000) {
      return 'BUTTER'
    }
    return 'BREAD'
  }

  return 'BREAD'
}

export function getAllowedFeaturesForEvent(
  event: EventTierSource
): EventFeature[] {
  const tierRank = TIER_RANK[resolveEventTierCode(event)]
  return (Object.entries(FEATURE_MIN_TIER) as [EventFeature, TierCode][])
    .filter(([, minTier]) => tierRank >= TIER_RANK[minTier])
    .map(([feature]) => feature)
}

export function isEventFeatureAllowed(
  event:
    | (EventTierSource & Pick<EventRecord, 'allowedFeatures'>)
    | null
    | undefined,
  feature: EventFeature
): boolean {
  if (!event) {
    return false
  }

  if (Array.isArray(event.allowedFeatures)) {
    return event.allowedFeatures.includes(feature)
  }

  const tierRank = TIER_RANK[resolveEventTierCode(event)]
  const minTier = FEATURE_MIN_TIER[feature]
  return tierRank >= TIER_RANK[minTier]
}

export function isDashboardActionAllowed(
  event:
    | (EventTierSource & Pick<EventRecord, 'allowedFeatures'>)
    | null
    | undefined,
  action: DashboardAction
): boolean {
  if (action === 'settings') {
    return true
  }

  const feature = DASHBOARD_FEATURE_BY_ACTION[action]
  if (!feature) {
    return false
  }

  return isEventFeatureAllowed(event, feature)
}
