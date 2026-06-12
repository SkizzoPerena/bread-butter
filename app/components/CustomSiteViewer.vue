<script lang="ts" setup>
import type { CustomSiteViewModel } from '~/utils/customSiteViewModel'
import {
  formatDateWithWeekday,
  getDynamicStyle,
  getGoogleMapsUrl,
} from '~/utils/websiteTheme'

const props = defineProps<{
  site: CustomSiteViewModel
}>()

const paletteColors = computed(() => props.site.palette.colors)
const typography = computed(() => props.site.typography)
</script>

<template>
  <div
    class="min-h-screen w-full flex flex-col md:flex-row transition-colors duration-500 relative"
    :style="{
      backgroundColor: paletteColors.background,
      fontFamily: `'${typography.bodyFont}'`,
    }"
  >
    <div
      v-if="site.format === 'format2'"
      class="hidden md:flex flex-col gap-8 text-center py-10 px-6 relative justify-end w-1/2 shrink-0 h-screen"
      :style="{
        backgroundImage: `url(${site.headerImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }"
    >
      <div
        class="absolute inset-0 z-0"
        :style="{
          backgroundImage: `linear-gradient(to bottom, transparent 40%, ${paletteColors.primary}80)`,
        }"
      />
      <div class="relative z-10">
        <div class="space-y-3">
          <h1
            class="font-medium text-6xl md:text-7xl"
            :style="{ color: 'white', fontFamily: `'${typography.headerFont}'` }"
          >
            {{ site.siteTitle }}
          </h1>
          <p class="text-2xl" :style="{ color: 'white' }">
            {{ site.siteDescription }}
          </p>
        </div>
      </div>
    </div>

    <UScrollArea class="flex-1 w-full h-full z-20 min-h-0 max-h-screen">
      <div class="flex flex-col min-h-full w-full">
        <div
          class="flex flex-col gap-8 text-center py-10 px-6 relative justify-end w-full"
          :class="[site.format === 'format2' ? 'md:hidden h-[40vh]' : 'h-[50vh]']"
          :style="{
            backgroundImage: `url(${site.headerImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            minHeight: site.format === 'format2' ? 'auto' : '80vh',
          }"
        >
          <div
            class="absolute inset-0 z-0"
            :style="{
              backgroundImage: `linear-gradient(to bottom, transparent 40%, ${paletteColors.primary}80)`,
            }"
          />
          <div class="relative z-10">
            <div class="space-y-3">
              <h1
                class="font-medium text-6xl md:text-7xl"
                :style="{ color: 'white', fontFamily: `'${typography.headerFont}'` }"
              >
                {{ site.siteTitle }}
              </h1>
              <p class="text-2xl" :style="{ color: 'white' }">
                {{ site.siteDescription }}
              </p>
            </div>
          </div>
        </div>

        <div class="w-full flex flex-col">
          <div
            v-if="site.headingContent || site.paragraphContent"
            class="flex flex-col justify-center mx-10 py-20 text-center min-h-[80vh]"
          >
            <UContainer
              v-if="site.headingContent"
              class="font-bold italic text-5xl"
              :style="{
                color: paletteColors.heading,
                fontFamily: `'${typography.subheaderFont}'`,
              }"
            >
              {{ site.headingContent }}
            </UContainer>
            <div
              v-if="site.paragraphContent"
              class="prose max-w-none mx-auto text-center text-xl"
              :style="{ color: paletteColors.text }"
            >
              {{ site.paragraphContent }}
            </div>
          </div>

          <template v-for="(compId, index) in site.selectedComponents" :key="compId">
            <div
              v-if="compId === 'q-and-a' && site.tidbits.length > 0"
              class="flex flex-col justify-center gap-10 px-6 text-center py-20 min-h-[80vh]"
              :style="{ backgroundColor: getDynamicStyle(index, paletteColors).bg }"
            >
              <div
                class="font-bold text-5xl"
                :style="{
                  color: getDynamicStyle(index, paletteColors).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }"
              >
                Q&amp;A
              </div>
              <div
                v-for="(tidbit, tidbitIndex) in site.tidbits"
                :key="tidbitIndex"
                class="flex flex-col gap-3"
              >
                <h3
                  class="font-bold text-4xl"
                  :style="{
                    color: getDynamicStyle(index, paletteColors).heading,
                    fontFamily: `'${typography.subheaderFont}'`,
                  }"
                >
                  {{ tidbit.heading }}
                </h3>
                <div
                  class="prose max-w-none mx-auto text-center text-xl"
                  :style="{ color: getDynamicStyle(index, paletteColors).text }"
                >
                  {{ tidbit.paragraph }}
                </div>
              </div>
            </div>

            <div
              v-if="compId === 'schedule' && site.scheduleItems.length > 0"
              class="flex flex-col justify-center gap-10 px-6 py-20 text-center min-h-[80vh]"
              :style="{ backgroundColor: getDynamicStyle(index, paletteColors).bg }"
            >
              <div
                class="font-bold text-5xl"
                :style="{
                  color: getDynamicStyle(index, paletteColors).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }"
              >
                Schedule
              </div>
              <div
                v-for="(item, itemIndex) in site.scheduleItems"
                :key="itemIndex"
                class="flex flex-col gap-3"
              >
                <h3
                  class="font-bold text-4xl"
                  :style="{
                    color: getDynamicStyle(index, paletteColors).heading,
                    fontFamily: `'${typography.subheaderFont}'`,
                  }"
                >
                  {{ item.title }}
                </h3>
                <div
                  class="prose max-w-none mx-auto text-center text-xl"
                  :style="{ color: getDynamicStyle(index, paletteColors).text }"
                >
                  {{ item.description }}
                </div>
                <div
                  v-if="item.location"
                  class="font-semibold italic mt-2 text-lg"
                  :style="{ color: getDynamicStyle(index, paletteColors).heading }"
                >
                  <UIcon name="i-lucide-map-pin" class="mr-1 inline-block align-middle" />
                  {{ item.location }}
                </div>
              </div>
            </div>

            <div
              v-if="compId === 'rsvp'"
              class="flex flex-col justify-center gap-10 px-6 py-20 text-center min-h-[80vh]"
              :style="{ backgroundColor: getDynamicStyle(index, paletteColors).bg }"
            >
              <div
                class="font-bold text-5xl"
                :style="{
                  color: getDynamicStyle(index, paletteColors).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }"
              >
                RSVP
              </div>
              <div
                class="flex flex-col items-center gap-5 text-sm"
                :style="{ color: getDynamicStyle(index, paletteColors).text }"
              >
                <div
                  v-if="site.rsvpDeadlineDate"
                  class="font-semibold uppercase tracking-widest text-xs opacity-80"
                >
                  <UIcon
                    name="i-lucide-calendar"
                    class="w-4 h-4 inline-block align-text-bottom mr-1"
                  />
                  RSVP by {{ formatDateWithWeekday(site.rsvpDeadlineDate) }}
                </div>
                <UButton
                  size="lg"
                  class="transition-all duration-300 hover:opacity-80 shadow-md border"
                  :style="{
                    backgroundColor: getDynamicStyle(index, paletteColors).text,
                    color: getDynamicStyle(index, paletteColors).bg,
                    borderColor:
                      getDynamicStyle(index, paletteColors).bg === 'transparent'
                        ? getDynamicStyle(index - 1, paletteColors).text
                        : getDynamicStyle(index - 1, paletteColors).bg,
                  }"
                >
                  RSVP Here
                </UButton>
              </div>
            </div>

            <div
              v-if="compId === 'where-to-stay'"
              class="flex flex-col justify-center gap-10 px-6 py-20 text-center min-h-[80vh]"
              :style="{ backgroundColor: getDynamicStyle(index, paletteColors).bg }"
            >
              <div
                class="font-bold text-5xl"
                :style="{
                  color: getDynamicStyle(index, paletteColors).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }"
              >
                Where to Stay
              </div>
              <div
                v-if="site.whereToStayLocation"
                class="relative w-full h-100 max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg border"
                :style="{ borderColor: getDynamicStyle(index, paletteColors).text }"
              >
                <iframe
                  width="100%"
                  height="100%"
                  frameborder="0"
                  scrolling="no"
                  marginheight="0"
                  marginwidth="0"
                  :src="getGoogleMapsUrl(site.whereToStayLocation)"
                  style="filter: grayscale(1) contrast(1)"
                />
                <div
                  class="absolute inset-0 pointer-events-none opacity-60"
                  :style="{
                    backgroundColor: getDynamicStyle(index, paletteColors).text,
                    mixBlendMode: 'color',
                  }"
                />
              </div>
            </div>

            <div
              v-if="compId === 'travel'"
              class="flex flex-col justify-center gap-10 px-6 py-20 text-center min-h-[80vh]"
              :style="{ backgroundColor: getDynamicStyle(index, paletteColors).bg }"
            >
              <div
                class="font-bold text-5xl"
                :style="{
                  color: getDynamicStyle(index, paletteColors).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }"
              >
                Travel
              </div>
            </div>

            <div
              v-if="compId === 'wedding-party'"
              class="flex flex-col justify-center gap-10 px-6 py-20 text-center min-h-[80vh]"
              :style="{ backgroundColor: getDynamicStyle(index, paletteColors).bg }"
            >
              <div
                class="font-bold text-5xl"
                :style="{
                  color: getDynamicStyle(index, paletteColors).heading,
                  fontFamily: `'${typography.subheaderFont}'`,
                }"
              >
                Wedding Party
              </div>
            </div>
          </template>

          <div
            class="flex flex-col justify-center gap-6 px-6 py-20 text-center min-h-[80vh]"
            :style="{
              backgroundColor: getDynamicStyle(site.selectedComponents.length, paletteColors).bg,
            }"
          >
            <h2
              class="font-bold text-5xl"
              :style="{
                color: getDynamicStyle(site.selectedComponents.length, paletteColors).heading,
                fontFamily: `'${typography.headerFont}'`,
              }"
            >
              {{ site.endingTitle }}
            </h2>
            <p
              class="prose max-w-none mx-auto text-center text-2xl"
              :style="{
                color: getDynamicStyle(site.selectedComponents.length, paletteColors).text,
              }"
            >
              {{ site.endingMessage }}
            </p>
          </div>

          <div
            class="py-10 flex flex-col items-center justify-center gap-3"
            :style="{
              backgroundColor: paletteColors.heading,
              borderColor: paletteColors.surface,
            }"
          >
            <p
              class="text-xs font-semibold uppercase tracking-widest opacity-60"
              :style="{ color: paletteColors.background }"
            >
              This website was made with
            </p>
            <div
              class="h-6 w-full opacity-80 mask-logo"
              :style="{ backgroundColor: paletteColors.background }"
              role="img"
              aria-label="Bread + Butter"
            />
          </div>
        </div>
      </div>
    </UScrollArea>
  </div>
</template>

<style scoped>
.mask-logo {
  -webkit-mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
  mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
}
</style>
