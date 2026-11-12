<script lang="ts" setup>
import type { PublicCustomSiteRecord } from '~/types/customSite'
import { PublicCustomSiteError } from '~/types/customSite'
import { reportApiError } from '~/types/auth'
import { customSiteToViewModel } from '~/utils/customSiteViewModel'
import { usePageTransition } from '~/composables/usePageTransition'

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
const { startPageTransition, finishPageTransition } = usePageTransition()

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

async function preloadSiteAssets(site: ReturnType<typeof customSiteToViewModel> | null): Promise<void> {
  if (typeof window === 'undefined') return

  const imagePromises: Promise<void>[] = []

  function preloadImage(src?: string | null): Promise<void> {
    if (!src) return Promise.resolve()
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = src
    })
  }

  // 1. Background textures (both orientations)
  imagePromises.push(preloadImage('/images/paper-texture.webp'))
  imagePromises.push(preloadImage('/images/paper-texture-horizontal.webp'))

  // 2. Main Hero / Cover Image
  if (site?.headerImage) {
    imagePromises.push(preloadImage(site.headerImage))
  }

  // 3. Dress code palette image if present
  if (site?.dressCode?.paletteImage) {
    imagePromises.push(preloadImage(site.dressCode.paletteImage))
  }

  // 4. Wedding fonts
  const fontPromise = typeof document !== 'undefined' && 'fonts' in document
    ? document.fonts.ready.catch(() => {})
    : Promise.resolve()

  // Wait for all assets with a 4s safety timeout
  await Promise.race([
    Promise.all([...imagePromises, fontPromise]),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ])
}

useHead(() => ({
  title: siteRecord.value?.title ? `${siteRecord.value.title} | Bread + Butter` : 'Event Website',
  meta: [
    {
      name: 'description',
      content: siteRecord.value?.subtitle || 'Welcome to our website.',
    },
  ],
}))

async function loadSite(tokenOverride?: string | null) {
  if (!siteName.value) {
    pageState.value = 'not-found'
    finishPageTransition()
    return
  }

  pageState.value = 'loading'
  pinError.value = ''
  startPageTransition()

  try {
    const accessToken = tokenOverride !== undefined ? tokenOverride : getSiteAccessToken(siteName.value)
    const response = await fetchPublicSiteMeta(siteName.value, accessToken)

    if (response.passwordProtected && !response.customSite) {
      pageState.value = 'locked'
      siteRecord.value = null
      finishPageTransition()
      return
    }

    if (response.customSite) {
      siteRecord.value = response.customSite
      await preloadSiteAssets(viewModel.value)
      pageState.value = 'ready'
      finishPageTransition({ minDuration: 600 })
      return
    }

    pageState.value = 'not-found'
    finishPageTransition()
  } catch (error) {
    finishPageTransition()
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
    const resAny = response as unknown as {
      accessToken?: string
      token?: string
      customSite?: PublicCustomSiteRecord
      data?: {
        accessToken?: string
        token?: string
        customSite?: PublicCustomSiteRecord
      }
    }
    const token = resAny.accessToken || resAny.token || resAny.data?.accessToken || resAny.data?.token
    const returnedSite = resAny.customSite || resAny.data?.customSite

    if (!token && !returnedSite) {
      pinError.value = 'Could not unlock this site.'
      return
    }

    if (token) {
      setSiteAccessToken(siteName.value, token)
    }
    pinInput.value = ''

    if (returnedSite) {
      siteRecord.value = returnedSite
      startPageTransition()
      await preloadSiteAssets(viewModel.value)
      pageState.value = 'ready'
      finishPageTransition({ minDuration: 600 })
      return
    }

    await loadSite(token)
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

const { initFromRouteQuery } = useGuestRsvpSession()

onMounted(() => {
  initFromRouteQuery(route.query)
  loadSite()
})

watch(
  () => route.query,
  (newQuery) => {
    initFromRouteQuery(newQuery)
  },
  { deep: true }
)

watch(siteName, () => {
  loadSite()
})
</script>


<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Signature Events Feature Page Transition Loader -->
    <div
      v-if="pageState === 'loading'"
      class="fixed inset-0 bg-white flex flex-col items-center justify-center select-none z-50"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="flex flex-col items-center justify-center px-6 text-center transform transition-all duration-300">
        <img
          src="~/assets/bpb-icons/logo-toast-700.svg"
          alt="Bread + Butter"
          class="h-10 sm:h-12 w-auto max-w-60 object-contain drop-shadow-xs pointer-events-none"
        />

        <div class="mt-8 flex flex-col items-center justify-center gap-3">
          <div class="relative w-10 h-10">
            <div class="w-10 h-10 rounded-full border-[3px] border-toast-100/80" />
            <div class="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-toast-700 border-r-toast-700/50 animate-spin" />
          </div>
        </div>
      </div>
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
