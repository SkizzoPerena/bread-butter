import type { GuestTableRow } from '~/composables/useEventGuestsManager'

export interface GuestSearchableRow {
  firstName: string
  lastName: string
  displayName: string
  email: string
  mailingAddress?: string
  contactNumber?: string
  envelopeName?: string
  roleNames?: string[]
}

export function mapGuestTableRowToSearchable(row: GuestTableRow): GuestSearchableRow {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    email: row.email,
    mailingAddress: row.mailingAddress,
    contactNumber: row.contactNumber,
    envelopeName: row.envelopeName,
    roleNames: row.roleNames,
  }
}

export function guestRowMatchesDirectSearch(row: GuestSearchableRow, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true

  const fields = [
    row.firstName,
    row.lastName,
    row.displayName,
    row.email,
    row.mailingAddress ?? '',
    row.contactNumber ?? '',
    row.envelopeName ?? '',
    ...(row.roleNames ?? []),
  ]

  return fields.some((field) => field.toLowerCase().includes(trimmed))
}
