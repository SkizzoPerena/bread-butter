import { CalendarDate, type DateValue } from '@internationalized/date'

const df = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export function formatTaskDate(iso?: string | null): string | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return df.format(date)
}

export function formatTaskBudget(budget: number): string {
  return `Php ${budget.toLocaleString()}`
}

export function calendarDateToUtcIso(date: CalendarDate): string {
  const utcMs = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0, 0)
  return new Date(utcMs).toISOString()
}

export function parseIsoToCalendarDate(iso?: string | null): CalendarDate | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new CalendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function calendarDateFromDateValue(value: DateValue | null | undefined): CalendarDate | null {
  if (!value || !('year' in value)) {
    return null
  }
  return new CalendarDate(value.year, value.month, value.day)
}
