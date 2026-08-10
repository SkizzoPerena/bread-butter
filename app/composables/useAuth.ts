import type {
  AuthLoginResponse,
  AuthRegisterResponse,
  AuthUser,
  LoginCredentials,
  RegisterCredentials
} from '~/types/auth'
import { RestrictedAccountError } from '~/utils/restrictedAccount'

const AUTH_TOKEN_COOKIE = 'bpb_auth_token'
const AUTH_USER_STATE_KEY = 'auth-user'

const TOKEN_MAX_AGE = 60 * 60 * 24 * 30

export function useAuth() {
  const token = useCookie<string | null>(AUTH_TOKEN_COOKIE, {
    default: () => null,
    maxAge: TOKEN_MAX_AGE,
    sameSite: 'lax'
  })

  const user = useState<AuthUser | null>(AUTH_USER_STATE_KEY, () => null)

  const isAuthenticated = computed(() => Boolean(token.value))

  function setSession(newToken: string, newUser?: AuthUser | null) {
    token.value = newToken
    if (newUser) {
      user.value = newUser
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
  }

  function updateUser(updates: Partial<AuthUser>) {
    user.value = user.value
      ? { ...user.value, ...updates }
      : (updates as AuthUser)
  }

  async function logout() {
    clearSession()
    await navigateTo('/user/login')
  }

  async function login(credentials: LoginCredentials) {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return null
    }

    clearSession()

    const response = await apiRequest<AuthLoginResponse>('/user/login', {
      method: 'POST',
      authenticated: false,
      body: {
        email: credentials.email.trim(),
        password: credentials.password
      }
    })

    if (response.user?.isRestricted === true) {
      clearSession()
      throw new RestrictedAccountError()
    }

    setSession(String(response.token), response.user ?? null)
    return response
  }

  async function register(credentials: RegisterCredentials) {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return null
    }

    const response = await apiRequest<AuthRegisterResponse>('/user/register', {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        gender: credentials.gender
      }
    })

    setSession(String(response.token), {
      email: credentials.email,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      gender: credentials.gender
    })

    return response
  }

  return {
    token: readonly(token),
    user: readonly(user),
    isAuthenticated,
    setSession,
    clearSession,
    updateUser,
    login,
    register,
    logout
  }
}
