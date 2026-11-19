<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import type { CreatePlaylistPayload, PlaylistRecord } from '~/types/playlist'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { getSpotifyEmbedUrl } from '~/utils/spotify'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Playlist',
  bgClass: 'bg-lime-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { finishPageTransition } = usePageTransition()
const {
  isLoading: isLoadingPlaylists,
  isSubmitting,
  fetchPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
} = useEventPlaylists()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const playlists = ref<PlaylistRecord[]>([])
const isLoadingEvent = ref(false)
const deletingPlaylistId = ref<string | null>(null)
const playlistToDelete = ref<PlaylistRecord | null>(null)
const isDeleteModalOpen = ref(false)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const editingPlaylist = ref<PlaylistRecord | null>(null)

type PlaylistForm = {
  label: string
  spotifyURL: string
  description: string
  displayInWebsite: boolean
}

function createEmptyForm(): PlaylistForm {
  return {
    label: '',
    spotifyURL: '',
    description: '',
    displayInWebsite: true,
  }
}

const newPlaylistForm = ref<PlaylistForm>(createEmptyForm())
const editPlaylistForm = ref<PlaylistForm>(createEmptyForm())

const playlistModalUi = {
  header: 'bg-lime-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md',
  overlay: 'bg-lime-900/30',
}

const playlistFormModalUi = {
  header: 'bg-lime-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md sm:max-w-2xl md:max-w-3xl',
  overlay: 'bg-lime-900/30',
}

const newPlaylistEmbedUrl = computed(() => getSpotifyEmbedUrl(newPlaylistForm.value.spotifyURL))
const editPlaylistEmbedUrl = computed(() => getSpotifyEmbedUrl(editPlaylistForm.value.spotifyURL))

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const mutationsDisabled = computed(
  () => isEventCancelled.value || (!eventId.value && !isUiOnlyMode.value),
)

const isPageLoading = computed(() => isLoadingEvent.value || isLoadingPlaylists.value)
const isPlaylistListEmpty = computed(() => playlists.value.length === 0)

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  isLoadingEvent.value = true

  try {
    const detail = await loadPageData({
      fetch: async () => fetchEvent(targetEventId),
      mock: () => ({
        event: {
          _id: targetEventId,
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
          coverImageURL: null,
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

async function loadPlaylistsData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    playlists.value = []
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'

  try {
    const response = await fetchPlaylists(targetEventId)
    if (response?.playlists) {
      playlists.value = response.playlists
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not load playlists', error })
  }
}

async function refreshAfterMutation() {
  await loadPlaylistsData()
}

function validateForm(form: PlaylistForm): string | null {
  const label = form.label.trim()
  const spotifyURL = form.spotifyURL.trim()

  if (!label) {
    return 'Enter a label for this playlist (e.g. Ceremony, Reception).'
  }
  if (!spotifyURL) {
    return 'Paste a public Spotify playlist URL.'
  }
  return null
}

function openAddModal() {
  newPlaylistForm.value = createEmptyForm()
  isAddModalOpen.value = true
}

function openEditModal(playlist: PlaylistRecord) {
  editingPlaylist.value = playlist
  editPlaylistForm.value = {
    label: playlist.label,
    spotifyURL: playlist.spotifyURL,
    description: playlist.description || '',
    displayInWebsite: playlist.displayInWebsite !== false,
  }
  isEditModalOpen.value = true
}

function openDeleteModal(playlist: PlaylistRecord) {
  playlistToDelete.value = playlist
  isDeleteModalOpen.value = true
}

async function handleCreatePlaylist() {
  const validationError = validateForm(newPlaylistForm.value)
  if (validationError) {
    toast.add({
      title: 'Missing information',
      description: validationError,
      color: 'error',
    })
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  const payload: CreatePlaylistPayload = {
    label: newPlaylistForm.value.label.trim(),
    spotifyURL: newPlaylistForm.value.spotifyURL.trim(),
    description: newPlaylistForm.value.description.trim() || undefined,
    displayInWebsite: newPlaylistForm.value.displayInWebsite,
  }

  try {
    const response = await createPlaylist(targetEventId, payload)
    if (response?.success) {
      toast.add({
        title: 'Playlist added',
        description: `"${payload.label}" has been linked.`,
        color: 'success',
      })
      isAddModalOpen.value = false
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not add playlist', error })
  }
}

async function handleUpdatePlaylist() {
  const playlist = editingPlaylist.value
  if (!playlist) {
    return
  }

  const validationError = validateForm(editPlaylistForm.value)
  if (validationError) {
    toast.add({
      title: 'Missing information',
      description: validationError,
      color: 'error',
    })
    return
  }

  const payload: UpdatePlaylistPayload = {
    label: editPlaylistForm.value.label.trim(),
    spotifyURL: editPlaylistForm.value.spotifyURL.trim(),
    // Send an empty string so clearing the field clears it on the server.
    description: editPlaylistForm.value.description.trim(),
    displayInWebsite: editPlaylistForm.value.displayInWebsite,
  }

  try {
    const response = await updatePlaylist(playlist._id, payload)
    if (response?.success) {
      toast.add({
        title: 'Playlist updated',
        description: `"${payload.label}" has been saved.`,
        color: 'success',
      })
      isEditModalOpen.value = false
      editingPlaylist.value = null
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not update playlist', error })
  }
}

async function handleToggleDisplayInWebsite(playlist: PlaylistRecord, displayInWebsite: boolean) {
  try {
    const payload: UpdatePlaylistPayload = {
      label: playlist.label,
      spotifyURL: playlist.spotifyURL,
      description: playlist.description,
      displayInWebsite,
    }
    const response = await updatePlaylist(playlist._id, payload)
    if (response?.success) {
      playlist.displayInWebsite = displayInWebsite
      toast.add({
        title: displayInWebsite ? 'Displayed on website' : 'Hidden from website',
        description: `"${playlist.label}" will ${displayInWebsite ? 'now appear on' : 'be hidden from'} your event website.`,
        color: displayInWebsite ? 'lime' : 'neutral',
      })
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not update playlist', error })
  }
}

async function confirmDeletePlaylist() {
  const playlist = playlistToDelete.value
  if (!playlist) {
    return
  }

  deletingPlaylistId.value = playlist._id
  try {
    const response = await deletePlaylist(playlist._id)
    if (response?.success) {
      toast.add({
        title: 'Playlist removed',
        color: 'success',
      })
      isDeleteModalOpen.value = false
      playlistToDelete.value = null
      await refreshAfterMutation()
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not delete playlist', error })
  } finally {
    deletingPlaylistId.value = null
  }
}

onMounted(async () => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/')
    return
  }

  try {
    await loadEventData()
    await loadPlaylistsData()
  } finally {
    finishPageTransition()
  }
})

watch(eventId, async () => {
  await loadEventData()
  await loadPlaylistsData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">
    <ClientOnly>
      <Teleport to="#navbar-actions">
        <UButton
          icon="i-lucide-plus"
          color="lime"
          :disabled="mutationsDisabled || isSubmitting"
          @click="openAddModal"
        >
          Add playlist
        </UButton>
      </Teleport>
    </ClientOnly>

    <div
      v-if="isPageLoading"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading playlists...</span>
    </div>

    <div v-else class="space-y-6">
      <div class="white-bread-container p-5 sm:p-6 border border-bread-200/90 rounded-2xl shadow-xs text-center space-y-1.5">
        <h2 class="text-xl font-bold font-serif text-highlighted">
          Event playlists
        </h2>
        <p class="text-sm text-muted max-w-xl mx-auto leading-relaxed">
          Add multiple Spotify playlists for different moments — ceremony, cocktail hour, reception, and more. Each playlist includes playback controls and a scrollable track list.
        </p>
      </div>

      <UAlert
        v-if="isEventCancelled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="This event is cancelled. Playlist changes are disabled."
      />

      <div
        v-if="isPlaylistListEmpty"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
      >
        <UIcon name="i-lucide-music" class="size-10 text-muted" />
        <p class="mt-4 text-base font-medium">No playlists yet</p>
        <p class="mt-1 max-w-sm text-sm text-muted">
          Link public Spotify playlists so you can preview and manage music for each part of your event.
        </p>
        <UButton
          v-if="!mutationsDisabled"
          class="mt-6"
          icon="i-lucide-plus"
          color="lime"
          :disabled="isSubmitting"
          @click="openAddModal"
        >
          Add playlist
        </UButton>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="playlist in playlists"
          :key="playlist._id"
          class="white-bread-container p-4 sm:p-5 flex flex-col justify-between shadow-xs border border-bread-200/90 rounded-2xl w-full max-w-full min-w-0 overflow-hidden space-y-4"
        >
          <div class="space-y-3 w-full min-w-0">
            <div class="flex items-start justify-between gap-3 min-w-0">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h3 class="text-xl sm:text-2xl font-bold font-serif text-highlighted truncate" :title="playlist.label">
                    {{ playlist.label }}
                  </h3>

                  <!-- Inline Display on Website Toggle Pill -->
                  <div
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs select-none transition-all duration-200"
                    :class="playlist.displayInWebsite !== false
                      ? 'bg-lime-50/90 border-lime-300/80 text-lime-900 shadow-2xs'
                      : 'bg-bread-100/60 border-bread-200/80 text-muted'"
                    :title="playlist.displayInWebsite !== false ? 'Shown on event website' : 'Hidden from event website'"
                  >
                    <UIcon
                      name="i-lucide-globe"
                      class="size-3.5 shrink-0"
                      :class="playlist.displayInWebsite !== false ? 'text-lime-600' : 'text-muted'"
                    />
                    <span class="text-xs font-medium leading-none">
                      {{ playlist.displayInWebsite !== false ? 'On website' : 'Hidden' }}
                    </span>
                    <USwitch
                      :model-value="playlist.displayInWebsite !== false"
                      color="lime"
                      size="xs"
                      :disabled="mutationsDisabled || isSubmitting"
                      aria-label="Toggle display on website"
                      @update:model-value="(val: boolean) => handleToggleDisplayInWebsite(playlist, val)"
                    />
                  </div>
                </div>
                <p v-if="playlist.description" class="mt-1 text-xs text-muted leading-relaxed line-clamp-2" :title="playlist.description">
                  {{ playlist.description }}
                </p>
              </div>

              <div class="flex shrink-0 gap-1.5 items-center pt-0.5">
                <UButton
                  icon="i-lucide-pencil"
                  color="lime"
                  variant="solid"
                  size="xs"
                  class="cursor-pointer font-semibold shadow-xs text-white"
                  :disabled="mutationsDisabled || isSubmitting"
                  @click="openEditModal(playlist)"
                >
                  Edit
                </UButton>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="solid"
                  size="xs"
                  class="cursor-pointer font-semibold shadow-xs text-white"
                  :loading="deletingPlaylistId === playlist._id"
                  :disabled="mutationsDisabled || isSubmitting"
                  @click="openDeleteModal(playlist)"
                >
                  Remove
                </UButton>
              </div>
            </div>

            <div class="w-full min-w-0 overflow-hidden rounded-xl">
              <SpotifyPlaylistEmbed :playlist-url="playlist.spotifyURL" compact />
            </div>
          </div>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Remove playlist"
      :ui="playlistModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <p class="text-sm text-muted">
          Remove
          <span class="font-medium text-highlighted">{{ playlistToDelete?.label }}</span>
          from your event? This cannot be undone.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="() => { isDeleteModalOpen = false }"
          />
          <UButton
            label="Remove"
            color="error"
            :loading="Boolean(deletingPlaylistId)"
            :disabled="mutationsDisabled"
            @click="confirmDeletePlaylist"
          />
        </div>
      </template>
    </UModal>

    <!-- Add Playlist Modal -->
    <UModal
      v-model:open="isAddModalOpen"
      title="Add playlist"
      :ui="playlistFormModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <!-- Left Column: Form Fields & Bottom Actions -->
          <div class="flex flex-col justify-between h-full min-h-[380px]">
            <div class="space-y-3.5">
              <UFormField label="Label" name="new-playlist-label" required>
                <UInput
                  v-model="newPlaylistForm.label"
                  class="w-full"
                  placeholder="e.g. Ceremony, Reception, Dinner"
                  :disabled="mutationsDisabled || isSubmitting"
                />
              </UFormField>

              <UFormField label="Description (Optional)" name="new-playlist-description">
                <UTextarea
                  v-model="newPlaylistForm.description"
                  class="w-full"
                  :rows="2"
                  :maxlength="500"
                  placeholder="e.g. Upbeat tracks for cocktail hour and welcome drinks"
                  :disabled="mutationsDisabled || isSubmitting"
                />
              </UFormField>

              <div class="space-y-1.5">
                <UFormField
                  label="Spotify playlist URL"
                  name="new-playlist-url"
                  required
                >
                  <UInput
                    v-model="newPlaylistForm.spotifyURL"
                    class="w-full"
                    placeholder="https://open.spotify.com/playlist/..."
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>
                <p class="text-xs text-muted leading-relaxed">
                  In Spotify, open your playlist &rarr; tap <strong class="text-highlighted font-medium">··· (More)</strong> &rarr; <strong class="text-highlighted font-medium">Share</strong> &rarr; <strong class="text-highlighted font-medium">Copy link to playlist</strong>.
                </p>
              </div>

              <div class="p-3 rounded-xl border border-bread-200/90 bg-bread-50/50 flex items-center justify-between gap-3">
                <div class="space-y-0.5">
                  <span class="text-xs font-semibold text-highlighted block">Display in website</span>
                  <span class="text-[11px] text-muted block">Show this playlist on your public event website</span>
                </div>
                <USwitch
                  v-model="newPlaylistForm.displayInWebsite"
                  color="lime"
                  :disabled="mutationsDisabled || isSubmitting"
                />
              </div>
            </div>

            <!-- Bottom Actions Aligned With Playlist Preview -->
            <div class="grid grid-cols-2 gap-2.5 pt-4 w-full">
              <UButton
                block
                label="Cancel"
                color="neutral"
                variant="outline"
                class="cursor-pointer font-medium"
                :disabled="isSubmitting"
                @click="() => { isAddModalOpen = false }"
              />
              <UButton
                block
                label="Add playlist"
                color="lime"
                class="cursor-pointer font-semibold shadow-xs"
                :loading="isSubmitting"
                :disabled="mutationsDisabled"
                @click="handleCreatePlaylist"
              />
            </div>
          </div>

          <!-- Right Column: Live Spotify Preview or Placeholder -->
          <div class="flex flex-col space-y-1.5 h-full">
            <span class="block text-sm font-medium text-highlighted">Playlist Preview</span>
            <div v-if="newPlaylistEmbedUrl" class="w-full overflow-hidden rounded-xl h-[354px]">
              <SpotifyPlaylistEmbed :playlist-url="newPlaylistForm.spotifyURL" compact />
            </div>
            <div
              v-else
              class="rounded-xl border-2 border-dashed border-bread-300 bg-bread-50/60 p-6 flex flex-col items-center justify-center text-center space-y-2.5 h-[354px]"
            >
              <div class="size-12 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center shadow-2xs">
                <UIcon name="i-lucide-music" class="size-6" />
              </div>
              <div class="space-y-1">
                <p class="text-sm font-semibold text-highlighted">No Playlist Link Recognized</p>
                <p class="text-xs text-muted max-w-xs leading-relaxed">
                  Paste a valid Spotify playlist URL on the left to see your live preview here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Edit Playlist Modal -->
    <UModal
      v-model:open="isEditModalOpen"
      title="Edit playlist"
      :ui="playlistFormModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <!-- Left Column: Form Fields & Bottom Actions -->
          <div class="flex flex-col justify-between h-full min-h-[380px]">
            <div class="space-y-3.5">
              <UFormField label="Label" name="edit-playlist-label" required>
                <UInput
                  v-model="editPlaylistForm.label"
                  class="w-full"
                  placeholder="e.g. Ceremony, Reception, Dinner"
                  :disabled="mutationsDisabled || isSubmitting"
                />
              </UFormField>

              <UFormField label="Description (Optional)" name="edit-playlist-description">
                <UTextarea
                  v-model="editPlaylistForm.description"
                  class="w-full"
                  :rows="2"
                  :maxlength="500"
                  placeholder="e.g. Upbeat tracks for cocktail hour and welcome drinks"
                  :disabled="mutationsDisabled || isSubmitting"
                />
              </UFormField>

              <div class="space-y-1.5">
                <UFormField
                  label="Spotify playlist URL"
                  name="edit-playlist-url"
                  required
                >
                  <UInput
                    v-model="editPlaylistForm.spotifyURL"
                    class="w-full"
                    placeholder="https://open.spotify.com/playlist/..."
                    :disabled="mutationsDisabled || isSubmitting"
                  />
                </UFormField>
                <p class="text-xs text-muted leading-relaxed">
                  In Spotify, open your playlist &rarr; tap <strong class="text-highlighted font-medium">··· (More)</strong> &rarr; <strong class="text-highlighted font-medium">Share</strong> &rarr; <strong class="text-highlighted font-medium">Copy link to playlist</strong>.
                </p>
              </div>

              <div class="p-3 rounded-xl border border-bread-200/90 bg-bread-50/50 flex items-center justify-between gap-3">
                <div class="space-y-0.5">
                  <span class="text-xs font-semibold text-highlighted block">Display in website</span>
                  <span class="text-[11px] text-muted block">Show this playlist on your public event website</span>
                </div>
                <USwitch
                  v-model="editPlaylistForm.displayInWebsite"
                  color="lime"
                  :disabled="mutationsDisabled || isSubmitting"
                />
              </div>
            </div>

            <!-- Bottom Actions Aligned With Playlist Preview -->
            <div class="grid grid-cols-2 gap-2.5 pt-4 w-full">
              <UButton
                block
                label="Cancel"
                color="neutral"
                variant="outline"
                class="cursor-pointer font-medium"
                :disabled="isSubmitting"
                @click="() => { isEditModalOpen = false }"
              />
              <UButton
                block
                label="Save changes"
                color="lime"
                class="cursor-pointer font-semibold shadow-xs"
                :loading="isSubmitting"
                :disabled="mutationsDisabled"
                @click="handleUpdatePlaylist"
              />
            </div>
          </div>

          <!-- Right Column: Live Spotify Preview or Placeholder -->
          <div class="flex flex-col space-y-1.5 h-full">
            <span class="block text-sm font-medium text-highlighted">Playlist Preview</span>
            <div v-if="editPlaylistEmbedUrl" class="w-full overflow-hidden rounded-xl h-[354px]">
              <SpotifyPlaylistEmbed :playlist-url="editPlaylistForm.spotifyURL" compact />
            </div>
            <div
              v-else
              class="rounded-xl border-2 border-dashed border-bread-300 bg-bread-50/60 p-6 flex flex-col items-center justify-center text-center space-y-2.5 h-[354px]"
            >
              <div class="size-12 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center shadow-2xs">
                <UIcon name="i-lucide-music" class="size-6" />
              </div>
              <div class="space-y-1">
                <p class="text-sm font-semibold text-highlighted">No Playlist Link Recognized</p>
                <p class="text-xs text-muted max-w-xs leading-relaxed">
                  Paste a valid Spotify playlist URL on the left to see your live preview here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
