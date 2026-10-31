const SITE_ACCESS_COOKIE_PREFIX = 'bpb_site_access_'
const SITE_ACCESS_MAX_AGE = 60 * 60 * 24 * 30

export function normalizeSiteSlug(siteName: string): string {
  return siteName.trim().toLowerCase()
}

function siteAccessCookieName(siteName: string): string {
  return `${SITE_ACCESS_COOKIE_PREFIX}${normalizeSiteSlug(siteName)}`
}

export function useSiteAccessCookie() {
  function getCookieRef(siteName: string) {
    return useCookie<string | null>(siteAccessCookieName(siteName), {
      default: () => null,
      maxAge: SITE_ACCESS_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    })
  }

  function getSiteAccessToken(siteName: string): string | null {
    return getCookieRef(siteName).value
  }

  function setSiteAccessToken(siteName: string, token: string): void {
    const cookie = getCookieRef(siteName)
    cookie.value = token
  }

  function clearSiteAccessToken(siteName: string): void {
    const cookie = getCookieRef(siteName)
    cookie.value = null
  }

  return {
    getSiteAccessToken,
    setSiteAccessToken,
    clearSiteAccessToken,
  }
}
