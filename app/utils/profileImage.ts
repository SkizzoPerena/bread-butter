import defaultProfileImage from '~/assets/Mirana.jpg'

export { defaultProfileImage }

export function resolveProfileImageUrl(profileImageURL?: string | null): string {
  return profileImageURL?.trim() ? profileImageURL : defaultProfileImage
}
