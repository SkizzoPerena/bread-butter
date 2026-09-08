<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=La+Belle+Aurore&display=swap' }
  ]
})

const { isAuthenticated, syncSessionFromStorage } = useAuth()
const authReady = ref(false)
const layoutName = computed(() => (isAuthenticated.value ? 'user-navbar' : 'landing-navbar'))

if (import.meta.client) {
  syncSessionFromStorage()
}

onMounted(async () => {
  const activeRole = getActiveAuthRole()
  if (activeRole === 'partner') {
    const partnerOk = await ensureSession('partner')
    if (partnerOk) {
      await navigateTo('/partners', { replace: true })
      return
    }
  }
  await ensureSession('user')
  authReady.value = true
})
</script>

<template>
  <div>
    <UPageSection id="features" style="height: 100vh"
      class=" 100vh landing-bg landing-bg-overlay flex justify-center items-end"
      :ui="{ title: 'font-serif text-white', description: 'text-white' }">

      <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
        <source
          src="https://cdn.prod.website-files.com/63177d78c6b7b970195ad37c/631881dada5f467db6f42b29_video-transcode.webm"
          type="video/webm">
      </video>
      <div class="text-white text-center px-4">
        <div class="font-bold text-2xl sm:text-5xl font-serif mb-3 sm:mb-6 text-pretty tracking-tight">
          Your dream celebration, baked to perfection.
        </div>
        <div class="text-sm sm:text-lg max-w-5xl mx-auto">
          Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together.
          <p class="hidden sm:block" /> From custom websites and digital invitations to seamless guest
          management—everything you need is
          finally in one place.
        </div>
      </div>
      <UContainer class="flex justify-center items-center my-0">
        <div class="w-56 sm:w-64">
          <UButton to="/user/login" size="lg" block color="neutral" variant="soft"
            class="font-bold text-sm sm:text-base">LET'S GET THIS BREAD
          </UButton>
        </div>
      </UContainer>
    </UPageSection>

    <UPageSection id="introduction" class="">
      <UContainer class="font-medium text-sm sm:text-xl text-center text-toast-400">

        <Motion v-bind="scrollMotion(0.1)">
          <div class="font-bold text-2xl sm:text-5xl font-serif">
            What's in the oven?
          </div>
        </Motion>
        <div class="mb-3 sm:mb-6" />
        <Motion v-bind="scrollMotion(0.2)">
          <div>
            Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together.
            <p class="hidden sm:block" /> From custom websites and digital invitations to seamless guest
            management—everything you need is
            finally in one place.
          </div>
        </Motion>
      </UContainer>
      <UMarquee class="py-2 -mx-8 sm:-mx-12 lg:-mx-16 [--duration:40s]">
        <div class="py-2" v-for="(img, index) in marqueeImages" :key="index" :initial="{
          scale: 1.1,
          opacity: 0,
          filter: 'blur(20px)'
        }" :animate="{
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)'
        }" :transition="{
          duration: 0.6,
          delay: index * 0.1,
        }"> <!-- Using a simple div as Motion component is not defined -->
          <UPageCard
            class="w-64 h-78 sm:w-80 sm:h-95 bg-bread-400 bread-container transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl hover:z-10"
            :class="index % 2 === 0 ? '-rotate-2' : 'rotate-2'" :ui="{ root: 'rounded-sm', container: 'p-1 sm:p-3' }">
            <div class="relative aspect-square overflow-hidden">
              <img width="200" height="300" class="w-full h-full object-cover" :src="img.file" :alt="img.title" />
            </div>
            <div class="text-center font-medium la-belle-aurore-regular text-xl sm:text-3xl -mt-2 text-black"
              :class="index % 2 === 0 ? 'rotate-2' : '-rotate-3'">{{ img.title }}</div>
          </UPageCard>
        </div>
      </UMarquee>
    </UPageSection>

    <UPageSection class="bg-toast-500">

      <UContainer class="font-regular text-sm sm:text-xl text-center text-white">
        <img class="max-h-4/5 mb-4 sm:mb-6 mx-auto"
          src="https://lh3.googleusercontent.com/d/1gwoHSTP-QKnTnMOFFMVQuWVRiCnwDz-9" />
        <Motion v-bind="scrollMotion(0.1)">

          <div class="font-bold text-2xl sm:text-5xl font-serif mb-3 sm:mb-6">Powerful tools, baked right in.</div>
        </Motion>
        <Motion v-bind="scrollMotion(0.2)">

          <div>Say goodbye to half-baked plans. The Bread + Butter dashboard gives you a centralized hub for your entire
            event. Track tasks, manage suppliers, and monitor RSVPs with a visual, intuitive interface that keeps your
            big day from going stale.</div>
        </Motion>
      </UContainer>
    </UPageSection>

    <UPageSection class="bg-bread-400">

      <UContainer class="font-regular text-sm sm:text-xl text-center">
        <Motion v-bind="scrollMotion(0.1)">

          <div class="font-bold text-2xl sm:text-5xl font-serif mb-6 sm:mb-12">Everything you <a
              class="text-toast-400">knead</a> for a
            <p class="hidden sm:block" />Flawless Celebration
          </div>
        </Motion>
        <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <div v-for="(feature, index) in features" :key="index"
            class="bread-container p-4 sm:p-6 sm:px-8 bg-white text-left">
            <UIcon :name="feature.icon" class="size-7 sm:size-9 my-1 sm:my-2" />
            <div class="font-serif font-bold text-base sm:text-xl">{{ feature.title }}
            </div>
            <div class="font-thin text-xs sm:text-sm mb-2 sm:mb-3 text-toast-400">{{ feature.subtitle }}</div>
            <div class="text-xs sm:text-sm font-medium">{{ feature.description }}</div>
          </div>
        </UPageGrid>
      </UContainer>
    </UPageSection>

    <UPageSection class="bg-toast-700 space-y-0">

      <UContainer class="font-serif text-lg sm:text-xl text-center text-white">
        <div class="font-bold text-2xl sm:text-5xl font-serif">Built for celebrations, perfected for planners
        </div>
      </UContainer>

      <UPageCard orientation="horizontal" class="bg-transparent border-none ring-0 text-white lg:max-2xl:h-[85vh]">
        <div class="relative rounded-lg overflow-hidden h-64 sm:h-[85vh] w-full">
          <img src="https://lh3.googleusercontent.com/d/1-tM75FL0soVprwPc2wQ4WJnup1m2J-Qv" alt="Illustration"
            class="rounded-lg h-full w-full object-cover" loading="lazy" width="750" height="500" />
          <div class="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 max-w-[85%] sm:max-w-xs text-right">
            <p class="text-white text-xs sm:text-sm font-medium [text-shadow:0_2px_4px_var(--color-toast-700)]">
              couple name, date
            </p>
          </div>
        </div>

        <div>
          <div class="text-2xl sm:text-4xl font-bold">For Celebrants</div>
          <div class="text-base sm:text-xl text-bread-500">A slice of heaven</div>
          <div class="mt-4 sm:mt-6 font-semibold text-lg sm:text-2xl">Stress-Free Planning</div>
          <div class="text-sm sm:text-xl text-toast-100">Visualize your entire event at a glance with color-coded
            features and easy
            task management.</div>
          <div class="mt-4 sm:mt-6 font-semibold text-lg sm:text-2xl">Personalized Touch</div>
          <div class="text-sm sm:text-xl text-toast-100">Easily customize your website, invitations, and registries to
            match your
            unique theme.</div>
          <div class="mt-4 sm:mt-6 font-semibold text-lg sm:text-2xl">Stay on Budget</div>
          <div class="text-sm sm:text-xl text-toast-100">Built-in payment trackers and calendar schedules ensure nothing
            falls
            through the cracks.</div>
        </div>

      </UPageCard>

      <UPageCard orientation="horizontal" class="bg-transparent border-none ring-0 text-white lg:h-[85vh]">
        <div>
          <div class="text-2xl sm:text-4xl font-bold">For Planners</div>
          <div class="text-base sm:text-xl text-bread-500">Earning your crust</div>
          <div class="mt-4 sm:mt-6 font-semibold text-lg sm:text-2xl">Client Management</div>
          <div class="text-sm sm:text-xl text-toast-100">Manage multiple events and clients from a single master account
            seamlessly.</div>
          <div class="mt-4 sm:mt-6 font-semibold text-lg sm:text-2xl">Streamlined Workflows</div>
          <div class="text-sm sm:text-xl text-toast-100">Assign tasks directly to clients, track supplier payments, and
            monitor
            venue requirements.</div>
          <div class="mt-4 sm:mt-6 font-semibold text-lg sm:text-2xl">Professional Dashboards</div>
          <div class="text-sm sm:text-xl text-toast-100">Impress clients with a clean, centralized digital hub tailored
            to their
            specific event.</div>
        </div>
        <div class="relative rounded-lg overflow-hidden h-64 sm:h-[85vh] w-full">
          <img src="https://lh3.googleusercontent.com/d/1So8l7ZSJ8Ba748jeL4_fZ07HRU-RZlS9" alt="Illustration"
            class="rounded-lg h-full w-full object-cover" loading="lazy" width="750" height="500" />
          <div class="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 max-w-[85%] sm:max-w-xs text-right">
            <p class="text-white text-xs sm:text-sm font-medium [text-shadow:0_2px_4px_var(--color-toast-700)]">
              couple name, date
            </p>
          </div>
        </div>
      </UPageCard>

    </UPageSection>

    <UPageSection class="bg-bread-400" id="pricing">
      <UContainer class="font-medium text-sm sm:text-xl text-center">

        <Motion v-bind="scrollMotion(0.1)">
          <div class="font-bold text-2xl sm:text-5xl font-serif">
            Pick your Portion
          </div>
        </Motion>
        <div class="mb-3 sm:mb-6" />
        <Motion v-bind="scrollMotion(0.2)">
          <div class="mb-6 sm:mb-12">
            Your event, your way. Choose a package tailored to your planning needs and budget.
          </div>
        </Motion>
        <UPricingPlans>
          <UPricingPlan class="text-left bread-container" v-for="(plan, index) in plans" :key="index" v-bind="plan" :ui="{
            discount: 'text-toast-400 text-sm sm:text-xl', featureIcon: 'text-toast-700',
            title: 'font-serif font-bold text-lg sm:text-xl'
          }" />
        </UPricingPlans>
      </UContainer>
    </UPageSection>

    <UPageSection class="h-screen flex flex-col justify-center 100vh landing-bg landing-bg-overlay">
      <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
        <source src="../assets/CTA-bg.mp4" type="video/mp4">
      </video>
      <UPageGrid :ui="{ base: 'lg:grid-cols-5' }">
        <div></div>
        <div class="col-span-3 flex flex-col justify-center items-center space-y-6 sm:space-y-12 px-4">
          <div class="font-medium text-sm sm:text-xl text-center text-white">
            <div class="font-bold text-2xl sm:text-5xl font-serif mb-3 sm:mb-6 text-bread-400">Ready to raise a toast to
              your next big
              event?</div>
            <div>Join thousands of celebrants, couples, and event professionals who are planning smarter, not harder.
              Let’s bake up something unforgettable together.</div>
          </div>


          <div class="w-56 sm:w-64">
            <UButton to="/user/login" size="lg" block color="bread" variant="solid"
              class="font-bold text-xs sm:text-sm text-toast-700">
              LET'S GET THIS BREAD
            </UButton>
          </div>

        </div>
        <div></div>
      </UPageGrid>
    </UPageSection>

  <div
    v-if="!authReady"
    class="min-h-screen flex items-center justify-center bg-bread-400"
  >
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-toast-700" />
  </div>
  <NuxtLayout v-else :name="layoutName">
    <UserEventsDashboard v-if="isAuthenticated" />
    <LandingHome v-else />
  </NuxtLayout>
</template>
