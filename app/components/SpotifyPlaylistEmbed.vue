<script lang="ts" setup>
import { getSpotifyEmbedUrl } from '~/utils/spotify'

const props = defineProps<{
  playlistUrl: string
}>()

const embedUrl = computed(() => getSpotifyEmbedUrl(props.playlistUrl))
</script>

<template>
  <div v-if="embedUrl" class="overflow-hidden rounded-xl border border-gray-200">
    <iframe
      :src="embedUrl"
      width="100%"
      height="352"
      frameborder="0"
      allowfullscreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify playlist"
    />
  </div>
</template>
