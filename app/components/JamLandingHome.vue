<script setup lang="ts">
useHead({
  link: [
    { rel: 'preload', href: '/images/hero-poster.webp', as: 'image', type: 'image/webp', fetchpriority: 'high' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=La+Belle+Aurore&display=swap' }
  ]
})

const { isAuthenticated } = useAuth('user')
const { triggerSlideTransition } = useJamSlideTransition()

function onSwitchToEvents() {
  const isLoggedIn = isAuthenticated.value || (import.meta.client && Boolean(getStoredAccessToken('user')))
  const target = isLoggedIn ? '/?view=landing' : '/'
  triggerSlideTransition(target, 'to-events')
}

const authCtaTarget = computed(() => {
  const dest = '/user/create-seating'
  return isAuthenticated.value ? dest : `/user/signup?redirect=${encodeURIComponent(dest)}`
})

function getTierCtaTarget(tierName: string) {
  const dest = `/user/create-seating?tier=${encodeURIComponent(tierName.toLowerCase())}`
  return isAuthenticated.value ? dest : `/user/signup?redirect=${encodeURIComponent(dest)}`
}

interface JamTier {
  name: string
  tagline?: string
  description?: string
  capacity?: string
  subtitle?: string
  originalPrice?: string
  discountPrice: string
  buttonLabel?: string
  colClass: string
  features: string[]
}

const JAM_COMMON_FEATURES = [
  'Digital Invitations',
  'RSVP Tracking & Automated Follow-Ups',
  'Table & Seating Arrangements',
  'QR Code Registration & Guest Check-In'
]

const jamTiers: JamTier[] = [
  {
    name: 'Strawberry',
    tagline: 'A little Jam goes a long way!',
    description: 'Perfect for guest lists of<br />up to 150.',
    originalPrice: '₱5,000',
    discountPrice: '₱4,000',
    buttonLabel: 'Pick Strawberry',
    colClass: 'md:col-span-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Coconut',
    tagline: 'Smooth, sweet, and made to share!',
    description: 'Perfect for guest lists of<br />up to 300.',
    originalPrice: '₱10,000',
    discountPrice: '₱7,000',
    buttonLabel: 'Pick Coconut',
    colClass: 'md:col-span-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Lemon',
    tagline: 'Bright, zesty, and full of life!',
    description: 'Perfect for guest lists of<br />up to 500.',
    originalPrice: '₱15,000',
    discountPrice: '₱10,000',
    buttonLabel: 'Pick Lemon',
    colClass: 'md:col-span-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Apricot',
    tagline: 'Sweet, golden, and crowd-pleasing!',
    description: 'Perfect for guest lists of<br />up to 750.',
    originalPrice: '₱20,000',
    discountPrice: '₱13,000',
    buttonLabel: 'Pick Apricot',
    colClass: 'md:col-span-2 md:col-start-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Orange Marmalade',
    tagline: 'The grandest spread for your biggest day!',
    description: 'Perfect for guest lists of<br />up to 1,000.',
    originalPrice: '₱25,000',
    discountPrice: '₱15,000',
    buttonLabel: 'Pick Orange Marmalade',
    colClass: 'md:col-span-2',
    features: JAM_COMMON_FEATURES
  }
]

function scrollMotion(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    inViewOptions: { once: true, amount: 1 },
    transition: { duration: 0.6, delay }
  }
}
</script>

<template>
  <div>
    <UPageSection id="features" style="height: 100vh"
      class=" 100vh landing-bg landing-bg-overlay flex justify-center items-end"
      :ui="{ title: 'font-serif text-white', description: 'text-white' }">

      <video autoplay loop muted playsinline poster="/images/hero-poster.webp" preload="metadata" class="absolute inset-0 w-full h-full object-cover -z-10">
        <source src="/videos/Hero-bg.mp4" type="video/mp4">
      </video>
      <div class="space-y-8">
        <div class="text-white text-center">
          <div class="font-bold text-2xl sm:text-5xl font-serif mb-3 sm:mb-6 text-pretty tracking-tight">
            Big guest lists? That's our Jam.
          </div>
          <div class="text-sm sm:text-lg max-w-5xl mx-auto">
            Send digital invitations, track RSVPs, automate follow-ups, and sort out seating arrangements—all in one place!<br />Top it off with QR code registration and seamless guest check-ins.
          </div>
        </div>
        <UContainer class="flex justify-center items-center my-0">
          <div class="w-56 sm:w-64">
            <UButton :to="authCtaTarget" size="lg" block color="neutral" variant="soft"
              class="font-bold text-sm sm:text-base">LET'S JAM!
            </UButton>
          </div>
        </UContainer>
        <div class="h-20 sm:hidden"></div>
      </div>
    </UPageSection>

    <UPageSection class="bg-jam-800" id="pricing">
      <UContainer class="font-medium text-sm sm:text-xl text-center">

        <Motion v-bind="scrollMotion(0.1)">
          <div class="font-bold text-2xl sm:text-5xl font-serif text-white">
            What's your Jam?
          </div>
        </Motion>
        <div class="mb-3 sm:mb-6" />
        <Motion v-bind="scrollMotion(0.2)">
          <div class="mb-6 sm:mb-12 text-sm sm:text-base text-jam-100/90 font-normal max-w-2xl mx-auto">
            Every celebration has its own flavor! Pick the perfect Jam for your guest list, big or small.
          </div>
        </Motion>

        <!-- 2-Row, 3-Col Arrangement (3 cards on Row 1, 2 centered cards on Row 2) -->
        <div class="grid grid-cols-1 md:grid-cols-6 gap-6 max-w-6xl mx-auto items-stretch">
          <div
            v-for="tier in jamTiers"
            :key="tier.name"
            :class="tier.colClass"
            class="bg-white rounded-3xl p-6 sm:p-7 text-left shadow-lg flex flex-col justify-between border border-stone-100 hover:shadow-2xl transition-all duration-300"
          >
            <div class="space-y-4">
              <div>
                <h3 class="font-serif font-bold text-2xl sm:text-3xl text-jam-900 tracking-tight">
                  {{ tier.name }}
                </h3>
                <p v-if="tier.tagline" class="text-xs sm:text-sm font-medium text-jam-700 mt-1">
                  {{ tier.tagline }}
                </p>
              </div>

              <!-- Description / Capacity -->
              <div v-if="tier.description" class="pt-1">
                <p class="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed" v-html="tier.description" />
              </div>
              <div v-else-if="tier.capacity">
                <span class="block text-[11px] font-bold tracking-wider text-amber-700 uppercase">
                  CAPACITY
                </span>
                <div class="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight leading-tight mt-0.5">
                  {{ tier.capacity }}
                </div>
                <p v-if="tier.subtitle" class="text-xs text-stone-500 font-medium mt-1">
                  {{ tier.subtitle }}
                </p>
              </div>

              <!-- Included Features -->
              <div class="pt-3 border-t border-stone-100">
                <span class="block text-xs font-bold text-amber-800 mb-2">
                  What's included:
                </span>
                <ul class="space-y-2 text-xs text-stone-700 font-medium">
                  <li v-for="feat in tier.features" :key="feat" class="flex items-center gap-2">
                    <UIcon name="i-lucide-check" class="size-4 text-jam-700 shrink-0 font-bold" />
                    <span>{{ feat }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="pt-6">
              <div class="flex items-baseline gap-2.5 mb-4">
                <span v-if="tier.originalPrice" class="text-lg sm:text-xl font-serif text-stone-400 line-through">
                  {{ tier.originalPrice }}
                </span>
                <span class="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                  {{ tier.discountPrice }}
                </span>
              </div>
              <NuxtLink
                :to="getTierCtaTarget(tier.name)"
                class="w-full block py-2.5 px-4 rounded-xl bg-jam-900 hover:bg-jam-950 active:bg-black text-white text-xs sm:text-sm font-semibold text-center transition-all cursor-pointer shadow-xs"
              >
                {{ tier.buttonLabel || `Pick ${tier.name}` }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </UContainer>
    </UPageSection>

    <UPageSection class="h-screen flex flex-col justify-center 100vh landing-bg landing-bg-overlay">
      <video autoplay loop muted playsinline preload="none" class="absolute inset-0 w-full h-full object-cover -z-10">
        <source src="../assets/CTA-bg.mp4" type="video/mp4">
      </video>
      <UPageGrid :ui="{ base: 'lg:grid-cols-5' }">
        <div></div>
        <div class="col-span-3 flex flex-col justify-center items-center space-y-6 sm:space-y-12 px-4">
          <div class="font-medium text-sm sm:text-xl text-center text-white">
            <div class="font-bold text-2xl sm:text-5xl font-serif mb-3 sm:mb-6 text-bread-400">Ready to take the stress out of your guest list?</div>
            <div>Join thousands of celebrants, couples, and event professionals who manage hundreds of guests with ease.
              Send bulk invitations, track RSVPs in real time, and streamline same-day check-in.</div>
          </div>

          <div class="w-56 sm:w-64">
            <UButton :to="authCtaTarget" size="lg" block color="bread" variant="solid"
              class="font-bold text-xs sm:text-sm text-jam-700">
              START A JAM
            </UButton>
          </div>

        </div>
        <div></div>
      </UPageGrid>
    </UPageSection>

    <!-- Switch to Events / Bread + Butter Callout (Before Footer) -->
    <section class="bg-toast-900 text-white py-14 sm:py-16 px-4 border-t border-toast-800/60 relative overflow-hidden">
      <!-- Decorative radial glow -->
      <div class="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />

      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 text-center sm:text-left relative z-10">
        <div class="space-y-2.5 max-w-xl">
          <h2 class="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-bread-300 tracking-tight">
            Not quite your Jam?
          </h2>
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-toast-800/90 text-bread-300 border border-toast-700/50">
              <img src="~/assets/bpb-icons/B+B Logos-10.svg" alt="Bread + Butter" class="size-3.5 object-contain" />
              <span>Need full celebration planning?</span>
            </div>
          </div>
          <p class="text-sm sm:text-base text-toast-100/90 leading-relaxed pt-0.5">
            Looking for a complete event platform with custom wedding websites, budget trackers, supplier management, ceremony checklists, and collaboration tools? Experience Bread + Butter.
          </p>
        </div>

        <div class="shrink-0">
          <button
            type="button"
            class="group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-bread-400 hover:bg-bread-300 text-toast-950 shadow-md hover:shadow-lg transition-all duration-300 ease-out cursor-pointer active:scale-95"
            @click="onSwitchToEvents"
          >
            <span>LET'S GET THIS BREAD!</span>
            <UIcon name="i-lucide-arrow-right" class="size-3.5 sm:size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>

  </div>
</template>

<style>
.landing-bg {
  position: relative;
  /* This is needed for the overlay and video to be positioned correctly */
  z-index: 1;
}

.landing-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: #3e1500;
  opacity: 0.55;
  z-index: -1;
}

.la-belle-aurore-regular {
  font-family: "La Belle Aurore", cursive;
  font-weight: 400;
  font-style: normal;
}
</style>
