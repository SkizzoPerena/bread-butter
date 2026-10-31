# Bread + Butter: Guest Invitation Email Discrepancy & Fix Guide

## 1. Executive Summary

When testing locally (`npm run dev`), sending a guest invitation sends the latest automated invitation email (with stationery card PNG & rich HTML styling). However, after running `npm run generate` and uploading the `.output/public` static folder to GoDaddy hosting, the same action sends the legacy email with the subject **"A message from Bread+Butter"**.

---

## 2. Root Cause Analysis

There are two separate requests being triggered when sending an invitation from the guest list:

```
[Browser on EventGuestsDashboard.vue]
       │
       ├── 1. Line 310: sendGuestInvite(guestId)
       │       └── Calls Render Backend: POST /user/rsvps/guest/:id/send
       │           └── ⚠️ Render Backend sends the OLD email: "A message from Bread+Butter"
       │
       └── 2. Line 353: $fetch('/api/send-invitation-email')
               ├── In Local Dev (npm run dev):
               │   └── Handled by local Nuxt Nitro Node server -> Sends NEW Resend email ✅
               │
               └── On GoDaddy (npm run generate static upload):
                   └── ❌ 404 Not Found! No Nitro Node.js server runs on GoDaddy static hosting.
```

### Why it works locally:
1. In `npm run dev`, Nuxt runs a local **Nitro Node.js server** (`localhost:3000`).
2. The frontend calls `/api/send-invitation-email`, which is executed by `server/api/send-invitation-email.post.ts`.
3. That server route reads `RESEND_API_KEY` from `.env` and sends the modern HTML stationery card email via Resend.

### Why it fails on GoDaddy:
1. `npm run generate` compiles the app into pure static files (`.output/public` — HTML, CSS, JS).
2. GoDaddy shared/static hosting (Apache/cPanel) only serves static files and does not run a persistent Node.js / Nitro process.
3. When the browser on GoDaddy calls `POST /api/send-invitation-email`, GoDaddy returns **404 Not Found**.

### Why the recipient receives the old email:
In `app/pages/EventGuestsDashboard.vue`:
```typescript
// 1. If guest has no RSVP record yet, register with backend once so MongoDB record exists
if (!guest.rsvp?._id) {
  await sendGuestInvite(guestId).catch(() => null)
}
```
`sendGuestInvite(guestId)` calls the live Express backend on Render:
`POST https://bread-butter-backend.onrender.com/api/user/rsvps/guest/:id/send`

The Render backend's controller automatically triggers its own built-in email with the subject:
**"A message from Bread+Butter"**.

Because the subsequent call to `/api/send-invitation-email` 404s on GoDaddy, **only the backend's old email ever gets sent**.

---

## 3. Recommended Fix on the Render Backend (For Paolo)

Since GoDaddy is hosting static client files without a Node server, the email dispatch should be centralized directly on the **Render Express backend**.

### Option A: Allow `POST /user/rsvps/guest/:id/send` to accept custom email content (Recommended)

In the backend RSVP controller (e.g. `routes/rsvp.js` or `controllers/rsvpController.js`):

```javascript
router.post('/user/rsvps/guest/:id/send', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { html, subject, imageBase64 } = req.body || {};

    const guest = await Guest.findById(id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    // 1. Existing RSVP creation/retrieval logic:
    let rsvp = await Rsvp.findOne({ guest: guest._id });
    if (!rsvp) {
      rsvp = await Rsvp.create({
        guest: guest._id,
        event: guest.event,
        status: 'PENDING',
        invitedAt: new Date(),
      });
    } else {
      rsvp.invitedAt = new Date();
      await rsvp.save();
    }

    // 2. Prepare attachments if inline stationery card is provided
    const attachments = [];
    if (imageBase64 && typeof imageBase64 === 'string') {
      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
      const rawContent = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
      attachments.push({
        filename: 'wedding-invitation.png',
        content: rawContent,
        content_id: 'invitation-card',
        contentId: 'invitation-card', // compatibility
        contentType: contentType,
      });
    }

    // 3. Resolve Subject and HTML
    const emailSubject = (typeof subject === 'string' && subject.trim())
      ? subject.trim()
      : `${guest.firstName}, you're invited!`;

    const emailHtml = (typeof html === 'string' && html.trim())
      ? html
      : defaultOldTemplate(guest); // Fallback to existing template if no HTML supplied

    // 4. Send Email via Resend (or existing mail provider)
    // using backend env: RESEND_API_KEY
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@blinkpunch.com',
        to: [guest.email.trim()],
        subject: emailSubject,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    } else {
      // Or your existing nodemailer / sendgrid transporter:
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'hello@blinkpunch.com',
        to: guest.email,
        subject: emailSubject,
        html: emailHtml,
        attachments,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Invitation email successfully sent.',
      rsvpId: rsvp._id,
    });
  } catch (error) {
    console.error('Error sending guest invite:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});
```

---

### Option B: Provide a dedicated `POST /user/send-invitation-email` on Render

If Paolo prefers to keep RSVP status updating and custom email dispatching separate:
1. Move the logic from Nuxt's `server/api/send-invitation-email.post.ts` into a new Express route on Render:
   `POST https://bread-butter-backend.onrender.com/api/user/send-invitation-email`
2. Add `RESEND_API_KEY` to Render's Environment Variables dashboard.
3. In `POST /user/rsvps/guest/:id/send`, remove the automated legacy email so it only creates/updates the database record without sending the old email.

---

## 4. Frontend Change (Once Backend is Ready)

Once the backend is updated with either approach above, update [EventGuestsDashboard.vue](file:///app/pages/EventGuestsDashboard.vue):

Instead of calling the local Nuxt URL `/api/send-invitation-email`:
```typescript
// Replace:
await $fetch('/api/send-invitation-email', { ... })

// With direct backend call:
const { apiRequest } = useApiMode()
await apiRequest(`/user/rsvps/guest/${guestId}/send`, {
  method: 'POST',
  body: {
    subject: `${safeHeadline} — Your Invitation & RSVP`,
    html: finalHtml,
    imageBase64: cardImage || undefined,
  },
})
```

### Benefits:
- **Zero 404s on GoDaddy**: The frontend does not depend on a local Node.js server.
- **No duplicate emails**: The guest receives exactly one email — the latest styled version.
- **Secure Credentials**: `RESEND_API_KEY` stays safely on Render rather than exposed in client builds.
