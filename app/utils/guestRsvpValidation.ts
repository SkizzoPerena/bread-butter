import type { EventQuestion } from '~/types/event'
import type { GuestRsvpRespondPayload, RsvpAnswer } from '~/types/rsvp'

const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u

export type GuestAnswerMap = Record<string, string | boolean | null>

function normalizeQuestionText(text: string): string {
  return text.trim().toLowerCase()
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

  if (question.type === 'TEXT') {
    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return { error: `An answer is required for "${label}".` }
    }
    if (EMOJI_RE.test(rawValue)) {
      return { error: `Answers for "${label}" must not contain emojis.` }
    }
    return { answer: rawValue.trim() }
  }

  if (question.type === 'YES/NO') {
    const parsed = parseYesNoValue(rawValue)
    if (parsed === null) {
      return { error: `Please answer Yes or No for "${label}".` }
    }
    return { answer: parsed }
  }

  if (question.type === 'OPTIONS') {
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

export function validateGuestRsvpSubmission(
  questions: EventQuestion[],
  attendanceStatus: 'GOING' | 'NOT_GOING' | null,
  answerMap: GuestAnswerMap
): { payload?: GuestRsvpRespondPayload; error?: string } {
  if (!attendanceStatus) {
    return { error: 'Please select whether you will attend.' }
  }

  const answers: RsvpAnswer[] = []

  for (const question of questions) {
    const key = normalizeQuestionText(question.question)
    const rawValue = answerMap[key]
    const validated = validateQuestionAnswer(question, rawValue)
    if (validated.error) {
      return { error: validated.error }
    }
    answers.push({
      question: question.question.trim(),
      answer: validated.answer ?? null,
    })
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

export function questionAnswerKey(question: EventQuestion): string {
  return normalizeQuestionText(question.question)
}
