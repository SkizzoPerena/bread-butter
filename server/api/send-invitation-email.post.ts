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

  // Resend default test sender is onboarding@resend.dev unless a custom domain is verified
  const fromSender = (typeof from === 'string' && from.trim()) ? from.trim() : 'onboarding@resend.dev'
  const emailSubject = (typeof subject === 'string' && subject.trim()) ? subject.trim() : 'Wedding Invitation & RSVP'

  // Prepare attachments (including inline CID images)
  let emailAttachments: Array<Record<string, any>> = []
  if (Array.isArray(attachments)) {
    emailAttachments = [...attachments]
  }

  if (imageBase64 && typeof imageBase64 === 'string') {
    const rawContent = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim()
    emailAttachments.push({
      filename: 'wedding-invitation.png',
      content: rawContent,
      content_id: 'invitation-card',
      contentId: 'invitation-card',
      content_type: 'image/png'
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
