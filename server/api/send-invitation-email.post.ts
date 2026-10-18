import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { to, from, subject, html, apiKey: clientApiKey, imageBase64, attachments } = body || {}

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid recipient email address (to) is required.',
    })
  }

  if (!html || typeof html !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email HTML content is required.',
    })
  }

  const apiKey = (clientApiKey || process.env.RESEND_API_KEY || process.env.NUXT_RESEND_API_KEY || '').trim()

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Resend API Key not found. Please provide your Resend API Key (re_...) or set RESEND_API_KEY in your .env file.',
    })
  }

  // Resend sender defaults to RESEND_FROM_EMAIL (e.g. hello@blinkpunch.com) once domain is verified
  const envSender = (process.env.RESEND_FROM_EMAIL || process.env.NUXT_RESEND_FROM_EMAIL || '').trim()
  let fromSender = 'hello@blinkpunch.com'
  if (typeof from === 'string' && from.trim() && from.trim() !== 'onboarding@resend.dev') {
    fromSender = from.trim()
  } else if (envSender) {
    fromSender = envSender
  } else if (typeof from === 'string' && from.trim()) {
    fromSender = from.trim()
  }
  const emailSubject = (typeof subject === 'string' && subject.trim()) ? subject.trim() : 'Wedding Invitation & RSVP'

  // Prepare attachments (including inline CID images)
  let emailAttachments: Array<Record<string, any>> = []
  if (Array.isArray(attachments)) {
    emailAttachments = [...attachments]
  }

  if (imageBase64 && typeof imageBase64 === 'string') {
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const rawContent = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim()
    emailAttachments.push({
      filename: `wedding-invitation.${extension}`,
      content: rawContent,
      content_id: 'invitation-card',
      contentId: 'invitation-card',
      content_type: contentType
    })
  }

  const payload: Record<string, any> = {
    from: fromSender,
    to: [to.trim()],
    subject: emailSubject,
    html: html,
  }

  if (emailAttachments.length > 0) {
    payload.attachments = emailAttachments
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await resendResponse.json()

    if (!resendResponse.ok) {
      const errorMessage = data?.message || data?.error?.message || data?.error || 'Failed to send email via Resend API.'
      throw createError({
        statusCode: resendResponse.status,
        statusMessage: String(errorMessage),
      })
    }

    return {
      success: true,
      id: data?.id,
      message: `Test email successfully sent to ${to}!`,
    }
  } catch (err: any) {
    if (err?.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || 'Unexpected network error communicating with Resend.',
    })
  }
})
