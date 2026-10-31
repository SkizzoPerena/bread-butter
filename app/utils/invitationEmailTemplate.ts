import type { ColorPalette, TypographySet } from '~/utils/websiteTheme'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'

export interface InvitationEmailData {
  requestLine?: string
  eventLabel?: string
  eventDate?: string
  eventTime?: string
  eventVenue?: string
  deadlineText?: string
  deadlineDate?: string
  websiteUrl?: string
  guestName?: string
  bannerImageUrl?: string
}

export const DEFAULT_APP_DOMAIN = 'https://bread-plus-butter.com'

export function buildGuestWebsiteUrl(options: {
  origin?: string
  websiteSlug: string
  rsvpId?: string | null
}): string {
  const origin = (options.origin || DEFAULT_APP_DOMAIN).replace(/\/+$/, '')
  const slug = encodeURIComponent(options.websiteSlug.trim())
  const base = `${origin}/sites/${slug}`
  if (options.rsvpId && options.rsvpId.trim()) {
    return `${base}?rsvpId=${encodeURIComponent(options.rsvpId.trim())}`
  }
  return base
}

export function resolveAbsoluteWebsiteUrl(rawUrl?: string, defaultOrigin = DEFAULT_APP_DOMAIN): string {
  if (!rawUrl || !rawUrl.trim() || rawUrl.trim() === '#') return '#'
  const clean = rawUrl.trim()

  let path = clean
  if (/^https?:\/\//i.test(clean)) {
    try {
      const parsed = new URL(clean)
      // Normalize local dev addresses or old domains to bread-plus-butter.com
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.includes('bread-butter.ph')) {
        path = `${parsed.pathname}${parsed.search}${parsed.hash}`
      } else {
        // Strip any #rsvp hash if present
        return clean.replace(/#rsvp\b/gi, '')
      }
    } catch {
      // fallback to path resolution
    }
  }

  // Ensure no #rsvp hash remains
  path = path.replace(/#rsvp\b/gi, '')

  const cleanOrigin = defaultOrigin.replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanOrigin}${cleanPath}`
}


export function resolveFontFallback(fontName?: string, role: 'header' | 'subheader' | 'body' = 'body'): string {
  if (!fontName) {
    if (role === 'header') return "'Playfair Display', Georgia, 'Times New Roman', serif"
    if (role === 'subheader') return "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
    return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  }
  const clean = fontName.replace(/['"]/g, '').trim()

  const scriptFonts = ['Parisienne', 'Engagement', 'Great Vibes', 'Allura', 'Alex Brush', 'Dancing Script', 'Pinyon Script', 'MonteCarlo']
  const editorialSerifFonts = [
    'Boska', 'Gambetta', 'Sentient', 'Rowan', 'Melodrama', 'Cormorant Garamond',
    'Playfair Display', 'Cinzel', 'Cinzel Decorative', 'Merriweather', 'Lora',
    'Bodoni Moda', 'DM Serif Display', 'Italiana', 'Marcellus', 'Prata', 'Erode'
  ]
  const modernSansFonts = [
    'Satoshi', 'Switzer', 'Bespoke Sans', 'General Sans', 'Amulya', 'Clash Display',
    'Montserrat', 'Outfit', 'Quicksand', 'Inter', 'Open Sans', 'Lato', 'Plus Jakarta Sans',
    'Raleway', 'Nunito Sans'
  ]

  if (scriptFonts.includes(clean)) {
    // Cross-platform script fallbacks:
    // macOS/iOS: Brush Script MT, Apple Chancery, Snell Roundhand
    // Windows: Segoe Script, Lucida Handwriting
    // Universal fallback: Georgia italic, cursive, serif
    return `'${clean}', 'Great Vibes', 'Brush Script MT', 'Apple Chancery', 'Segoe Script', 'Snell Roundhand', 'Lucida Handwriting', cursive, Georgia, serif`
  }

  if (editorialSerifFonts.includes(clean)) {
    // Editorial serif fallbacks:
    // High-tier system/web serifs: Didot, Bodoni MT, Georgia, Palatino
    return `'${clean}', 'Playfair Display', 'Cormorant Garamond', 'Didot', 'Bodoni MT', 'Cinzel', 'Palatino Linotype', 'Book Antiqua', 'Baskerville', Georgia, 'Times New Roman', serif`
  }

  if (modernSansFonts.includes(clean)) {
    return `'${clean}', 'Montserrat', 'Outfit', 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
  }

  return `'${clean}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
}

/**
 * Generates a human-readable, rich text summary from the invitation details.
 * Used as hidden preheader text so email clients (Gmail, Apple Mail, Outlook, mobile notifications)
 * display genuine invitation details in the inbox list view without cluttering
 * the visual body.
 */
export function buildHiddenInvitationPreviewText(invitation: InvitationEmailData): string {
  const parts: string[] = []

  if (invitation.guestName?.trim()) {
    parts.push(`Dear ${invitation.guestName.trim()}`)
  }
  if (invitation.requestLine?.trim()) {
    parts.push(invitation.requestLine.trim())
  }
  if (invitation.eventLabel?.trim()) {
    parts.push(invitation.eventLabel.trim())
  }
  if (invitation.eventDate?.trim()) {
    const formatted = formatDateWithWeekday(invitation.eventDate.trim()) || invitation.eventDate.trim()
    const timeFormatted = invitation.eventTime ? formatTime(invitation.eventTime) : ''
    parts.push(timeFormatted ? `${formatted} at ${timeFormatted}` : formatted)
  }
  if (invitation.eventVenue?.trim()) {
    parts.push(invitation.eventVenue.trim())
  }
  if (invitation.deadlineDate || invitation.deadlineText) {
    const deadlineDateStr = invitation.deadlineDate ? formatDateWithWeekday(invitation.deadlineDate) : ''
    if (deadlineDateStr && invitation.deadlineText) {
      parts.push(`RSVP Deadline: ${deadlineDateStr} (${invitation.deadlineText})`)
    } else if (deadlineDateStr) {
      parts.push(`RSVP Deadline: ${deadlineDateStr}`)
    } else if (invitation.deadlineText) {
      parts.push(`RSVP: ${invitation.deadlineText}`)
    }
  }

  parts.push('Click to open invitation & submit your RSVP')

  return parts.filter(Boolean).join(' • ')
}

/**
 * Renders hidden preheader markup with anti-bleed whitespace padding.
 * Ensures email clients stop reading after the preheader rather than
 * picking up image alt text or random markup into the preview snippet.
 */
export function generatePreheaderHtml(previewText: string): string {
  const cleanSnippet = previewText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // Invisible sequence of non-breaking spaces and zero-width non-joiners
  const paddingHack = '&#847; &zwnj; &nbsp; &#8199; &shy; '.repeat(35)

  return `<!-- Hidden Preheader for Inbox Snippet -->
  <div style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #f7f4ef; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${cleanSnippet}
  </div>
  <!-- Whitespace padding to prevent email clients from pulling following content into snippet -->
  <div style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #f7f4ef; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${paddingHack}
  </div>`
}

export function generateImageInvitationEmailHtml(options: {
  invitation: InvitationEmailData
  palette?: ColorPalette
  typography?: TypographySet
  websiteUrl?: string
  guestName?: string
  imageSrc?: string
}): string {
  const { invitation, websiteUrl = invitation.websiteUrl || '', imageSrc = 'cid:invitation-card' } = options
  const ctaLink = resolveAbsoluteWebsiteUrl(websiteUrl || invitation.websiteUrl)
  const safeHeadline = invitation.eventLabel || 'Alex & Jordan are getting married!'
  const previewText = buildHiddenInvitationPreviewText({
    ...invitation,
    guestName: options.guestName || invitation.guestName
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeHeadline}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f7f4ef; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${generatePreheaderHtml(previewText)}

  <!-- Outer Background Canvas -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f4ef; width: 100%; min-height: 100%;">
    <tr>
      <td align="center" valign="top" style="padding: 32px 16px;">
        
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" width="580" align="center" cellpadding="0" cellspacing="0" border="0" style="width: 580px;">
          <tr>
            <td align="center">
        <![endif]-->

        <!-- Pure Clickable High-Resolution Stationery PNG Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; width: 100%; margin: 0 auto; text-align: center;">
          <tr>
            <td align="center" style="line-height: 0;">
              <a href="${ctaLink}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block; border: 0; outline: none;">
                <img src="${imageSrc}" width="580" alt="${safeHeadline} — Click to view invitation and RSVP" style="display: block; width: 100%; max-width: 580px; height: auto; border: 0; border-radius: 16px; outline: none; text-decoration: none; margin: 0 auto; box-shadow: 0 4px 24px rgba(0,0,0,0.08);" />
              </a>
            </td>
          </tr>
        </table>

        <!--[if (gte mso 9)|(IE)]>
            </td>
          </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`
}

export function generateInvitationEmailHtml(options: {
  invitation: InvitationEmailData
  palette: ColorPalette
  typography: TypographySet
  websiteUrl?: string
  guestName?: string
  mode?: 'text' | 'image'
  imageSrc?: string
}): string {
  if (options.mode === 'image') {
    return generateImageInvitationEmailHtml(options)
  }

  const { invitation, palette, typography, websiteUrl = invitation.websiteUrl || '', guestName = invitation.guestName } = options
  const colors = palette.colors

  const headerFontFamily = resolveFontFallback(typography.headerFont, 'header')
  const subheaderFontFamily = resolveFontFallback(typography.subheaderFont, 'subheader')
  const bodyFontFamily = resolveFontFallback(typography.bodyFont, 'body')

  const formattedDate = formatDateWithWeekday(invitation.eventDate || '') || 'Saturday, October 24, 2026'
  const formattedTime = invitation.eventTime ? formatTime(invitation.eventTime) : ''
  const formattedDeadlineDate = invitation.deadlineDate ? formatDateWithWeekday(invitation.deadlineDate) : ''

  const safeHeadline = invitation.eventLabel || 'Alex & Jordan are getting married!'
  const safeRequestLine = invitation.requestLine || 'Together with their families'
  const safeVenue = invitation.eventVenue || 'The Grand Promenade, Cityville'

  // Convert any relative /sites/... path into a fully qualified absolute URL
  const ctaLink = resolveAbsoluteWebsiteUrl(websiteUrl || invitation.websiteUrl)

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeHeadline}</title>

  <!-- Preconnect & Web Fonts for modern mail clients (Apple Mail, iOS Mail, iPadOS Mail, Thunderbird) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://api.fontshare.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Cinzel:wght@400..700&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&family=Engagement&family=Great+Vibes&family=Inter:wght@400..700&family=Italiana&family=Lato:wght@400;700&family=Lora:ital,wght@0,400..700;1,400..700&family=Montserrat:wght@400;500;600&family=Outfit:wght@400;500;600&family=Parisienne&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Quicksand:wght@500;600&display=swap">
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=gambetta@400,500,700&f[]=satoshi@400,500,700&f[]=switzer@400,500,700&f[]=melodrama@400,500,700&f[]=sentient@400,700&f[]=boska@400,500,700&f[]=rowan@400,700&f[]=bespoke-sans@400,500,700&f[]=general-sans@400,500,600,700&f[]=amulya@400,700&f[]=clash-display@400,500,600,700&display=swap">

  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Cinzel:wght@400..700&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&family=Engagement&family=Great+Vibes&family=Inter:wght@400..700&family=Italiana&family=Lato:wght@400;700&family=Lora:ital,wght@0,400..700;1,400..700&family=Montserrat:wght@400;500;600&family=Outfit:wght@400;500;600&family=Parisienne&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Quicksand:wght@500;600&display=swap');
    @import url('https://api.fontshare.com/v2/css?f[]=gambetta@400,500,700&f[]=satoshi@400,500,700&f[]=switzer@400,500,700&f[]=melodrama@400,500,700&f[]=sentient@400,700&f[]=boska@400,500,700&f[]=rowan@400,700&f[]=bespoke-sans@400,500,700&f[]=general-sans@400,500,600,700&f[]=amulya@400,700&f[]=clash-display@400,500,600,700&display=swap');

    /* Reset Styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      margin: 0;
      padding: 0;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: separate !important;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f7f4ef;
    }
  </style>

  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
    .email-headline { font-family: Georgia, 'Times New Roman', serif !important; font-style: italic !important; }
    .email-subhead { font-family: Georgia, 'Times New Roman', serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: ${bodyFontFamily};">
  ${generatePreheaderHtml(buildHiddenInvitationPreviewText({ ...invitation, guestName }))}

  <!-- Outer Background Canvas -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f4ef; width: 100%; min-height: 100%;">
    <tr>
      <td align="center" valign="top" style="padding: 40px 16px; background-color: #f7f4ef;">
        
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" width="580" align="center" cellpadding="0" cellspacing="0" border="0" style="width: 580px;">
          <tr>
            <td align="center">
        <![endif]-->

        <!-- Main Invitation Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; width: 100%; background-color: ${colors.primary}; border: 2px solid ${colors.secondary}; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); margin: 0 auto; text-align: center;">
          <tr>
            <!-- Card Margin Gutter -->
            <td style="padding: 12px; background-color: ${colors.primary}; border-radius: 14px;">
              
              <!-- Inner Double Border Frame -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid ${colors.secondary}66; border-radius: 10px; width: 100%;">
                <tr>
                  <!-- Bulletproof Inner Content Padding on <td> -->
                  <td align="center" style="padding: 44px 28px 40px 28px; text-align: center;">

                    ${guestName ? `
                    <!-- Personal Guest Greeting -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="font-family: ${subheaderFontFamily}; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: ${colors.secondary_text_color}; padding-bottom: 12px; line-height: 1.4;">
                          Dear ${guestName},
                        </td>
                      </tr>
                    </table>` : ''}

                    <!-- Introductory Request Line -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="font-family: ${subheaderFontFamily}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: ${colors.secondary_text_color}; padding-bottom: 22px; line-height: 1.45;">
                          ${safeRequestLine}
                        </td>
                      </tr>
                    </table>

                    <!-- Event Headline -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" class="email-headline" style="font-family: ${headerFontFamily}; font-size: 38px; line-height: 1.25; font-weight: bold; color: ${colors.text_color}; padding-bottom: 24px; word-break: break-word;">
                          ${safeHeadline}
                        </td>
                      </tr>
                    </table>

                    <!-- Date, Time and Venue Details -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" class="email-subhead" style="font-family: ${subheaderFontFamily}; font-size: 17px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: ${colors.text_color}; padding-bottom: 4px; line-height: 1.35;">
                          ${formattedDate}
                        </td>
                      </tr>
                      ${formattedTime ? `
                      <tr>
                        <td align="center" style="font-family: ${bodyFontFamily}; font-size: 14px; font-weight: 500; color: ${colors.secondary_text_color}; padding-bottom: 6px; line-height: 1.4;">
                          ${formattedTime}
                        </td>
                      </tr>` : ''}
                      ${safeVenue ? `
                      <tr>
                        <td align="center" style="font-family: ${subheaderFontFamily}; font-size: 14px; font-weight: 500; color: ${colors.text_color}; padding-top: 6px; padding-bottom: 8px; line-height: 1.4;">
                          📍 ${safeVenue}
                        </td>
                      </tr>` : ''}
                    </table>

                    <!-- Decorative Stationery Divider -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding: 14px 0 24px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                            <tr>
                              <td style="width: 48px; height: 1px; background-color: ${colors.secondary}; font-size: 0; line-height: 0;">&nbsp;</td>
                              <td style="padding: 0 12px; font-size: 13px; color: ${colors.secondary}; line-height: 1; text-align: center;">✦</td>
                              <td style="width: 48px; height: 1px; background-color: ${colors.secondary}; font-size: 0; line-height: 0;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- RSVP Here CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding: 4px 0 24px 0;">
                          <!-- Bulletproof Button Container -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                            <tr>
                              <td align="center" style="border-radius: 9999px; background-color: ${colors.secondary}; text-align: center;">
                                <a href="${ctaLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${colors.secondary}; color: ${colors.secondary_text_color}; font-family: ${subheaderFontFamily}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 44px; border-radius: 9999px; border: 1px solid ${colors.secondary}; letter-spacing: 0.04em; -webkit-text-size-adjust: none;">
                                  RSVP Here &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center" style="padding-top: 12px; font-family: ${bodyFontFamily}; font-size: 11px; line-height: 1.4; color: ${colors.secondary_text_color}; opacity: 0.85;">
                                Press the button above to view our website and submit your RSVP.
                              </td>
                            </tr>
                            ${ctaLink !== '#' ? `
                            <tr>
                              <td align="center" style="padding-top: 8px; font-family: ${bodyFontFamily}; font-size: 10px; line-height: 1.4; color: ${colors.secondary_text_color}; opacity: 0.75; word-break: break-all;">
                                Direct website link: <a href="${ctaLink}" target="_blank" rel="noopener noreferrer" style="color: ${colors.secondary_text_color}; text-decoration: underline; font-weight: 500;">${ctaLink}</a>
                              </td>
                            </tr>` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- RSVP Deadline & Notes -->
                    ${(invitation.deadlineText || formattedDeadlineDate) ? `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="border-top: 1px solid ${colors.secondary}35; padding-top: 22px;">
                          ${invitation.deadlineText ? `
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center" style="font-family: ${bodyFontFamily}; font-size: 13px; color: ${colors.secondary_text_color}; line-height: 1.5; padding-bottom: 12px; max-width: 440px;">
                                ${invitation.deadlineText}
                              </td>
                            </tr>
                          </table>` : ''}
                          ${formattedDeadlineDate ? `
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                            <tr>
                              <td align="center" style="background-color: ${colors.secondary}18; border: 1px solid ${colors.secondary}50; border-radius: 9999px; padding: 7px 20px; font-family: ${subheaderFontFamily}; font-size: 12px; font-weight: 600; color: ${colors.secondary_text_color};">
                                RSVP Deadline: ${formattedDeadlineDate}
                              </td>
                            </tr>
                          </table>` : ''}
                        </td>
                      </tr>
                    </table>` : ''}

                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!--[if (gte mso 9)|(IE)]>
            </td>
          </tr>
        </table>
        <![endif]-->

        <!-- Subtle Footer Branding -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; width: 100%; margin: 18px auto 0 auto; text-align: center;">
          <tr>
            <td align="center" style="font-family: ${bodyFontFamily}; font-size: 11px; color: #8c827a; line-height: 1.4;">
              Created with Bread + Butter
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}
