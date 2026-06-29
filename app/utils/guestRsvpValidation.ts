import type { EventQuestion } from '~/types/event'
import type { GuestRsvpRespondPayload, RsvpAnswer } from '~/types/rsvp'

const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u
const ORGANIZER_NOTES_MAX_LENGTH = 200
const GUEST_NOTES_MAX_LENGTH = 500

export type GuestAnswerMap = Record<string, string | boolean | null>
export type GuestNotesMap = Record<string, string>

function normalizeQuestionText(text: string): string {
  return text.trim().toLowerCase()
}

function normalizeQuestionType(type: string): string {
  return type.trim().toUpperCase()
}

function parseYesNoValue(value: string | boolean | null | undefined): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    if (lower === 'yes' || lower === 'true') {
      return true
    }
    if (lower === 'no' || lower === 'false') {
      return false
    }
  }
  return null
}

function validateQuestionAnswer(
  question: EventQuestion,
  rawValue: string | boolean | null | undefined
): { answer?: RsvpAnswer['answer']; error?: string } {
  const label = question.question.trim()
  const type = normalizeQuestionType(question.type)

  if (type === 'TEXT') {
    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return { error: `An answer is required for "${label}".` }
    }
    if (EMOJI_RE.test(rawValue)) {
      return { error: `Answers for "${label}" must not contain emojis.` }
    }
    return { answer: rawValue.trim() }
  }

  if (type === 'YES/NO') {
    const parsed = parseYesNoValue(rawValue)
    if (parsed === null) {
      return { error: `Please answer Yes or No for "${label}".` }
    }
    return { answer: parsed }
  }

  if (type === 'OPTIONS') {
    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return { error: `Please select an option for "${label}".` }
    }
    const options = question.options ?? []
    const match = options.find(
      (option) => normalizeQuestionText(option) === normalizeQuestionText(rawValue)
    )
    if (!match) {
      return { error: `Please select a valid option for "${label}".` }
    }
    return { answer: match }
  }

  return { error: `Unsupported question type for "${label}".` }
}

function validateQuestionNotes(
  question: EventQuestion,
  rawNotes: string | undefined
): { notes?: string; error?: string } {
  const label = question.question.trim()
  const type = normalizeQuestionType(question.type)
  const trimmed = typeof rawNotes === 'string' ? rawNotes.trim() : ''

  if (!trimmed) {
    return { notes: '' }
  }

  if (type === 'TEXT') {
    return { error: `Notes are not accepted for "${label}".` }
  }

  if (type !== 'OPTIONS' && type !== 'YES/NO') {
    return { error: `Notes are not accepted for "${label}".` }
  }

  if (EMOJI_RE.test(trimmed)) {
    return { error: `Notes for "${label}" must not contain emojis.` }
  }

  if (trimmed.length > GUEST_NOTES_MAX_LENGTH) {
    return {
      error: `Notes for "${label}" cannot exceed ${GUEST_NOTES_MAX_LENGTH} characters.`,
    }
  }

  return { notes: trimmed }
}

export function validateGuestRsvpSubmission(
  questions: EventQuestion[],
  attendanceStatus: 'GOING' | 'NOT_GOING' | null,
  answerMap: GuestAnswerMap,
  notesMap: GuestNotesMap = {}
): { payload?: GuestRsvpRespondPayload; error?: string } {
  if (!attendanceStatus) {
    return { error: 'Please select whether you will attend.' }
  }

  const answers: RsvpAnswer[] = []

  for (const question of questions) {
    const key = questionAnswerKey(question)
    const rawValue = answerMap[key]
    const validated = validateQuestionAnswer(question, rawValue)
    if (validated.error) {
      return { error: validated.error }
    }

    const validatedNotes = validateQuestionNotes(question, notesMap[key])
    if (validatedNotes.error) {
      return { error: validatedNotes.error }
    }

    const entry: RsvpAnswer = {
      question: question.question.trim(),
      answer: validated.answer ?? null,
      notes: validatedNotes.notes || '',
    }
    answers.push(entry)
  }

  return {
    payload: {
      status: attendanceStatus,
      answers,
    },
  }
}

export function guestAnswerMapFromRsvp(answers: RsvpAnswer[]): GuestAnswerMap {
  const map: GuestAnswerMap = {}
  for (const entry of answers) {
    map[normalizeQuestionText(entry.question)] = entry.answer as string | boolean | null
  }
  return map
}

export function guestNotesMapFromRsvp(answers: RsvpAnswer[]): GuestNotesMap {
  const map: GuestNotesMap = {}
  for (const entry of answers) {
    if (entry.notes?.trim()) {
      map[normalizeQuestionText(entry.question)] = entry.notes.trim()
    }
  }
  return map
}

export function questionAnswerKey(question: EventQuestion): string {
  return normalizeQuestionText(question.question)
}

export function questionNotesKey(question: EventQuestion): string {
  return questionAnswerKey(question)
}

export function validateOrganizerQuestionNotes(notes: string): string | null {
  const trimmed = notes.trim()
  if (!trimmed) {
    return null
  }
  if (EMOJI_RE.test(trimmed)) {
    return 'Notes prompt must not contain emojis.'
  }
  if (trimmed.length > ORGANIZER_NOTES_MAX_LENGTH) {
    return `Notes prompt cannot exceed ${ORGANIZER_NOTES_MAX_LENGTH} characters.`
  }
  return null
}
