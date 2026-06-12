<script lang="ts" setup>
import type { PublicCustomSiteRecord } from '~/types/customSite'
import { PublicCustomSiteError } from '~/types/customSite'
import { reportApiError } from '~/types/auth'
import { customSiteToViewModel } from '~/utils/customSiteViewModel'

definePageMeta({
  layout: false,
})

type PageState = 'loading' | 'not-found' | 'unavailable' | 'locked' | 'ready'

const UNPUBLISHED_MESSAGE =
  'This Site Has not yet been published or taken down temporarily'

const route = useRoute()
const toast = useToast()
const { fetchPublicSiteMeta, unlockPublicSite } = usePublicCustomSite()
const { getSiteAccessToken, setSiteAccessToken } = useSiteAccessCookie()

const siteName = computed(() => {
  const value = route.params.siteName
  return typeof value === 'string' ? value : ''
})

const pageState = ref<PageState>('loading')
const siteRecord = ref<PublicCustomSiteRecord | null>(null)
const pinInput = ref('')
const pinError = ref('')
const isSubmittingPin = ref(false)

const viewModel = computed(() =>
  siteRecord.value ? customSiteToViewModel(siteRecord.value) : null
)

async function loadSite() {
  if (!siteName.value) {
    pageState.value = 'not-found'
    return
  }

  pageState.value = 'loading'
  pinError.value = ''

  try {
    const accessToken = getSiteAccessToken(siteName.value)
    const response = await fetchPublicSiteMeta(siteName.value, accessToken)

    if (response.passwordProtected && !response.customSite) {
      pageState.value = 'locked'
      siteRecord.value = null
      return
    }

    if (response.customSite) {
      siteRecord.value = response.customSite
      pageState.value = 'ready'
      return
    }

    pageState.value = 'not-found'
  } catch (error) {
    if (error instanceof PublicCustomSiteError) {
      if (error.availability === 'UNPUBLISHED') {
        pageState.value = 'unavailable'
        return
      }
      if (error.status === 404) {
        pageState.value = 'not-found'
        return
      }
    }
    reportApiError(toast, { title: 'Could not load site', error })
    pageState.value = 'not-found'
  }
}

async function handlePinSubmit() {
  const passcode = pinInput.value.trim()
  if (!passcode) {
    pinError.value = 'Please enter the passcode.'
    return
  }
  if (!/^[a-zA-Z0-9]{4,20}$/.test(passcode)) {
    pinError.value = 'Passcode must be 4–20 letters or numbers.'
    return
  }

  isSubmittingPin.value = true
  pinError.value = ''

  try {
    const response = await unlockPublicSite(siteName.value, passcode)
    if (!response.accessToken) {
      pinError.value = 'Could not unlock this site.'
      return
    }
    setSiteAccessToken(siteName.value, response.accessToken)
    pinInput.value = ''
    await loadSite()
  } catch (error) {
    if (error instanceof PublicCustomSiteError && error.status === 401) {
      pinError.value = 'Incorrect passcode.'
      return
    }
    reportApiError(toast, { title: 'Could not verify passcode', error })
  } finally {
    isSubmittingPin.value = false
  }
}

onMounted(() => {
  loadSite()
})

watch(siteName, () => {
  loadSite()
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <div
      v-if="pageState === 'loading'"
      class="flex min-h-screen items-center justify-center text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
      <span class="ml-3 text-sm">Loading site...</span>
    </div>

    <div
      v-else-if="pageState === 'not-found'"
      class="flex min-h-screen items-center justify-center px-6"
    >
      <div class="max-w-md text-center space-y-3">
        <UIcon name="i-lucide-search-x" class="mx-auto size-10 text-muted" />
        <p class="text-xl font-semibold text-highlighted">Site not found</p>
        <p class="text-sm text-muted">
          We could not find a website at this address.
        </p>
      </div>
    </div>

    <div
      v-else-if="pageState === 'unavailable'"
      class="flex min-h-screen items-center justify-center px-6"
    >
      <div class="max-w-lg text-center space-y-3">
        <UIcon name="i-lucide-eye-off" class="mx-auto size-10 text-muted" />
        <p class="text-xl font-semibold text-highlighted">
          {{ UNPUBLISHED_MESSAGE }}
        </p>
      </div>
    </div>

    <div
      v-else-if="pageState === 'locked'"
      class="flex min-h-screen items-center justify-center px-6"
    >
      <UPageCard class="w-full max-w-sm space-y-4 p-6">
        <div class="space-y-1 text-center">
          <UIcon name="i-lucide-lock" class="mx-auto size-8 text-muted" />
          <p class="text-lg font-semibold text-highlighted">Enter passcode</p>
          <p class="text-sm text-muted">
            This site is password protected.
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="handlePinSubmit">
          <UFormField label="Passcode" name="passcode">
            <UInput
              v-model="pinInput"
              type="password"
              inputmode="text"
              autocomplete="off"
              class="w-full"
              placeholder="Enter passcode"
              :disabled="isSubmittingPin"
            />
          </UFormField>
          <p v-if="pinError" class="text-sm text-error">
            {{ pinError }}
          </p>
          <UButton
            type="submit"
            color="primary"
            block
            :loading="isSubmittingPin"
            :disabled="isSubmittingPin"
          >
            Unlock Site
          </UButton>
        </form>
      </UPageCard>
    </div>

    <CustomSiteViewer v-else-if="pageState === 'ready' && viewModel" :site="viewModel" />
  </div>
</template>
