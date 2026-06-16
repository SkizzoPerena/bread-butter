const PLAYLIST_URL_PATTERN =
  /open\.spotify\.com(?:\/intl-[a-z]{2})?\/playlist\/([a-zA-Z0-9]+)/

export function getSpotifyEmbedUrl(playlistUrl: string): string | null {
  if (!playlistUrl?.trim()) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(playlistUrl.trim())
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  const match = parsed.href.match(PLAYLIST_URL_PATTERN)
  if (!match) {
    return null
  }

  return `https://open.spotify.com/embed/playlist/${match[1]}`
}
