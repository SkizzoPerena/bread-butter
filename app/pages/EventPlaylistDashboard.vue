<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import type { CreatePlaylistPayload, PlaylistRecord } from '~/types/playlist'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

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
}

function createEmptyForm(): PlaylistForm {
  return {
    label: '',
    spotifyURL: '',
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

  const payload: CreatePlaylistPayload = {
    label: editPlaylistForm.value.label.trim(),
    spotifyURL: editPlaylistForm.value.spotifyURL.trim(),
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
    navigateTo('/user/dashboard')
    return
  }

  await loadEventData()
  await loadPlaylistsData()
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
      <div>
        <h2 class="text-xl font-semibold font-serif text-muted">
          Event playlists
        </h2>
        <p class="mt-1 text-sm text-muted">
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

      <div v-else class="space-y-6">
        <UPageCard
          v-for="playlist in playlists"
          :key="playlist._id"
          class="white-bread-container space-y-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold font-serif text-muted">
                {{ playlist.label }}
              </h3>
              <p class="mt-1 text-xs text-muted break-all">
                {{ playlist.spotifyURL }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                icon="i-lucide-pencil"
                color="lime"
                variant="outline"
                size="sm"
                :disabled="mutationsDisabled || isSubmitting"
                @click="openEditModal(playlist)"
              >
                Edit
              </UButton>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="outline"
                size="sm"
                :loading="deletingPlaylistId === playlist._id"
                :disabled="mutationsDisabled || isSubmitting"
                @click="openDeleteModal(playlist)"
              >
                Remove
              </UButton>
            </div>
          </div>

          <SpotifyPlaylistEmbed :playlist-url="playlist.spotifyURL" />
        </UPageCard>
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

    <UModal
      v-model:open="isAddModalOpen"
      title="Add playlist"
      :ui="playlistModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Label" name="new-playlist-label" required>
            <UInput
              v-model="newPlaylistForm.label"
              class="w-full"
              placeholder="e.g. Ceremony, Reception"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>

          <UFormField
            label="Spotify playlist URL"
            name="new-playlist-url"
            required
            hint="Example: https://open.spotify.com/playlist/..."
          >
            <UInput
              v-model="newPlaylistForm.spotifyURL"
              class="w-full"
              placeholder="https://open.spotify.com/playlist/..."
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="() => { isAddModalOpen = false }"
          />
          <UButton
            label="Add playlist"
            color="lime"
            :loading="isSubmitting"
            :disabled="mutationsDisabled"
            @click="handleCreatePlaylist"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isEditModalOpen"
      title="Edit playlist"
      :ui="playlistModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Label" name="edit-playlist-label" required>
            <UInput
              v-model="editPlaylistForm.label"
              class="w-full"
              placeholder="e.g. Ceremony, Reception"
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>

          <UFormField
            label="Spotify playlist URL"
            name="edit-playlist-url"
            required
            hint="Example: https://open.spotify.com/playlist/..."
          >
            <UInput
              v-model="editPlaylistForm.spotifyURL"
              class="w-full"
              placeholder="https://open.spotify.com/playlist/..."
              :disabled="mutationsDisabled || isSubmitting"
            />
          </UFormField>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="() => { isEditModalOpen = false }"
          />
          <UButton
            label="Save changes"
            color="lime"
            :loading="isSubmitting"
            :disabled="mutationsDisabled"
            @click="handleUpdatePlaylist"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
