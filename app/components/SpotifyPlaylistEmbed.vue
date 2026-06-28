<script lang="ts" setup>
import { getSpotifyEmbedUrl } from '~/utils/spotify'

const props = withDefaults(
  defineProps<{
    playlistUrl: string
    compact?: boolean
    height?: number
  }>(),
  {
    compact: false,
    height: 600,
  },
)

const embedUrl = computed(() => getSpotifyEmbedUrl(props.playlistUrl))

const iframeHeight = computed(() => (props.compact ? 352 : props.height))
</script>

<template>
  <div v-if="embedUrl" class="overflow-hidden rounded-xl border border-gray-200">
    <iframe
      :src="embedUrl"
      width="100%"
      :height="iframeHeight"
      frameborder="0"
      allowfullscreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify playlist"
    />
  </div>
</template>
