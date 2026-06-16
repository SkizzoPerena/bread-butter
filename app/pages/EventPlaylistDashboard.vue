<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Playlist',
  bgClass: 'bg-teal-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { isSubmitting, updateEventPlaylist } = useEventPlaylist()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)
const playlistInput = ref('')

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const mutationsDisabled = computed(
  () => isEventCancelled.value || (!eventId.value && !isUiOnlyMode.value)
)

const hasSavedPlaylist = computed(() => Boolean(eventRecord.value?.playlist?.trim()))

function syncInputFromEvent() {
  playlistInput.value = eventRecord.value?.playlist?.trim() ?? ''
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    playlistInput.value = ''
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
          playlist: '',
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
    syncInputFromEvent()
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

async function savePlaylist() {
  if (!eventRecord.value || mutationsDisabled.value) {
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'

  try {
    const response = await updateEventPlaylist(targetEventId, playlistInput.value.trim())
    if (response?.event) {
      eventRecord.value = response.event
      setActiveEvent(response.event)
    } else {
      eventRecord.value = {
        ...eventRecord.value,
        playlist: playlistInput.value.trim(),
      }
      setActiveEvent(eventRecord.value)
    }
    syncInputFromEvent()
    toast.add({
      title: 'Playlist saved',
      description: playlistInput.value.trim()
        ? 'Your Spotify playlist has been linked.'
        : 'Playlist removed.',
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not update playlist', error })
  }
}

async function clearPlaylist() {
  playlistInput.value = ''
  await savePlaylist()
}

onMounted(() => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/UserDashboard')
    return
  }
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">
    <div
      v-if="isLoadingEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>

    <div v-else class="space-y-6">
      <UAlert
        v-if="isEventCancelled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="This event is cancelled. Playlist changes are disabled."
      />

      <UPageGrid class="md:grid-cols-2 items-start gap-6">
        <UPageCard class="white-bread-container space-y-4">
          <div>
            <h2 class="text-xl font-semibold font-serif text-muted">
              Spotify playlist
            </h2>
            <p class="mt-1 text-sm text-muted">
              Paste a public Spotify playlist link. Guests will be able to listen from your event page when this is shared.
            </p>
          </div>

          <UForm class="space-y-4" @submit.prevent="savePlaylist">
            <UFormField
              label="Playlist URL"
              name="playlist"
              hint="Example: https://open.spotify.com/playlist/..."
            >
              <UInput
                v-model="playlistInput"
                class="w-full"
                placeholder="https://open.spotify.com/playlist/..."
                :disabled="mutationsDisabled || isSubmitting"
              />
            </UFormField>

            <div class="flex flex-wrap gap-2">
              <UButton
                type="submit"
                icon="i-lucide-save"
                color="slate"
                :loading="isSubmitting"
                :disabled="mutationsDisabled"
              >
                Save playlist
              </UButton>
              <UButton
                variant="outline"
                color="neutral"
                icon="i-lucide-trash-2"
                :loading="isSubmitting"
                :disabled="mutationsDisabled || !hasSavedPlaylist"
                @click="clearPlaylist"
              >
                Clear
              </UButton>
            </div>
          </UForm>
        </UPageCard>

        <UPageCard class="white-bread-container space-y-4">
          <div>
            <h2 class="text-xl font-semibold font-serif text-muted">
              Preview
            </h2>
            <p class="mt-1 text-sm text-muted">
              Saved playlists appear here with Spotify playback controls.
            </p>
          </div>

          <SpotifyPlaylistEmbed
            v-if="hasSavedPlaylist && eventRecord?.playlist"
            :playlist-url="eventRecord.playlist"
          />
          <div
            v-else
            class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-muted/20 px-6 py-16 text-center text-sm text-muted"
          >
            <UIcon name="i-lucide-music" class="mb-3 size-10 opacity-50" />
            <p>No playlist linked yet.</p>
          </div>
        </UPageCard>
      </UPageGrid>
    </div>
  </UContainer>
</template>
