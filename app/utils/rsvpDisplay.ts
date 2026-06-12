import type { ChartSlice, EventQuestion } from '~/types/event'
import type { RsvpRecord } from '~/types/rsvp'

export type RsvpStatusLabel = 'Attending' | 'Not Attending' | 'Pending'

export function mapRsvpStatusToLabel(
  status?: string | null
): RsvpStatusLabel {
  if (status === 'GOING') {
    return 'Attending'
  }
  if (status === 'NOT_GOING') {
    return 'Not Attending'
  }
  return 'Pending'
}

export function mapRsvpStatusToBadgeColor(
  status?: string | null
): 'success' | 'error' | 'secondary' {
  if (status === 'GOING') {
    return 'success'
  }
  if (status === 'NOT_GOING') {
    return 'error'
  }
  return 'secondary'
}

export function formatRsvpAnswerValue(
  answer: string | boolean | number | null | unknown
): string {
  if (answer === null || answer === undefined) {
    return '—'
  }
  if (typeof answer === 'boolean') {
    return answer ? 'Yes' : 'No'
  }
  if (Array.isArray(answer)) {
    return answer.map((item) => formatRsvpAnswerValue(item)).join(', ')
  }
  if (typeof answer === 'object') {
    return JSON.stringify(answer)
  }
  return String(answer)
}

export function isRetiredQuestion(
  questionText: string,
  currentQuestions: EventQuestion[]
): boolean {
  const normalized = questionText.trim().toLowerCase()
  if (!normalized) {
    return false
  }
  return !currentQuestions.some(
    (question) => question.question.trim().toLowerCase() === normalized
  )
}

export function isChartableQuestionType(type: string): boolean {
  return type === 'YES/NO' || type === 'OPTIONS'
}

function normalizeQuestionText(text: string): string {
  return text.trim().toLowerCase()
}

export function normalizeAnswerLabel(
  answer: string | boolean | number | null | unknown
): string {
  const formatted = formatRsvpAnswerValue(answer)
  if (formatted === '—') {
    return formatted
  }
  const lower = formatted.trim().toLowerCase()
  if (lower === 'true' || lower === 'yes') {
    return 'Yes'
  }
  if (lower === 'false' || lower === 'no') {
    return 'No'
  }
  return formatted.trim()
}

function findMatchingAnswers(question: EventQuestion, rsvps: RsvpRecord[]) {
  const target = normalizeQuestionText(question.question)
  return rsvps.flatMap((rsvp) =>
    rsvp.answers.filter(
      (entry) => normalizeQuestionText(entry.question) === target
    )
  )
}

function countAnswerSlices(counts: Map<string, number>): ChartSlice[] {
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((slice) => slice.value > 0)
}

function aggregateYesNoChartData(
  question: EventQuestion,
  rsvps: RsvpRecord[]
): ChartSlice[] {
  const counts = new Map<string, number>()
  for (const entry of findMatchingAnswers(question, rsvps)) {
    const label = normalizeAnswerLabel(entry.answer)
    if (label === '—') {
      continue
    }
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return countAnswerSlices(counts)
}

function findMatchingOptionLabel(
  answerLabel: string,
  options: string[]
): string | null {
  const normalizedAnswer = answerLabel.trim().toLowerCase()
  const match = options.find(
    (option) => option.trim().toLowerCase() === normalizedAnswer
  )
  return match ?? null
}

function aggregateOptionsChartData(
  question: EventQuestion,
  rsvps: RsvpRecord[]
): ChartSlice[] {
  const options = question.options ?? []
  const counts = new Map<string, number>()

  for (const entry of findMatchingAnswers(question, rsvps)) {
    const answerLabel = normalizeAnswerLabel(entry.answer)
    if (answerLabel === '—') {
      continue
    }
    const matchedOption = findMatchingOptionLabel(answerLabel, options)
    const sliceLabel = matchedOption ?? answerLabel
    counts.set(sliceLabel, (counts.get(sliceLabel) ?? 0) + 1)
  }

  return countAnswerSlices(counts)
}

export function aggregateQuestionAnswerChartData(
  question: EventQuestion,
  rsvps: RsvpRecord[]
): ChartSlice[] {
  if (question.type === 'YES/NO') {
    return aggregateYesNoChartData(question, rsvps)
  }
  if (question.type === 'OPTIONS') {
    return aggregateOptionsChartData(question, rsvps)
  }
  return []
}

export function countQuestionAnswers(
  question: EventQuestion,
  rsvps: RsvpRecord[]
): number {
  return findMatchingAnswers(question, rsvps).length
}

export function formatRsvpDate(value?: string | null): string | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
