// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  components: [
    {
      path: '~/components',
      ignore: ['tasks'],
    },
    {
      path: '~/components/tasks',
      pathPrefix: false,
    },
  ],

  modules: [['@nuxt/eslint', {
    stylistic: false
  }], '@nuxt/ui', '@nuxt/icon', '@nuxt/image'],

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
        'error'
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
  }
})
