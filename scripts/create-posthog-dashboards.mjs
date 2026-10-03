const host = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/$/, '')
const apiKey = (process.env.POSTHOG_PERSONAL_API_KEY || '').trim()
const projectId = (process.env.POSTHOG_PROJECT_ID || '').trim()

if (!apiKey || !projectId) {
  console.error(
    'PostHog dashboards were not created. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID. Keep that personal key out of the Nuxt app. The public project key cannot create dashboards.',
  )
  process.exit(1)
}

function series(events, options = {}) {
  return events.map((event) => ({
    kind: 'EventsNode',
    event,
    custom_name: event,
    math: options.math || 'total',
    ...(options.mathProperty ? { math_property: options.mathProperty } : {}),
  }))
}

function trend(events, { display, breakdowns = [], math, mathProperty } = {}) {
  const source = {
    kind: 'TrendsQuery',
    series: series(events, { math, mathProperty }),
    interval: 'day',
    dateRange: { date_from: '-90d' },
    trendsFilter: { display },
  }
  if (breakdowns.length === 1) {
    source.breakdownFilter = { breakdown: breakdowns[0], breakdown_type: 'event' }
  } else if (breakdowns.length > 1) {
    source.breakdownFilter = {
      breakdowns: breakdowns.map((property) => ({ property, type: 'event' })),
    }
  }
  return { kind: 'InsightVizNode', source }
}

function funnel(events) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      series: series(events),
      dateRange: { date_from: '-90d' },
      funnelsFilter: { funnelVizType: 'steps', funnelOrderType: 'ordered' },
    },
  }
}

function histogram(name, events, breakdowns) {
  return { name, query: trend(events, { display: 'ActionsBar', breakdowns }) }
}

function table(name, events, breakdowns, math) {
  return {
    name,
    query: trend(events, {
      display: 'ActionsTable',
      breakdowns,
      math: math?.math,
      mathProperty: math?.property,
    }),
  }
}

const authOutcomes = [
  'auth_signed_up',
  'auth_logged_in',
  'auth_logged_out',
  'auth_password_reset_completed',
]
const authRejections = ['auth_login_rejected', 'auth_otp_rejected', 'auth_signup_rejected']
const accountOutcomes = [
  'account_profile_updated',
  'account_password_changed',
  'account_email_notifications_toggled',
]
const eventOutcomes = [
  'event_created',
  'event_updated',
  'event_cancelled',
  'event_resumed',
  'sub_event_saved',
]
const eventRejections = ['event_cancel_rejected', 'event_resume_rejected', 'sub_event_rejected']
const guestOutcomes = [
  'guests_added',
  'guest_updated',
  'guest_removed',
  'guest_group_saved',
  'guest_role_saved',
]
const guestRejections = ['guests_add_rejected', 'guest_group_rejected', 'guest_role_rejected']
const taskOutcomes = ['task_created', 'task_status_changed', 'task_deleted']
const taskRejections = ['task_delete_rejected', 'task_rejected']
const voucherOutcomes = [
  'voucher_created',
  'voucher_updated',
  'voucher_deactivated',
  'voucher_reactivated',
  'voucher_deleted',
  'voucher_redeemed',
]
const voucherRejections = ['voucher_create_rejected', 'voucher_redeem_rejected']

const dashboards = [
  {
    name: 'Auth',
    insights: [
      histogram('Auth outcomes by role', authOutcomes, ['role']),
      table('Auth outcome counts by role', authOutcomes, ['role']),
      histogram('Auth rejections by reason', authRejections, ['reason']),
      table('Auth rejection counts by reason and role', authRejections, ['reason', 'role']),
    ],
  },
  {
    name: 'Account',
    insights: [
      histogram('Account outcomes by role', accountOutcomes, ['role']),
      table('Account outcome counts by role', accountOutcomes, ['role']),
      table('Email notification toggles by enabled', ['account_email_notifications_toggled'], ['enabled']),
      histogram('Password rejections by reason', ['account_password_rejected'], ['reason']),
      table('Password rejection counts by reason', ['account_password_rejected'], ['reason']),
    ],
  },
  {
    name: 'Events',
    insights: [
      histogram('Event outcomes by role', eventOutcomes, ['role']),
      table('Event outcome counts by role, type, and tier', eventOutcomes, ['role', 'event_type', 'tier']),
      { name: 'Event created to payment submitted', query: funnel(['event_created', 'payment_submitted']) },
      histogram('Event rejections by reason', eventRejections, ['reason']),
      table('Event rejection counts by reason', eventRejections, ['reason']),
    ],
  },
  {
    name: 'Payments',
    insights: [
      histogram('Payment proofs by role and tier', ['payment_submitted'], ['role', 'tier']),
      table('Payment proof counts by role and tier', ['payment_submitted'], ['role', 'tier']),
      histogram('Payment rejections by reason', ['payment_submit_rejected'], ['reason']),
      table('Payment rejection counts by reason', ['payment_submit_rejected'], ['reason']),
    ],
  },
  {
    name: 'Pricing',
    insights: [
      histogram('Pricing outcomes by role', ['tier_upgrade_submitted', 'email_credits_purchased'], ['role']),
      table('Pricing outcome counts by role', ['tier_upgrade_submitted', 'email_credits_purchased'], ['role']),
      histogram('Pricing rejections by reason', ['tier_upgrade_rejected', 'email_credits_rejected'], ['reason']),
      table('Pricing rejection counts by reason', ['tier_upgrade_rejected', 'email_credits_rejected'], ['reason']),
    ],
  },
  {
    name: 'Guests',
    insights: [
      histogram('Guest outcomes by role', guestOutcomes, ['role']),
      table('Guests added by source', ['guests_added'], ['source'], { math: 'sum', property: 'guest_count' }),
      { name: 'Guests added to invite sent', query: funnel(['guests_added', 'rsvp_invite_sent']) },
      histogram('Guest rejections by reason', guestRejections, ['reason']),
      table('Guest rejection counts by reason', guestRejections, ['reason']),
    ],
  },
  {
    name: 'RSVP',
    insights: [
      histogram('RSVP outcomes', ['rsvp_invite_sent', 'rsvp_submitted'], []),
      table('Invite counts by role', ['rsvp_invite_sent'], ['role']),
      { name: 'Invite sent to RSVP submitted', query: funnel(['rsvp_invite_sent', 'rsvp_submitted']) },
      histogram('Invite rejections by reason', ['rsvp_invite_rejected'], ['reason']),
      table('Invite rejection counts by reason', ['rsvp_invite_rejected'], ['reason']),
    ],
  },
  {
    name: 'Tasks',
    insights: [
      histogram('Task outcomes by role', taskOutcomes, ['role']),
      table('Task status changes by status', ['task_status_changed'], ['status']),
      histogram('Task rejections by reason', taskRejections, ['reason']),
      table('Task rejection counts by reason', taskRejections, ['reason']),
    ],
  },
  {
    name: 'Custom site',
    insights: [
      histogram('Custom site outcomes', ['custom_site_saved', 'custom_site_published', 'custom_site_viewed'], []),
      table('Custom site saves and publishes by role', ['custom_site_saved', 'custom_site_published'], ['role']),
      { name: 'Custom site saved to published', query: funnel(['custom_site_saved', 'custom_site_published']) },
      histogram('Publish rejections by reason', ['custom_site_publish_rejected'], ['reason']),
      table('Publish rejection counts by reason', ['custom_site_publish_rejected'], ['reason']),
    ],
  },
  {
    name: 'Invitations',
    insights: [
      histogram('Invitations saved by role', ['invitation_saved'], ['role']),
      table('Invitation counts by role', ['invitation_saved'], ['role']),
    ],
  },
  {
    name: 'Church requirements',
    insights: [
      histogram('Church requirements updated by role', ['church_requirement_updated'], ['role']),
      table('Church requirement counts by role', ['church_requirement_updated'], ['role']),
      histogram('Church requirement rejections by reason', ['church_requirement_rejected'], ['reason']),
      table('Church requirement rejection counts by reason', ['church_requirement_rejected'], ['reason']),
    ],
  },
  {
    name: 'Suppliers',
    insights: [
      histogram('Supplier changes by role', ['supplier_saved', 'supplier_removed'], ['role']),
      table('Supplier change counts by role', ['supplier_saved', 'supplier_removed'], ['role']),
      histogram('Supplier rejections by reason', ['supplier_save_rejected'], ['reason']),
      table('Supplier rejection counts by reason', ['supplier_save_rejected'], ['reason']),
    ],
  },
  {
    name: 'Wishlist',
    insights: [
      histogram('Wishlist changes by role', ['wishlist_item_saved', 'wishlist_item_removed'], ['role']),
      table('Wishlist change counts by role', ['wishlist_item_saved', 'wishlist_item_removed'], ['role']),
      histogram('Wishlist rejections by reason', ['wishlist_rejected'], ['reason']),
      table('Wishlist rejection counts by reason', ['wishlist_rejected'], ['reason']),
    ],
  },
  {
    name: 'Playlist',
    insights: [
      histogram('Playlist URLs saved by role', ['playlist_url_saved'], ['role']),
      table('Playlist URL counts by role', ['playlist_url_saved'], ['role']),
    ],
  },
  {
    name: 'Collaboration',
    insights: [
      histogram('Collaboration outcomes by role', ['collaborator_invited', 'collaboration_accepted'], ['role']),
      table('Collaboration outcome counts by role', ['collaborator_invited', 'collaboration_accepted'], ['role']),
      { name: 'Collaborator invited to accepted', query: funnel(['collaborator_invited', 'collaboration_accepted']) },
      histogram('Collaboration rejections by reason', ['collaborator_invite_rejected', 'collaboration_accept_rejected'], ['reason']),
      table('Collaboration rejection counts by reason', ['collaborator_invite_rejected', 'collaboration_accept_rejected'], ['reason']),
    ],
  },
  {
    name: 'Cashouts',
    insights: [
      histogram('Cashouts requested', ['cashout_requested'], []),
      table('Cashout request counts', ['cashout_requested'], []),
      histogram('Cashout rejections by reason', ['cashout_request_rejected'], ['reason']),
      table('Cashout rejection counts by reason', ['cashout_request_rejected'], ['reason']),
    ],
  },
  {
    name: 'Vouchers',
    insights: [
      histogram('Voucher outcomes', voucherOutcomes, []),
      table('Vouchers created by expiry and max uses', ['voucher_created'], ['has_expiry', 'has_max_uses']),
      table('Vouchers redeemed by role', ['voucher_redeemed'], ['role']),
      histogram('Voucher rejections by reason', voucherRejections, ['reason']),
      table('Voucher rejection counts by reason', voucherRejections, ['reason']),
    ],
  },
  {
    name: 'Referrals',
    insights: [
      histogram('Referral codes applied by role', ['referral_code_applied'], ['role']),
      table('Referral code counts by role', ['referral_code_applied'], ['role']),
      histogram('Referral rejections by reason', ['referral_apply_rejected'], ['reason']),
      table('Referral rejection counts by reason', ['referral_apply_rejected'], ['reason']),
    ],
  },
  {
    name: 'Issues',
    insights: [
      histogram('Issue reports by role', ['issue_report_submitted'], ['role']),
      table('Issue report counts by role', ['issue_report_submitted'], ['role']),
    ],
  },
]

async function posthog(path, options = {}) {
  const response = await fetch(`${host}/api/projects/${projectId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body)
    throw new Error(`${response.status} ${path}: ${detail}`)
  }
  return body
}

async function listAll(path) {
  const results = []
  let next = path
  while (next) {
    const page = await posthog(next.startsWith('http') ? next.replace(`${host}/api/projects/${projectId}`, '') : next)
    results.push(...(page.results || []))
    next = page.next || null
  }
  return results
}

async function ensureDashboard(name) {
  const existing = await listAll('/dashboards/?limit=100')
  const found = existing.find((dashboard) => dashboard.name === name)
  if (found) return found
  return posthog('/dashboards/', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description: 'Bread + Butter user frontend. Widgets match docs/posthog-events.md.',
    }),
  })
}

async function existingInsightNames(dashboardId) {
  const dashboard = await posthog(`/dashboards/${dashboardId}/`)
  const names = new Set()
  for (const tile of dashboard.tiles || []) {
    const insightName = tile.insight?.name || tile.insight?.derived_name
    if (insightName) names.add(insightName)
  }
  return names
}

const failures = []

for (const dashboard of dashboards) {
  try {
    const created = await ensureDashboard(dashboard.name)
    const present = await existingInsightNames(created.id)
    for (const insight of dashboard.insights) {
      if (present.has(insight.name)) {
        console.log(`skip ${dashboard.name} / ${insight.name}`)
        continue
      }
      await posthog('/insights/', {
        method: 'POST',
        body: JSON.stringify({
          name: insight.name,
          query: insight.query,
          dashboards: [created.id],
        }),
      })
      console.log(`created ${dashboard.name} / ${insight.name}`)
    }
  } catch (error) {
    failures.push(`${dashboard.name}: ${error.message}`)
    console.error(`${dashboard.name}: ${error.message}`)
  }
}

if (failures.length > 0) {
  process.exit(1)
}

console.log(`PostHog dashboards ready: ${dashboards.map((dashboard) => dashboard.name).join(', ')}`)
