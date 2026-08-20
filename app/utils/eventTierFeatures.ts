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

export function normalizeTierCode(value: unknown): TierCode | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().toUpperCase().replace(/[\s\-_+]+/g, '_')
  if (
    clean === 'BREAD_BUTTER' ||
    clean === 'BREADBUTTER' ||
    clean === 'PORTION_3' ||
    clean === 'PORTION3' ||
    clean === 'TIER_3' ||
    clean === 'TIER3' ||
    clean === 'PACKAGE_3' ||
    clean === 'PACKAGE3' ||
    clean.includes('BREAD_BUTTER') ||
    clean.includes('PORTION_3') ||
    clean.includes('ALL_IN_ONE')
  ) {
    return 'BREAD_BUTTER'
  }
  if (
    clean === 'BUTTER' ||
    clean === 'PORTION_2' ||
    clean === 'PORTION2' ||
    clean === 'TIER_2' ||
    clean === 'TIER2' ||
    clean === 'PACKAGE_2' ||
    clean === 'PACKAGE2' ||
    clean.includes('PORTION_2') ||
    clean === 'BUTTER_PORTION' ||
    clean === 'PORTION_BUTTER' ||
    (clean.includes('BUTTER') && !clean.includes('BREAD'))
  ) {
    return 'BUTTER'
  }
  if (
    clean === 'BREAD' ||
    clean === 'PORTION_1' ||
    clean === 'PORTION1' ||
    clean === 'TIER_1' ||
    clean === 'TIER1' ||
    clean === 'PACKAGE_1' ||
    clean === 'PACKAGE1' ||
    clean.includes('PORTION_1') ||
    clean === 'BREAD_PORTION' ||
    clean === 'PORTION_BREAD' ||
    (clean.includes('BREAD') && !clean.includes('BUTTER'))
  ) {
    return 'BREAD'
  }
  return null
}

export function resolveEventTierCode(event?: any): TierCode {
  if (!event) return 'BREAD'

  // 1. Direct string candidates
  const stringCandidates = [
    typeof event.priceTier === 'string' ? event.priceTier : null,
    typeof event.priceTier === 'object' ? event.priceTier?.code : null,
    typeof event.priceTier === 'object' ? event.priceTier?.name : null,
    typeof event.priceTier === 'object' ? event.priceTier?.title : null,
    typeof event.priceTier === 'object' ? event.priceTier?.id : null,
    event.package,
    event.packageName,
    event.packageId,
    event.tier,
    event.tierName,
    event.tierCode,
    event.plan,
    event.planName,
  ]

  for (const candidate of stringCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const code = normalizeTierCode(candidate)
      if (code) return code
    }
  }

  // 2. Check if event.priceTier or event.priceTierId is an ObjectId and match against cached price tiers
  const tierId = typeof event.priceTier === 'string' ? event.priceTier : (event.priceTier?._id || event.priceTierId)
  if (typeof tierId === 'string' && tierId.trim()) {
    const { cachedPriceTiers } = usePriceTiers()
    const match = cachedPriceTiers.value?.find((t) => t._id === tierId)
    if (match) {
      const fromMatch = normalizeTierCode(match.code) || normalizeTierCode(match.name)
      if (fromMatch) return fromMatch
    }
  }

  // 3. Object price inspection
  const tierObj = typeof event.priceTier === 'object' ? event.priceTier : null
  if (tierObj && typeof tierObj.pricePhp === 'number') {
    if (tierObj.pricePhp >= 10000) return 'BREAD_BUTTER'
    if (tierObj.pricePhp >= 7000) return 'BUTTER'
    return 'BREAD'
  }

  // 4. Standalone tierPricePhp / payments
  const price = typeof event.tierPricePhp === 'number' && event.tierPricePhp > 0 ? event.tierPricePhp : null
  if (typeof price === 'number') {
    if (price >= 10000) return 'BREAD_BUTTER'
    if (price >= 7000) return 'BUTTER'
    return 'BREAD'
  }

  // 5. Check eventName as fallback helper
  if (typeof event.eventName === 'string' && event.eventName.trim()) {
    const fromName = normalizeTierCode(event.eventName)
    if (fromName) return fromName
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

  // 1. If backend event record has allowedFeatures array with entries, check inclusion directly
  if (Array.isArray(event.allowedFeatures) && event.allowedFeatures.length > 0) {
    const target = feature.toLowerCase().trim()
    const hasFeature = event.allowedFeatures.some((f) => {
      if (typeof f !== 'string') return false
      const clean = f.toLowerCase().trim()
      return clean === target || clean.replace(/[-_]/g, '') === target.replace(/[-_]/g, '')
    })
    if (hasFeature) return true
  }

  // 2. Otherwise calculate based on tier code
  const tierCode = resolveEventTierCode(event)

  // Butter and Bread + Butter have full access to all tools
  if (tierCode === 'BUTTER' || tierCode === 'BREAD_BUTTER') {
    return true
  }

  // Bread tier: allowed features
  const BREAD_ALLOWED_FEATURES: EventFeature[] = [
    EVENT_FEATURE.WEBSITE,
    EVENT_FEATURE.INVITATION,
    EVENT_FEATURE.GUEST_LIST,
    EVENT_FEATURE.RSVP,
    EVENT_FEATURE.PLAYLIST,
    EVENT_FEATURE.WISHLIST,
    EVENT_FEATURE.PAYMENTS,
  ]

  return BREAD_ALLOWED_FEATURES.includes(feature)
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
