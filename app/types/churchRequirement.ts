export type RequirementStatus =
  | 'required'
  | 'not required'
  | 'requested'
  | 'acquired'
  | 'waived'

export type ChurchRequirementParty = 'groom' | 'bride'

export const REQUIREMENT_STATUS_OPTIONS: RequirementStatus[] = [
  'required',
  'not required',
  'requested',
  'acquired',
  'waived',
]

export const CHURCH_REQUIREMENT_CATEGORY_ORDER = [
  'Church Requirements',
  'Special Clearances',
  'Civil Registry Requirements',
  'Foreigner-Specific Requirements',
] as const

export interface PartyTracking {
  status: RequirementStatus
  dateRequested?: string | null
  dateAcquired?: string | null
  notes?: string
}

export interface RequirementItem {
  taskKey: string
  displayName: string
  category: string
  timeline: string
  sourceUrl: string
  description: string
  groom: PartyTracking
  bride: PartyTracking
}

export interface ChurchRequirementRecord {
  _id: string
  event: string
  requirements: RequirementItem[]
}

export interface ChurchRequirementResponse {
  success: boolean
  status: number
  churchRequirement: ChurchRequirementRecord
}

export interface UpdatePartyRequirementPayload {
  status?: RequirementStatus
  dateRequested?: string | null
  dateAcquired?: string | null
}

export interface BulkPartyRequirementUpdate extends UpdatePartyRequirementPayload {
  taskKey: string
  party: ChurchRequirementParty
}

export interface BulkUpdatePartyRequirementsPayload {
  updates: BulkPartyRequirementUpdate[]
}

export interface GroupedTimelineSection {
  timeline: string
  items: RequirementItem[]
}

export interface GroupedCategorySection {
  category: string
  timelines: GroupedTimelineSection[]
}

export function groupRequirementsByCategoryAndTimeline(
  requirements: RequirementItem[]
): GroupedCategorySection[] {
  const categoryMap = new Map<string, Map<string, RequirementItem[]>>()

  for (const item of requirements) {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, new Map())
    }
    const timelineMap = categoryMap.get(item.category)!
    if (!timelineMap.has(item.timeline)) {
      timelineMap.set(item.timeline, [])
    }
    timelineMap.get(item.timeline)!.push(item)
  }

  const orderedCategories = [
    ...CHURCH_REQUIREMENT_CATEGORY_ORDER.filter((category) => categoryMap.has(category)),
    ...[...categoryMap.keys()].filter(
      (category) => !CHURCH_REQUIREMENT_CATEGORY_ORDER.includes(category as typeof CHURCH_REQUIREMENT_CATEGORY_ORDER[number])
    ),
  ]

  return orderedCategories.map((category) => {
    const timelineMap = categoryMap.get(category)!
    const timelines = [...timelineMap.entries()].map(([timeline, items]) => ({
      timeline,
      items,
    }))
    return { category, timelines }
  })
}

export function formatRequirementStatusLabel(status: RequirementStatus): string {
  return status
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function toDateInputValue(value?: string | null): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString().slice(0, 10)
}

export function fromDateInputValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return new Date(`${trimmed}T00:00:00.000Z`).toISOString()
}
