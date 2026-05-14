export const useApi = () => {
  const token = useCookie('auth_token')

  return $fetch.create({
    baseURL: 'https://bread-butter-backend.onrender.com',
    onRequest({ options }) {
      // If the user has an active session, inject the bearer token
      if (token.value) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },
    onResponseError({ response }) {
      // Optional: You could intercept 401 Unauthorized errors here and redirect to login
    }
  })
}