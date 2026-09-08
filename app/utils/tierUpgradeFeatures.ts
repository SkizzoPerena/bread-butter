export function getTierFeatureBullets(code: string): string[] {
  switch (code.trim().toUpperCase()) {
    case 'BREAD':
      return [
        'Website Builder',
        'Guest List',
        'RSVP',
        'Invitations',
        'Playlist',
        'Gifts',
        'Payments Management',
      ]
    case 'BUTTER':
      return [
        'All Bread Features',
        'Tasks & Checklists',
        'Suppliers Management',
        'Church Requirements',
        'Schedules',
      ]
    case 'BREAD_BUTTER':
      return [
        'All Bread Features',
        'All Butter Features',
        'Full Collaborator Access',
        'Guest Groups & Tables',
        'Priority Support',
      ]
    default:
      return []
  }
}

export function formatPhp(amount: number): string {
  return `Php ${amount.toLocaleString()}`
}
