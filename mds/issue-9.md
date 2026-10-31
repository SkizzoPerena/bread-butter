# Issue 9: Guest dashboard still sends invitations through the local Nuxt route

Backend work for this lives on `feat/rsvp-invitation-template`. Once that branch is deployed, `POST /user/rsvps/guest/:id/send` and the event/sub-event send routes use the published Resend template `rsvp-invitation` instead of `generic-notification`. No frontend code was changed. This note is what still has to change in `bread-butter` so production guests receive that template email.

## What production does today

The buttons on the guest list do not use the Render invite endpoint as the email.

In `app/pages/EventGuestsDashboard.vue`, `sendStraightInvitation`:

1. If the guest has no RSVP yet, it calls `sendGuestInvite` (`POST /user/rsvps/guest/:id/send`) and ignores failures (`.catch(() => null)`).
2. It always `POST`s `/api/send-invitation-email` with the stationery-card HTML and PNG.

`/api/send-invitation-email` is `server/api/send-invitation-email.post.ts`. That file only runs while `npm run dev` is serving Nitro. A GoDaddy upload of `npm run generate` is static files, so that request returns 404. The guest then gets only the Render email, which today is the generic “A message from Bread+Butter” message. After the backend branch is deployed, that same first-invite call sends `rsvp-invitation` instead.

Resend and Invite All never reliably hit Render:

- The per-guest send and resend buttons call `sendStraightInvitation` (`title`: “Send/Resend clickable stationery invitation PNG straight”).
- Invite All calls `handleStraightInviteAll`, which loops `sendStraightInvitation`.
- `handleSendGuestInvite` and `handleInviteAll` from `useEventGuestsManager.ts` already call `POST /user/rsvps/guest/:id/send` and `POST /user/rsvps/event/:eventId/send`. `handleSendGuestInvite` is imported on the dashboard and is not used by the template. Those two functions are the ones production should use.

On localhost, a first invite can send two emails: the Render template, then the Nuxt stationery PNG. On GoDaddy, a resend sends nothing, because the guest already has an RSVP so step 1 is skipped and step 2 404s.

## Required frontend change

In `EventGuestsDashboard.vue` only:

- Point the per-guest send, resend, and Invite All actions at `handleSendGuestInvite` / `handleInviteAll` (or `sendGuestInvite` / `sendAllGuestInvites` in `app/composables/useGuests.ts`).
- Stop calling `/api/send-invitation-email` from those actions.
- Do not swallow the backend error. Surface the API message the way `doSendGuestInvite` already does.
- Do not send `html`, `subject`, or `imageBase64`. The backend fills the Resend template from the saved invitation. `POST /user/rsvps/guest/:id/send` already creates a missing RSVP and force-resends an existing one.

Sub-event invites do not need a change for this. `useSubEventGuestsManager` / `useSubEventRsvps` already `POST` to `/user/rsvps/sub-event/:subEventId/send` and `/user/rsvps/sub-event/:subEventId/guest/:guestId/send`, which share the same backend mailer.

`app/components/InvitationEmailPreview.vue` (`handleSendTestEmail`) also `POST`s `/api/send-invitation-email`. That is a local preview of the stationery PNG, not the guest-list send. It will keep 404ing on GoDaddy. Leave it unless test sends should go through Render too.

## What the guest will receive

The published template is a text invitation (guest name, request line, event label, date, time, venue, schedule, deadline, and a “Respond to RSVP” button). It is not the clickable stationery PNG. The PNG email cannot be sent through that template. After this frontend change, guests receive the template email only.

The button links to `${FRONTEND_BASE_URL}/rsvp/:rsvpId`. That host is a Render env var, not something the static site sets. Production `FRONTEND_BASE_URL` must be `https://bread-plus-butter.com`.

`bread-butter-admin` has no invite-email calls.
