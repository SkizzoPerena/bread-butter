import { fileURLToPath } from 'node:url'
// https://nuxt.com/docs/api/configuration/nuxt-config - geocode API route enabled
type NuxtHookPage = {
  name?: string
  path: string
  file?: string
}

export default defineNuxtConfig({
  alias: {
    assets: fileURLToPath(new URL('./app/assets', import.meta.url)),
  },
  components: [
    {
      path: '~/components',
      ignore: ['tasks', 'guests', 'event'],
    },
    {
      path: '~/components/tasks',
      pathPrefix: false,
    },
    {
      path: '~/components/guests',
      pathPrefix: false,
    },
    {
      path: '~/components/event',
      pathPrefix: false,
    },
  ],

  modules: [['@nuxt/eslint', {
    stylistic: false
  }], '@nuxt/ui', '@nuxt/icon', '@nuxt/image', 'motion-v/nuxt'],

  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      title: "Bread+Butter, your event's digital home",
      titleTemplate: '%s',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to guest lists and RSVP management.'
        },
        { property: 'og:title', content: "Bread+Butter, your event's digital home" },
        {
          property: 'og:description',
          content: 'Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to guest lists and RSVP management.'
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Bread + Butter' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: "Bread+Butter, your event's digital home" },
        {
          name: 'twitter:description',
          content: 'Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to guest lists and RSVP management.'
        }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://www.bread-plus-butter.com' }
      ]
    }
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light' // Sets the default to light mode
  },

  ui: {
    theme: {
      colors: [
        'primary',
        'secondary',
        'bread',
        'toast',
        'jam',
        'info',
        'success',
        'warning',
        'error',
        'charcoal',
        'blue',
        'emerald',
        'purple',
        'teal',
        'orange',
        'pink',
        'indigo',
        'slate',
        'rose',
        'monochrome',
        'violet',
        'red',
        'cyan',
        'lime',
        'yellow',
        'fuchsia'
      ]
    }
  },

  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'hello@blinkpunch.com',
    public: {
      // false when .env is missing or NUXT_PUBLIC_USE_REAL_API is unset / not "true"
      useRealApi: process.env.NUXT_PUBLIC_USE_REAL_API === 'true',
      isPaymongoActivated: process.env.NUXT_PUBLIC_IS_PAYMONGO_ACTIVATED === 'true',
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        'https://bread-butter-backend.onrender.com/api',
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    }
  },

  build: {
    transpile: ['reka-ui']
  },

  routeRules: {
    '/user/dashboard': { redirect: { to: '/', statusCode: 301 } },
    '/event-dashboard': { redirect: { to: '/event/dashboard-butter', statusCode: 301 } },
    '/event/dashboard': { redirect: { to: '/event/dashboard-butter', statusCode: 301 } },
    '/event/dashboard-v1': { redirect: { to: '/event/dashboard-bread', statusCode: 301 } },
    '/event/dashboard-bread+butter': { redirect: { to: '/event/dashboard-bread-butter', statusCode: 301 } },
    '/dough-makers/login': { redirect: { to: '/partners/login', statusCode: 301 } },
    '/dough-makers/signup': { redirect: { to: '/partners/signup', statusCode: 301 } },
    '/doughmakers/login': { redirect: { to: '/partners/login', statusCode: 301 } },
    '/doughmakers/signup': { redirect: { to: '/partners/signup', statusCode: 301 } },
    '/our-bakery': { redirect: { to: '/our-suppliers', statusCode: 301 } },
    '/bakery': { redirect: { to: '/our-suppliers', statusCode: 301 } },
    '/ourbakery': { redirect: { to: '/our-suppliers', statusCode: 301 } },
    '/suppliers': { redirect: { to: '/our-suppliers', statusCode: 301 } },
  },

  compatibilityDate: '2025-01-15',

  typescript: {
    nodeTsConfig: {
      compilerOptions: {
        types: ['node']
      }
    }
  },

  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    }
  },

  hooks: {
    'pages:extend'(pages: NuxtHookPage[]) {
      // Keep leftover/pre-vamp page files in the repo, but do not expose them as routes.
      const hiddenRouteNames = new Set([
        'EventTasksDashboardPreVamp',
        'UserDashboard',
        'UserEventDashboard prevamp',
        'UserSignup copy',
        'NuxtTemplate'
      ])

      for (let i = pages.length - 1; i >= 0; i--) {
        const page = pages[i]
        const name = page?.name || ''
        const file = String(page?.file || '')
        if (
          hiddenRouteNames.has(name)
          || /pre-vamp|prevamp|signup copy|NuxtTemplate/i.test(`${name} ${file}`)
        ) {
          pages.splice(i, 1)
        }
      }

      // This function will find a page by its auto-generated name and update its path
      const setPath = (name: string, path: string) => {
        const page = pages.find(p => p.name === name)
        if (page) {
          page.path = path
        }
      }

      // Set paths for /event/* routes
      setPath('EventDashboard v1', '/event/dashboard-bread')
      setPath('EventDashboardTesting', '/event/dashboard-testing')
      setPath('EventChurchRequirementsDashboard', '/event/requirements')
      setPath('EventGuestsDashboard', '/event/guests')
      setPath('EventPaymentReview', '/event/payment-review')
      setPath('EventUpgrade', '/event/upgrade')
      setPath('EventEmailCredits', '/event/email-credits')
      setPath('EventPlaylistDashboard', '/event/playlist')
      setPath('EventRSVPDashboard', '/event/rsvp')
      setPath('EventSchedulesDashboard', '/event/schedules')
      setPath('EventSettingsDashboard', '/event/settings')
      setPath('EventSuppliersDashboard', '/event/suppliers')
      setPath('EventBakerDatabase', '/event/bakers')
      setPath('EventTasksDashboard', '/event/tasks')
      setPath('EventWishlistDashboard', '/event/wishlist')
      setPath('SubEventDashboard', '/event/sub-event')
      setPath('AddGuestsBulk', '/event/add-guests-bulk')
      setPath('EventDressCodeDashboard', '/event/dress-code')

      // Set paths for /user/* routes
      setPath('UserCreateEvent', '/user/create-event')
      // EventDashboard v2 serves Butter and Bread + Butter packages, and bridges legacy /user/event-dashboard
      const v2Page = pages.find(p => p.name === 'EventDashboard v2')
      if (v2Page) {
        v2Page.path = '/event/dashboard-butter'
        pages.push({
          ...v2Page,
          name: 'EventDashboardBreadButter',
          path: '/event/dashboard-bread-butter',
        })
        pages.push({
          ...v2Page,
          name: 'EventDashboardUserLegacy',
          path: '/user/event-dashboard',
        })
      }
      setPath('UserForgotPassword', '/user/forgot-password')
      setPath('UserLogin', '/user/login')
      setPath('UserOtp', '/user/otp')
      setPath('UserPayment', '/user/payment')
      setPath('UserPaymentPending', '/user/payment-pending')
      setPath('UserPaymentSuccess', '/user/payment/success')
      setPath('UserProfile', '/user/profile')
      setPath('UserReportIssue', '/user/report-issue')
      setPath('UserSignup', '/user/signup')
      setPath('UserTransactions', '/user/transactions')

      // Set paths for /partners/* routes
      setPath('PartnerDashboard', '/partners')
      setPath('PartnerEvents', '/partners/events')
      setPath('PartnerVouchers', '/partners/vouchers')
      setPath('PartnerCashouts', '/partners/cashouts')
      setPath('PartnerProfile', '/partners/profile')
      setPath('PartnerCollaborations', '/partners/collaborations')
      setPath('PartnerTransactions', '/partners/transactions')
      setPath('PartnerLogin', '/partners/login')
      setPath('PartnerSignup', '/partners/signup')
      setPath('PartnerOtp', '/partners/otp')
      setPath('PartnerForgotPassword', '/partners/forgot-password')
      setPath('BakerLogin', '/bakers/login')
      setPath('BakerSignup', '/bakers/signup')
      // Set paths for standalone pages
      setPath('ContactUs', '/contact-us')
      setPath('faqs', '/faqs')
      setPath('InvitationMaker', '/invitation-maker')
      setPath('WebsiteMaker', '/website-maker')
      setPath('OurSuppliers', '/our-suppliers')
      setPath('About', '/about')
      setPath('NewsAndEvents', '/news-and-events')
      setPath('UsefulTips', '/useful-tips')

      // Set paths for Jam feature routes
      setPath('JamLanding', '/jam')
      const jamLandingPage = pages.find(p => p.name === 'JamLanding')
      if (jamLandingPage) {
        pages.push({
          ...jamLandingPage,
          name: 'JamLandingAlias',
          path: '/jam/landing',
        })
        pages.push({
          ...jamLandingPage,
          name: 'JamLandingDirect',
          path: '/jam-landing',
        })
      }
      const jamDashboard = pages.find(p => p.name === 'JamDashboard')
      if (jamDashboard) {
        jamDashboard.path = '/jam/dashboard/:gatheringId?'
        pages.push({
          ...jamDashboard,
          name: 'JamDashboardDirect',
          path: '/jam-dashboard/:gatheringId?',
        })
        pages.push({
          ...jamDashboard,
          name: 'JamDashboardLegacy',
          path: '/seating/:gatheringId',
        })
      }

      const jamCheckIn = pages.find(p => p.name === 'JamCheckInDashboard')
      if (jamCheckIn) {
        jamCheckIn.path = '/jam/checkin/:gatheringId?'
        pages.push({
          ...jamCheckIn,
          name: 'JamCheckInLegacy',
          path: '/seating/checkin/:gatheringId',
        })
      }

      const jamUpgrade = pages.find(p => p.name === 'JamUpgradeDashboard')
      if (jamUpgrade) {
        jamUpgrade.path = '/user/jam-upgrade/:gatheringId?'
        pages.push({
          ...jamUpgrade,
          name: 'JamUpgradeLegacy',
          path: '/user/seating-upgrade/:gatheringId',
        })
      }

      const jamGuests = pages.find(p => p.name === 'JamGuestsDashboard')
      if (jamGuests) {
        jamGuests.path = '/jam/guests/:gatheringId?'
      }

      const jamInvitation = pages.find(p => p.name === 'JamInvitationDashboard')
      if (jamInvitation) {
        jamInvitation.path = '/jam/invitation/:gatheringId?'
        pages.push({
          ...jamInvitation,
          name: 'JamInvitationDashboardAlias',
          path: '/jam/invite/:gatheringId?',
        })
      }

      const jamTables = pages.find(p => p.name === 'JamTablesDashboard')
      if (jamTables) {
        jamTables.path = '/jam/tables/:gatheringId?'
      }

      const jamSettings = pages.find(p => p.name === 'JamSettingsDashboard')
      if (jamSettings) {
        jamSettings.path = '/jam/settings/:gatheringId?'
      }

      const jamRsvps = pages.find(p => p.name === 'JamRsvpDashboard')
      if (jamRsvps) {
        jamRsvps.path = '/jam/rsvps/:gatheringId?'
        pages.push({
          ...jamRsvps,
          name: 'JamRsvpDashboardAlias',
          path: '/jam/rsvp-manager/:gatheringId?',
        })
      }

      setPath('JamInvitation', '/jam/:token')
      setPath('JamOpenInvite', '/jam/open/:token')
      setPath('JamRsvp', '/jam/rsvp/:token')
      setPath('JamPass', '/attend/:token')
      setPath('JamSeatFinder', '/seat/:token')

      // Set paths for event guest & website routes
      setPath('EventGuestRsvp', '/rsvp/:rsvpId')
      setPath('EventWebsiteView', '/sites/:siteName')
    }
  }

})
