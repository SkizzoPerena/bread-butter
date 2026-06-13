export function formatDateWithWeekday(dateString: string): string {
  if (!dateString) {
    return ''
  }
  const date = new Date(dateString.replace(/-/g, '/'))
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleDateString(undefined, {
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
