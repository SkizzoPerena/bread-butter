export const defaultProfileImage = '/images/default-avatar.png'

export function resolveProfileImageUrl(profileImageURL?: string | null): string {
  return profileImageURL?.trim() ? profileImageURL : defaultProfileImage
}
