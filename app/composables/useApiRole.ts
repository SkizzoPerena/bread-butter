import type { AuthRole } from '~/composables/useAuth'

export function resolveRouteRole(route: ReturnType<typeof useRoute>): AuthRole {
  const roleQuery = typeof route.query.role === 'string' ? route.query.role.trim().toLowerCase() : ''
  if (roleQuery === 'partner') return 'partner'
  if (roleQuery === 'admin') return 'admin'

  if (route.path.startsWith('/partners')) return 'partner'
  if (route.path.startsWith('/admin')) return 'admin'
  return 'user'
}

export function getRoleAwareApiPath(path: string, role: AuthRole): string {
  if (role === 'partner' && path.startsWith('/user/')) {
    return `/partner/${path.slice('/user/'.length)}`
  }
  return path
}

export function useApiRole() {
  const route = useRoute()

  const role = computed<AuthRole>(() => resolveRouteRole(route))
  const isPartnerRole = computed(() => role.value === 'partner')

  function withRoleQuery<T extends Record<string, unknown>>(query: T = {} as T): T & { role?: string } {
    if (!isPartnerRole.value) {
      return query
    }
    return {
      ...query,
      role: 'partner'
    }
  }

  return {
    role,
    isPartnerRole,
    withRoleQuery
  }
}
