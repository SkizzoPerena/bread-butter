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

export interface RequirementAttachedFile {
  fileName: string
  fileType: string
  fileURL: string
}

export interface PartyTracking {
  status: RequirementStatus
  dateAcquired?: string | null
  notes?: string
  attachedFile?: RequirementAttachedFile | null
}

export interface ChurchRequirementRecord {
  _id: string
  event: string
  templateKey?: string | null
  displayName: string
  category: string
  timeline: string
  sourceUrl: string
  description: string
  groom: PartyTracking
  bride: PartyTracking
  createdAt?: string
  updatedAt?: string
}

/** @deprecated Use ChurchRequirementRecord */
export type RequirementItem = ChurchRequirementRecord

export interface RequirementsByEventResponse {
  success: boolean
  status: number
  requirements: ChurchRequirementRecord[]
}

export interface RequirementResponse {
  success: boolean
  status: number
  message?: string
  requirement: ChurchRequirementRecord
}

export interface DeleteRequirementResponse {
  success: boolean
  status: number
  message: string
}

export interface CreateRequirementPayload {
  eventId: string
  displayName: string
  category?: string
  timeline?: string
  sourceUrl?: string
  description?: string
}

export interface UpdateRequirementDetailsPayload {
  displayName?: string
  category?: string
  timeline?: string
  sourceUrl?: string
  description?: string
}

export interface UpdatePartyRequirementPayload {
  status?: RequirementStatus
  dateAcquired?: string | null
  notes?: string
}

export interface GroupedTimelineSection {
  timeline: string
  items: ChurchRequirementRecord[]
}

export interface GroupedCategorySection {
  category: string
  timelines: GroupedTimelineSection[]
}

export function groupRequirementsByCategoryAndTimeline(
  requirements: ChurchRequirementRecord[]
): GroupedCategorySection[] {
  const categoryMap = new Map<string, Map<string, ChurchRequirementRecord[]>>()

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
      (category) =>
        !CHURCH_REQUIREMENT_CATEGORY_ORDER.includes(
          category as (typeof CHURCH_REQUIREMENT_CATEGORY_ORDER)[number]
        )
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
