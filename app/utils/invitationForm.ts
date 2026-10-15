import type { EventRecord } from '~/types/event'
import type { InvitationBlock, InvitationRecord, InvitationSavePayload } from '~/types/invitation'

export interface InvitationEditorBlock extends InvitationBlock {
  id: number
}

export interface InvitationRsvpData {
  requestLine: string
  eventLabel: string
  eventDate: string
  eventTime: string
  eventVenue: string
  deadlineText: string
  deadlineDate: string
  bannerImageUrl?: string
}

function parseLocalDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateInputValue(isoOrDate: string | Date): string {
  const date = parseLocalDate(isoOrDate)
  if (!date) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toTimeInputValue(isoOrDate: string | Date, fallback = '12:00'): string {
  const date = parseLocalDate(isoOrDate)
  if (!date) {
    return fallback
  }
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function oneMonthBeforeDateInput(eventDateInput: string): string {
  if (!eventDateInput) {
    return ''
  }
  const date = parseLocalDate(eventDateInput)
  if (!date) {
    return ''
  }
  const adjusted = new Date(date)
  adjusted.setMonth(adjusted.getMonth() - 1)
  return toDateInputValue(adjusted)
}

export function seedInvitationDefaultsFromEvent(
  event: EventRecord | null,
  rsvpData: InvitationRsvpData
): void {
  if (!event) {
    return
  }

  const eventDateInput = toDateInputValue(event.eventDate)
  if (eventDateInput) {
    rsvpData.eventDate = eventDateInput
    rsvpData.deadlineDate = oneMonthBeforeDateInput(eventDateInput)
  }

  rsvpData.eventTime = '12:00'

  const venue = event.venue?.trim()
  if (venue) {
    rsvpData.eventVenue = venue
  }

  const eventName = event.eventName?.trim()
  if (eventName) {
    rsvpData.eventLabel = eventName
  }
}

export function applyInvitationToEditor(
  invitation: InvitationRecord,
  options: {
    rsvpData: InvitationRsvpData
    blocks: { value: InvitationEditorBlock[] }
  }
): void {
  const { rsvpData, blocks } = options

  rsvpData.requestLine = invitation.requestLine
  rsvpData.eventLabel = invitation.eventLabel
  rsvpData.eventDate = toDateInputValue(invitation.eventDate)
  rsvpData.eventTime = toTimeInputValue(invitation.eventTime)
  rsvpData.eventVenue = invitation.eventVenue
  rsvpData.deadlineText = invitation.deadlineText
  rsvpData.deadlineDate = toDateInputValue(invitation.deadlineDate)
  rsvpData.bannerImageUrl = invitation.bannerImageUrl || (invitation.blocks ?? []).find(b => b.type === 'banner-image')?.content || ''

  blocks.value = (invitation.blocks ?? [])
    .filter(b => b.type !== 'banner-image')
    .map((block, index) => ({
      id: Date.now() + index,
      type: block.type,
      content: block.content,
    }))
}

function toIsoDate(dateString: string): string {
  if (!dateString || !dateString.trim()) return ''
  const trimmed = dateString.trim()
  if (trimmed.includes('T')) return trimmed
  const d = parseLocalDate(trimmed)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : trimmed
}

function toIsoTime(timeString: string, dateString?: string): string {
  if (!timeString || !timeString.trim()) return ''
  const trimmed = timeString.trim()
  if (trimmed.includes('T')) return trimmed
  const baseDate = dateString && parseLocalDate(dateString) ? dateString.trim() : '1970-01-01'
  const timeWithSeconds = trimmed.length === 5 ? `${trimmed}:00` : trimmed
  const combined = new Date(`${baseDate}T${timeWithSeconds}`)
  return Number.isNaN(combined.getTime()) ? trimmed : combined.toISOString()
}

export function validateInvitationForSave(
  rsvpData: InvitationRsvpData,
  eventId: string
): string | null {
  if (!eventId || !eventId.trim()) {
    return 'Missing event. Please open an event from your dashboard first.'
  }
  if (!rsvpData.eventLabel?.trim()) {
    return 'Event headline is required.'
  }
  if (!rsvpData.eventDate?.trim()) {
    return 'Event date is required.'
  }
  if (!rsvpData.eventVenue?.trim()) {
    return 'Event venue is required.'
  }
  if (!rsvpData.deadlineDate?.trim()) {
    return 'RSVP deadline date is required.'
  }
  return null
}

export function buildInvitationPayload(options: {
  eventId: string
  rsvpData: InvitationRsvpData
  blocks: InvitationEditorBlock[]
}): InvitationSavePayload {
  const { eventId, rsvpData, blocks } = options

  const eventDate = toIsoDate(rsvpData.eventDate)
  const eventTime = toIsoTime(rsvpData.eventTime, rsvpData.eventDate)
  const deadlineDate = toIsoDate(rsvpData.deadlineDate)
  const bannerImage = rsvpData.bannerImageUrl?.trim() || ''

  const customBlocks = blocks
    .filter(b => b.type !== 'banner-image')
    .map(({ type, content }) => ({ type, content: content.trim() }))

  if (bannerImage) {
    customBlocks.push({ type: 'banner-image', content: bannerImage })
  }

  return {
    eventId,
    event: eventId,
    requestLine: rsvpData.requestLine.trim(),
    eventLabel: rsvpData.eventLabel.trim(),
    eventDate: eventDate || rsvpData.eventDate,
    eventTime: eventTime || rsvpData.eventTime,
    eventVenue: rsvpData.eventVenue.trim(),
    blocks: customBlocks,
    deadlineText: rsvpData.deadlineText.trim(),
    deadlineDate: deadlineDate || rsvpData.deadlineDate,
    bannerImageUrl: bannerImage || undefined,
  }
}

export function buildInvitationUpdatePayload(
  options: Omit<Parameters<typeof buildInvitationPayload>[0], 'eventId'>
): Omit<InvitationSavePayload, 'eventId'> {
  const full = buildInvitationPayload({ eventId: '', ...options })
  const { eventId: _eventId, ...rest } = full
  return rest
}

