import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, subject, message, supplier } = body || {}

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name, email, and message are required.'
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please provide a valid email address.'
    })
  }

  const finalSubject = subject?.trim() || (supplier ? `Inquiry re: ${supplier}` : 'Contact Form Submission - Bread + Butter')
  const recipient = 'hello@bread-plus-butter.com'
  const config = useRuntimeConfig(event)
  const apiKey = (config as any).resendApiKey || process.env.RESEND_API_KEY
  const fromEmail = (config as any).resendFromEmail || process.env.RESEND_FROM_EMAIL || 'Bread + Butter <hello@blinkpunch.com>'

  const textContent = `New Inquiry from Bread + Butter Contact Form

From: ${name.trim()} <${email.trim()}>
${supplier ? `Supplier: ${supplier}\n` : ''}Subject: ${finalSubject}

Message:
${message.trim()}
`

  const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1c1917; background-color: #fdfaf6; border-radius: 12px; border: 1px solid #e7e5e4;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="font-family: Georgia, serif; color: #5d1f00; margin: 0 0 8px 0; font-size: 24px;">New Contact Inquiry</h2>
    <p style="margin: 0; color: #78716c; font-size: 13px;">Bread + Butter Website Contact Form</p>
  </div>

  <div style="background-color: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #e7e5e4; margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Sender:</strong> ${escapeHtml(name.trim())}</p>
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email.trim())}" style="color: #9c3500; font-weight: 500;">${escapeHtml(email.trim())}</a></p>
    ${supplier ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Supplier Inquiry:</strong> <span style="background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${escapeHtml(supplier)}</span></p>` : ''}
    <p style="margin: 0; font-size: 14px;"><strong>Subject:</strong> ${escapeHtml(finalSubject)}</p>
  </div>

  <div style="background-color: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #e7e5e4; margin-bottom: 20px;">
    <h3 style="margin-top: 0; margin-bottom: 10px; color: #44403c; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Message</h3>
    <p style="white-space: pre-wrap; margin: 0; line-height: 1.6; color: #292524; font-size: 14px;">${escapeHtml(message.trim())}</p>
  </div>

  <p style="margin: 0; font-size: 12px; color: #a8a29e; text-align: center;">
    Reply directly to this email to respond to ${escapeHtml(name.trim())} (${escapeHtml(email.trim())}).
  </p>
</div>
`

  if (apiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail.includes('<') ? fromEmail : `Bread + Butter <${fromEmail}>`,
          to: [recipient],
          reply_to: email.trim(),
          subject: `[B+B Inquiry] ${finalSubject}`,
          text: textContent,
          html: htmlContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Resend API response error:', errorData)
        return {
          success: false,
          fallbackMailto: true,
          message: errorData.message || 'Email delivery service error.'
        }
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.id
      }
    } catch (err: any) {
      console.error('Failed to send email via Resend:', err)
      return {
        success: false,
        fallbackMailto: true,
        message: err.message || 'Network error.'
      }
    }
  }

  return {
    success: false,
    fallbackMailto: true,
    message: 'No email service configured.'
  }
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

