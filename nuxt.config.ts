// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
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
  }], '@nuxt/ui', '@nuxt/icon', '@nuxt/image' ,   'motion-v/nuxt',
],

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
    public: {
      // false when .env is missing or NUXT_PUBLIC_USE_REAL_API is unset / not "true"
      useRealApi: process.env.NUXT_PUBLIC_USE_REAL_API === 'true',
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        'https://bread-butter-backend.onrender.com/api',
    }
  },

  build: {
    transpile: ['reka-ui']
  },

  routeRules: {
    '/': { prerender: true }
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
    'pages:extend'(pages) {
      // This function will find a page by its auto-generated name and update its path
      const setPath = (name: string, path: string) => {
        const page = pages.find(p => p.name === name)
        if (page) {
          page.path = path
        }
      }

      // Set paths for /event/* routes
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
      setPath('EventTasksDashboard', '/event/tasks')
      setPath('EventTasksDashboardPreVamp', '/event/tasks-pre-vamp')
      setPath('EventWishlistDashboard', '/event/wishlist')
      setPath('SubEventDashboard', '/event/sub-event')
      setPath('AddGuestsBulk', '/event/add-guests-bulk')

      // Set paths for /user/* routes
      setPath('UserCreateEvent', '/user/create-event')
      setPath('UserDashboard pre-vamp', '/user/dashboard-pre-vamp')
      setPath('UserDashboard', '/user/dashboard')
      setPath('UserEventDashboard prevamp', '/user/event-dashboard-prevamp')
      setPath('UserEventDashboard', '/user/event-dashboard')
      setPath('UserForgotPassword', '/user/forgot-password')
      setPath('UserLogin', '/user/login')
      setPath('UserOtp', '/user/otp')
      setPath('UserPayment', '/user/payment')
      setPath('UserPaymentPending', '/user/payment-pending')
      setPath('UserProfile', '/user/profile')
      setPath('UserReportIssue', '/user/report-issue')
      setPath('UserSignup copy', '/user/signup-copy')
      setPath('UserSignup', '/user/signup')
      setPath('UserTransactions', '/user/transactions')

      // Set paths for /partners/* routes
      setPath('PartnerDashboard', '/partners')
      setPath('PartnerLogin', '/partners/login')
      setPath('PartnerSignup', '/partners/signup')
      setPath('PartnerForgotPassword', '/partners/forgot-password')

      // Set paths for standalone pages
      setPath('ContactUs', '/contact-us')
      setPath('faqs', '/faqs')
      setPath('InvitationMaker', '/invitation-maker')
      setPath('WebsiteMaker', '/website-maker')
      setPath('OurSuppliers', '/our-suppliers')
    }
  }

})
