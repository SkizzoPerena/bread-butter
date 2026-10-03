# PostHog events

Custom events fire after the API responds, not when a button is pressed. The bread-butter app sends only the names and params in this file. Page views come from the PostHog SDK. Autocapture and session replay stay off.

If `NUXT_PUBLIC_POSTHOG_KEY` is empty, nothing is sent.

Unexpected server failures stay in Sentry. Missing required fields and other form-validation replies are not PostHog events.

## Actors

| `role` | Who |
| --- | --- |
| `user` | Logged-in couple or celebrant account |
| `partner` | Logged-in planner account |
| `guest` | Public RSVP or wedding-site visitor, with no account |

There is no supplier login. `supplier_saved` and `supplier_removed` use the `role` of the user or partner who changed the supplier record. Admin accounts are not instrumented.

People are identified by the app user id from the access token (`sub`). Email, name, phone, OTP, voucher codes, guest lists, and free-text messages are not event params.

## Shared params

Include these only when they apply:

| Param | Values |
| --- | --- |
| `role` | `user`, `partner`, `guest` |
| `event_id` | Wedding event id |
| `event_type` | Event type string from the API |
| `tier` | Price tier code |
| `is_catholic_wedding` | `true` or `false` |

A histogram is a daily bar chart. A table is the same events as rows. Rejection widgets split by `reason`. Funnels use success events only.

## Auth

| Event | When | Params |
| --- | --- | --- |
| `auth_signed_up` | Email verification succeeds and the account is created | `role` |
| `auth_logged_in` | Login succeeds | `role` |
| `auth_logged_out` | Logout is requested | `role` |
| `auth_password_reset_completed` | Forgot-password change succeeds | `role` |
| `auth_login_rejected` | Login is refused | `role`, `reason`: `invalid_credentials` (unknown email or wrong password), `restricted` |
| `auth_otp_rejected` | An OTP check is refused | `role`, `reason`: `expired`, `already_used`, `session_expired` |
| `auth_signup_rejected` | Registration is refused because the email belongs to an account | `role`, `reason`: `email_taken` |

### Auth dashboard

- Histogram of `auth_signed_up`, `auth_logged_in`, `auth_logged_out`, and `auth_password_reset_completed`, split by `role`.
- Table of those counts by `role`.
- Histogram of `auth_login_rejected`, `auth_otp_rejected`, and `auth_signup_rejected`, split by `reason`.
- Table of rejection counts by `reason` and `role`.

## Account

| Event | When | Params |
| --- | --- | --- |
| `account_profile_updated` | Profile fields or profile photo save succeeds | `role` |
| `account_password_changed` | Password change succeeds | `role` |
| `account_password_rejected` | Current password is wrong | `role`, `reason`: `incorrect_current` |
| `account_email_notifications_toggled` | Email notifications are enabled or disabled | `role`, `enabled` |

### Account dashboard

- Histogram of `account_profile_updated`, `account_password_changed`, and `account_email_notifications_toggled`, split by `role`.
- Table of those counts by `role`, and for the toggle by `enabled`.
- Histogram and table of `account_password_rejected` by `reason`.

## Events

| Event | When | Params |
| --- | --- | --- |
| `event_created` | Event creation succeeds | `role`, `event_id`, `event_type`, `tier`, `is_catholic_wedding` |
| `event_updated` | Event details save succeeds | `role`, `event_id`, `event_type`, `is_catholic_wedding` |
| `event_cancelled` | Cancel succeeds | `role`, `event_id` |
| `event_cancel_rejected` | Cancel is refused because the event date has passed | `role`, `event_id`, `reason`: `past_date` |
| `event_resumed` | Resume succeeds | `role`, `event_id` |
| `event_resume_rejected` | Resume is refused because the event date has passed | `role`, `event_id`, `reason`: `past_date` |
| `sub_event_saved` | A schedule sub-event is created or updated | `role`, `event_id` |
| `sub_event_rejected` | Sub-event date is not before the main event | `role`, `reason`: `date_not_before_main` |

The current screens save event details and sub-events. Cancel and resume are captured when those API calls run.

### Events dashboard

- Histogram of `event_created`, `event_updated`, `event_cancelled`, `event_resumed`, and `sub_event_saved`, split by `role`.
- Table by `role`, `event_type`, and `tier`.
- Funnel from `event_created` to `payment_submitted`.
- Histogram and table of `event_cancel_rejected`, `event_resume_rejected`, and `sub_event_rejected` by `reason`.

## Payments

| Event | When | Params |
| --- | --- | --- |
| `payment_submitted` | Payment proof upload succeeds | `role`, `event_id`, `tier` |
| `payment_submit_rejected` | The event is already fully paid | `role`, `event_id`, `reason`: `already_paid` |

### Payments dashboard

- Histogram of `payment_submitted` split by `role` and `tier`.
- Table by `role` and `tier`.
- Histogram and table of `payment_submit_rejected` by `reason`.

## Pricing

| Event | When | Params |
| --- | --- | --- |
| `tier_upgrade_submitted` | Tier upgrade payment proof succeeds | `role`, `event_id` |
| `tier_upgrade_rejected` | Upgrade is refused | `role`, `event_id`, `reason`: `not_fully_paid`, `already_paid` |
| `email_credits_purchased` | Email-credit payment proof succeeds | `role`, `event_id` |
| `email_credits_rejected` | Email-credit purchase is refused | `role`, `event_id`, `reason`: `not_fully_paid`, `already_paid` |

### Pricing dashboard

- Histogram of `tier_upgrade_submitted` and `email_credits_purchased`, split by `role`.
- Table by `role`.
- Histogram and table of `tier_upgrade_rejected` and `email_credits_rejected` by `reason`.

## Guests

| Event | When | Params |
| --- | --- | --- |
| `guests_added` | One guest or a bulk add succeeds | `role`, `event_id`, `guest_count`, `source`: `single` or `bulk` |
| `guests_add_rejected` | That email is already on the list | `role`, `event_id`, `reason`: `already_on_list` |
| `guest_updated` | A guest save succeeds | `role` |
| `guest_removed` | A guest is removed | `role` |
| `guest_group_saved` | A guest group is created or updated | `role` |
| `guest_group_rejected` | A guest is already in a group | `role`, `reason`: `already_in_group` |
| `guest_role_saved` | A guest role is created or updated | `role` |
| `guest_role_rejected` | That role name already exists | `role`, `reason`: `name_taken` |

### Guests dashboard

- Histogram of `guests_added`, `guest_updated`, `guest_removed`, `guest_group_saved`, and `guest_role_saved`, split by `role`.
- Table of `guests_added` by `source`, with `guest_count` summed.
- Funnel from `guests_added` to `rsvp_invite_sent`.
- Histogram and table of the guest rejection events by `reason`.

## RSVP

| Event | When | Params |
| --- | --- | --- |
| `rsvp_invite_sent` | An invite send succeeds | `role`, `event_id` when sending for a whole event, `invite_count` |
| `rsvp_invite_rejected` | Invites are refused | `role`, `reason`: `insufficient_credits`, `event_cancelled` |
| `rsvp_submitted` | A guest submits an RSVP | `role`: `guest` |

No guest name or email is attached. The respond API accepts another status later, so a second response is another `rsvp_submitted`.

### RSVP dashboard

- Histogram of `rsvp_invite_sent` and `rsvp_submitted`.
- Table of invite counts by `role`. RSVP submits have no personal columns.
- Funnel from `rsvp_invite_sent` to `rsvp_submitted`.
- Histogram and table of `rsvp_invite_rejected` by `reason`.

## Tasks

| Event | When | Params |
| --- | --- | --- |
| `task_created` | Task creation succeeds | `role`, `event_id` |
| `task_status_changed` | Status update succeeds | `role`, `status` |
| `task_deleted` | Permanent delete succeeds | `role` |
| `task_delete_rejected` | Delete is refused | `role`, `reason`: `not_todo` |
| `task_rejected` | Create, update, or delete is refused because the event is cancelled | `role`, `reason`: `event_cancelled` |

### Tasks dashboard

- Histogram of `task_created`, `task_status_changed`, and `task_deleted`, split by `role`.
- Table of `task_status_changed` by `status`.
- Histogram and table of `task_delete_rejected` and `task_rejected` by `reason`.

## Custom site

| Event | When | Params |
| --- | --- | --- |
| `custom_site_saved` | Site create or update succeeds | `role`, `event_id` |
| `custom_site_published` | Publish succeeds | `role` |
| `custom_site_publish_rejected` | Publish is refused because the event is not fully paid | `role`, `reason`: `not_fully_paid` |
| `custom_site_viewed` | A public site loads | `role`: `guest` |

The public view does not include the site slug or the couple's names.

### Custom site dashboard

- Histogram of `custom_site_saved`, `custom_site_published`, and `custom_site_viewed`.
- Table of saves and publishes by `role`.
- Funnel from `custom_site_saved` to `custom_site_published`.
- Histogram and table of `custom_site_publish_rejected` by `reason`.

## Invitations

| Event | When | Params |
| --- | --- | --- |
| `invitation_saved` | Invitation create or update succeeds | `role` |

### Invitations dashboard

- Histogram of `invitation_saved` split by `role`.
- Table by `role`.

## Church requirements

| Event | When | Params |
| --- | --- | --- |
| `church_requirement_updated` | A requirement or party detail save succeeds | `role` |
| `church_requirement_rejected` | The save is refused | `role`, `reason`: `not_wedding`, `event_cancelled` |

### Church requirements dashboard

- Histogram of `church_requirement_updated` split by `role`.
- Table by `role`.
- Histogram and table of `church_requirement_rejected` by `reason`.

## Suppliers

| Event | When | Params |
| --- | --- | --- |
| `supplier_saved` | Supplier create or update succeeds | `role` |
| `supplier_removed` | Supplier delete succeeds | `role` |
| `supplier_save_rejected` | The save is refused | `role`, `reason`: `settled_exceeds_total`, `already_exists`, `event_cancelled` |

### Suppliers dashboard

- Histogram of `supplier_saved` and `supplier_removed` split by `role`.
- Table by `role`.
- Histogram and table of `supplier_save_rejected` by `reason`.

## Wishlist

| Event | When | Params |
| --- | --- | --- |
| `wishlist_item_saved` | A gift or QR entry is created or updated | `role` |
| `wishlist_item_removed` | A gift or QR entry is removed | `role` |
| `wishlist_rejected` | The change is refused because the event is cancelled | `role`, `reason`: `event_cancelled` |

### Wishlist dashboard

- Histogram of `wishlist_item_saved` and `wishlist_item_removed` split by `role`.
- Table by `role`.
- Histogram and table of `wishlist_rejected` by `reason`.

## Playlist

| Event | When | Params |
| --- | --- | --- |
| `playlist_url_saved` | A playlist URL is created or updated | `role` |

The Spotify URL is not a param.

### Playlist dashboard

- Histogram of `playlist_url_saved` split by `role`.
- Table by `role`.

## Collaboration

| Event | When | Params |
| --- | --- | --- |
| `collaborator_invited` | An invite send succeeds | `role`, `event_id` |
| `collaborator_invite_rejected` | The invite is refused | `role`, `event_id`, `reason`: `self`, `already_collaborator`, `already_invited`, `not_found` |
| `collaboration_accepted` | The invitee accepts | `role` |
| `collaboration_accept_rejected` | Accept is refused | `role`, `reason`: `not_invitee` |

Invite capture runs when the invite API is called. The current partner screen accepts invites; it does not send them.

### Collaboration dashboard

- Histogram of `collaborator_invited` and `collaboration_accepted` split by `role`.
- Table by `role`.
- Funnel from `collaborator_invited` to `collaboration_accepted`.
- Histogram and table of the rejection events by `reason`.

## Cashouts

| Event | When | Params |
| --- | --- | --- |
| `cashout_requested` | A partner cashout request succeeds | `role`: `partner` |
| `cashout_request_rejected` | The request is refused | `role`: `partner`, `reason`: `insufficient_credit` |

The amount is not a param. Admin review of a cashout is not an event.

### Cashouts dashboard

- Histogram of `cashout_requested`.
- Table of request counts.
- Histogram and table of `cashout_request_rejected` by `reason`.

## Vouchers

| Event | When | Params |
| --- | --- | --- |
| `voucher_created` | Partner creates a voucher | `role`: `partner`, `has_expiry`, `has_max_uses` |
| `voucher_create_rejected` | That code is already taken | `role`: `partner`, `reason`: `code_taken` |
| `voucher_updated` | Partner updates a voucher | `role`: `partner` |
| `voucher_deactivated` | Partner deactivates a voucher | `role`: `partner` |
| `voucher_reactivated` | Partner reactivates a voucher | `role`: `partner` |
| `voucher_deleted` | Partner deletes a voucher | `role`: `partner` |
| `voucher_redeemed` | Event creation succeeds with a voucher code | `role`, `event_id` |
| `voucher_redeem_rejected` | A code check or event creation refuses the voucher | `role`, `reason`: `expired`, `already_used`, `inactive`, `max_uses`, `wrong_tier`, `already_applied`, `not_found`, `partner_unavailable`, `partner_restricted` |

The voucher code is not a param.

### Vouchers dashboard

- Histogram of `voucher_created`, `voucher_updated`, `voucher_deactivated`, `voucher_reactivated`, `voucher_deleted`, and `voucher_redeemed`.
- Table of creates by `has_expiry` and `has_max_uses`, and of redeems by `role`.
- Histogram of `voucher_create_rejected` and `voucher_redeem_rejected` split by `reason`.
- Table of those rejection counts by `reason`.

## Referrals

| Event | When | Params |
| --- | --- | --- |
| `referral_code_applied` | Registration accepts a referral code | `role` |
| `referral_apply_rejected` | The code is not a real referral | `role`, `reason`: `invalid_code` |

The code itself is not a param.

### Referrals dashboard

- Histogram of `referral_code_applied` split by `role`.
- Table by `role`.
- Histogram and table of `referral_apply_rejected` by `reason`.

## Issues

| Event | When | Params |
| --- | --- | --- |
| `issue_report_submitted` | An issue report succeeds | `role` |

Issue reports have a title and description, not a category. Those fields are not params, so the table is by `role` only.

### Issues dashboard

- Histogram of `issue_report_submitted` split by `role`.
- Table by `role`.

## Creating the dashboards

The widgets above are created in the PostHog project, not by the public project key in the Nuxt app. `scripts/create-posthog-dashboards.mjs` creates one dashboard per domain, with the histograms, tables, and funnels listed here.

Run it with a personal API key that stays out of the frontend:

```
POSTHOG_PERSONAL_API_KEY=... POSTHOG_PROJECT_ID=... node scripts/create-posthog-dashboards.mjs
```

`POSTHOG_HOST` defaults to `https://us.posthog.com`. The script skips a dashboard insight that already exists under the same name. Dashboards stay empty until the app is capturing the matching events.
