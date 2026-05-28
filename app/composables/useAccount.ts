import type {
  AccountMessageResponse,
  AccountResponse,
  AccountUpdatePayload,
  AuthUser,
  UserAccount
} from '~/types/auth'

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024

function mockAccount(storedUser: AuthUser | null): UserAccount {
  return {
    email: storedUser?.email ?? 'jane.doe@example.com',
    firstName: storedUser?.firstName ?? 'Jane',
    lastName: storedUser?.lastName ?? 'Doe',
    gender: storedUser?.gender ?? 'FEMALE',
    profileImageURL: storedUser?.profileImageURL ?? ''
  }
}

export function useAccount() {
  const { user, updateUser, isAuthenticated } = useAuth()
  const { apiRequest, apiUpload, loadPageData, isUiOnlyMode } = useApiMode()

  async function fetchAccount(): Promise<UserAccount> {
    const account = await loadPageData({
      mock: () => mockAccount(user.value),
      fetch: async () => {
        const response = await apiRequest<AccountResponse>('/user/account')
        return response.account
      }
    })

    updateUser({
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      gender: account.gender,
      profileImageURL: account.profileImageURL
    })

    return account
  }

  async function saveAccount(payload: AccountUpdatePayload): Promise<AccountMessageResponse> {
    if (isUiOnlyMode.value) {
      updateUser(payload)
      return { success: true, message: 'Account updated successfully.' }
    }

    const response = await apiRequest<AccountMessageResponse>('/user/account', {
      method: 'PATCH',
      body: payload
    })

    updateUser(payload)
    return response
  }

  async function uploadProfilePicture(file: File): Promise<AccountMessageResponse> {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      throw new Error('Please attach a .png, .jpg, or .jpeg file')
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      throw new Error('Image must be 2MB or smaller')
    }

    if (isUiOnlyMode.value) {
      updateUser({ profileImageURL: URL.createObjectURL(file) })
      return { success: true, message: 'Profile picture updated successfully.' }
    }

    const formData = new FormData()
    formData.append('image', file)

    const response = await apiUpload<AccountMessageResponse>('/user/account/profile-picture', formData)
    const account = await fetchAccount()
    updateUser({ profileImageURL: account.profileImageURL })

    return response
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<AccountMessageResponse> {
    if (isUiOnlyMode.value) {
      return { success: true, message: 'Password changed successfully.' }
    }

    return apiRequest<AccountMessageResponse>('/user/account/change-password', {
      method: 'PATCH',
      body: { currentPassword, newPassword }
    })
  }

  return {
    isAuthenticated,
    isUiOnlyMode,
    fetchAccount,
    saveAccount,
    uploadProfilePicture,
    changePassword
  }
}
