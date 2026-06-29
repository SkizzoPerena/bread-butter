export function formatGuestDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim()
  const last = lastName.trim()
  return `${first} ${last}`.trim()
}
