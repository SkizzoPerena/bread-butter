import defaultCover from '~/assets/bpb-images/wedding-1.jpg'

export { defaultCover }

export function resolveEventCoverImageUrl(coverImageURL?: string | null): string {
  return coverImageURL?.trim() ? coverImageURL : defaultCover
}
