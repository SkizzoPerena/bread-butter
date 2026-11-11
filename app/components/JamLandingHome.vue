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
  capacity: string
  subtitle: string
  originalPrice: string
  discountPrice: string
  colClass: string
  features: string[]
}

const JAM_COMMON_FEATURES = [
  'Tables & seatings',
  'Event check-in',
  'RSVP',
  'Emails & invitations'
]

const jamTiers: JamTier[] = [
  {
    name: 'Strawberry',
    capacity: 'Up to 150 guests',
    subtitle: 'Seating, check-in & RSVP',
    originalPrice: '₱8,000',
    discountPrice: '₱4,000',
    colClass: 'md:col-span-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Coconut',
    capacity: 'Up to 300 guests',
    subtitle: 'Seating, check-in & RSVP',
    originalPrice: '₱14,000',
    discountPrice: '₱7,000',
    colClass: 'md:col-span-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Lemon',
    capacity: 'Up to 500 guests',
    subtitle: 'Seating, check-in & RSVP',
    originalPrice: '₱20,000',
    discountPrice: '₱10,000',
    colClass: 'md:col-span-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Apricot',
    capacity: 'Up to 750 guests',
    subtitle: 'Seating, check-in & RSVP',
    originalPrice: '₱26,000',
    discountPrice: '₱13,000',
    colClass: 'md:col-span-2 md:col-start-2',
    features: JAM_COMMON_FEATURES
  },
  {
    name: 'Orange Marmalade',
    capacity: 'Up to 1000 guests',
    subtitle: 'Seating, check-in & RSVP',
    originalPrice: '₱30,000',
    discountPrice: '₱15,000',
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
            Mass invitations and guest organizing,<br class="hidden sm:block" /> smoothed to perfection.
          </div>
          <div class="text-sm sm:text-lg max-w-5xl mx-auto">
            Bread+Butter's Jam is the mass guest organizer designed to make invitations, RSVPs, table seating, and same-day attendance checking effortlessly simple. Send personalized digital passes, track responses in real time, and welcome your guests with swift QR check-ins.
          </div>
        </div>
        <UContainer class="flex justify-center items-center my-0">
          <div class="w-56 sm:w-64">
            <UButton :to="authCtaTarget" size="lg" block color="neutral" variant="soft"
              class="font-bold text-sm sm:text-base">START A JAM
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
            What's your jam?
          </div>
        </Motion>
        <div class="mb-3 sm:mb-6" />
        <Motion v-bind="scrollMotion(0.2)">
          <div class="mb-6 sm:mb-12 text-sm sm:text-base text-jam-100/90 font-normal max-w-2xl mx-auto">
            Every plan includes seating arrangements, stationery invitations, and live RSVP check-in
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
              <h3 class="font-serif font-bold text-2xl sm:text-3xl text-jam-900 tracking-tight">
                {{ tier.name }}
              </h3>
              <div>
                <span class="block text-[11px] font-bold tracking-wider text-amber-700 uppercase">
                  CAPACITY
                </span>
                <div class="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight leading-tight mt-0.5">
                  {{ tier.capacity }}
                </div>
                <p class="text-xs text-stone-500 font-medium mt-1">
                  {{ tier.subtitle }}
                </p>
              </div>

              <!-- Included Features -->
              <div class="pt-3 border-t border-stone-100">
                <span class="block text-[11px] font-bold tracking-wider text-amber-700 uppercase mb-2">
                  FEATURES
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
                <span class="text-lg sm:text-xl font-serif text-stone-400 line-through">
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
                Select {{ tier.name }}
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
