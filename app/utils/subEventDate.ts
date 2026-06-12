import { CalendarDate } from '@internationalized/date'

function utcCalendarStartMs(iso: string): number | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function isoToCalendarDate(iso: string): CalendarDate | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new CalendarDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
}

export function isSubEventDateBeforeParent(
  subEventIso: string,
  parentEventIso: string
): boolean {
  const subMs = utcCalendarStartMs(subEventIso)
  const parentMs = utcCalendarStartMs(parentEventIso)
  if (subMs === null || parentMs === null) {
    return false
  }
  return subMs < parentMs
}

export function parentEventMaxSubEventDate(parentEventIso: string): CalendarDate | null {
  const parent = isoToCalendarDate(parentEventIso)
  if (!parent) {
    return null
  }
  return parent.subtract({ days: 1 })
}
