export function attendanceTokenFromScan(value: string): string {
  const text = value.trim()
  if (/^[a-f0-9]{48}$/i.test(text)) return text.toLowerCase()

  try {
    const url = new URL(text)
    const parts = url.pathname.split('/').filter(Boolean)
    const index = parts.findIndex((part) => part === 'attend')
    const token = index >= 0 ? parts[index + 1] || '' : ''
    if (/^[a-f0-9]{48}$/i.test(token)) return token.toLowerCase()
  } catch {
    return ''
  }

  return ''
}

export function currentOriginPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (import.meta.client) return `${window.location.origin}${normalized}`
  return normalized
}
