export function formatDateWithWeekday(dateString: string): string {
  if (!dateString) {
    return ''
  }
  const trimmed = dateString.trim()
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    // Midday (12:00:00) in local browser time completely prevents UTC offset/midnight boundary shifts
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }
  const directDate = new Date(trimmed)
  if (Number.isNaN(directDate.getTime())) {
    return ''
  }
  return directDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(timeString: string): string {
  if (!timeString) {
    return ''
  }
  if (timeString.includes('T')) {
    const date = new Date(timeString)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  }
  const date = new Date(`1970-01-01T${timeString}`)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatIsoDate(iso?: string | null): string {
  if (!iso) {
    return ''
  }
  return formatDateWithWeekday(iso.split('T')[0] ?? iso)
}
