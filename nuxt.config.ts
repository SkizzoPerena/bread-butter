// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [['@nuxt/eslint', {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }], '@nuxt/ui', '@nuxt/icon', '@nuxt/image'],


  devtools: {
    enabled: true
  },

  colorMode: {
    preference: 'light' // Sets the default to light mode
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  ui: {
    theme: {
      colors: [
        'primary',
        'secondary',
        'bread',
        'info',
        'success',
        'warning',
        'error'
      ]
    }
  },

})