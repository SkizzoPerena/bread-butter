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

  blocks.value = (invitation.blocks ?? []).map((block, index) => ({
    id: Date.now() + index,
    type: block.type,
    content: block.content,
  }))
}

export function buildInvitationPayload(options: {
  eventId: string
  rsvpData: InvitationRsvpData
  blocks: InvitationEditorBlock[]
}): InvitationSavePayload {
  const { eventId, rsvpData, blocks } = options

  return {
    eventId,
    requestLine: rsvpData.requestLine.trim(),
    eventLabel: rsvpData.eventLabel.trim(),
    eventDate: rsvpData.eventDate,
    eventTime: rsvpData.eventTime,
    eventVenue: rsvpData.eventVenue.trim(),
    blocks: blocks.map(({ type, content }) => ({ type, content: content.trim() })),
    deadlineText: rsvpData.deadlineText.trim(),
    deadlineDate: rsvpData.deadlineDate,
  }
}

export function buildInvitationUpdatePayload(
  options: Omit<Parameters<typeof buildInvitationPayload>[0], 'eventId'>
): Omit<InvitationSavePayload, 'eventId'> {
  const full = buildInvitationPayload({ eventId: '', ...options })
  const { eventId: _eventId, ...rest } = full
  return rest
}
