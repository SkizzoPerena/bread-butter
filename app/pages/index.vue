<script setup lang="ts">


useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=La+Belle+Aurore&display=swap' }
  ]
})

definePageMeta({
  layout: 'landing-navbar',
})

const marqueeImages = [
  { src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800', alt: 'A beautifully decorated wedding reception table with flowers and candles.', title: 'Elegant Receptions' },
  { src: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800', alt: 'A bride and groom walking down the aisle after their ceremony.', title: 'Unforgettable Moments' },
  { src: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=800', alt: 'A person writing on a calendar to plan an event.', title: 'Meticulous Planning' },
  { src: 'https://images.unsplash.com/photo-1505944357431-27579db47558?q=80&w=800', alt: 'Close-up of a wedding invitation suite with calligraphy.', title: 'Custom Invitations' },
  { src: 'https://images.unsplash.com/photo-1587590227264-0ac64ce63ce8?q=80&w=800', alt: 'A multi-tiered wedding cake decorated with white flowers.', title: 'Stunning Cakes' },
  { src: 'https://assets.website-files.com/63177d78c6b7b970195ad37c/6319e9f351fd6f1ad731517c_home-03.jpg', alt: 'Wedding rings nestled in a bouquet of white flowers.', title: 'Cherished Vows' }
]

const features = [
  {
    icon: 'i-lucide-globe',
    title: 'Custom Websites & Invitations',
    subtitle: 'The Upper Crust',
    description: 'Build a stunning, personalized website and design custom digital invitations that leave a lasting impression.'
  },
  {
    icon: 'i-lucide-users',
    title: 'Seamless RSVP & Guest List',
    subtitle: 'No Half-Baked Plans',
    description: 'Easily collect RSVPs, track meal preferences, and organize your seating chart without the headache.'
  },
  {
    icon: 'i-lucide-list-checks',
    title: 'Smart Task Checklist',
    subtitle: 'Stay on a Roll',
    description: 'Keep track of every detail with a built-in Kanban-style checklist. Watch your tasks move from "To Do" to "Completed" like clockwork.'
  },
  {
    icon: 'i-lucide-briefcase',
    title: 'Supplier & Payment Tracking',
    subtitle: 'Managing the Dough',
    description: 'Keep your budget in check. Manage all your vendors, store contracts, and track upcoming payment deadlines in one place.'
  },
  {
    icon: 'i-lucide-church',
    title: 'Ceremony & Church Requirements',
    subtitle: 'The Recipe for Success',
    description: 'A dedicated space to organize essential documents, marriage licenses, and specific venue rules.'
  },
  {
    icon: 'i-lucide-gift',
    title: 'Gifts & Playlists',
    subtitle: 'The Icing on Top',
    description: 'Curate your digital registry and collaborate on the ultimate reception playlist guaranteed to get everyone toasting.'
  }
]


function enterMotion(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay }
  }
}
</script>

<template>
  <div>
    <UPageSection id="features" title="Your dream celebration, baked to perfection."
      description="Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together. From custom websites and digital invitations to seamless guest management—everything you knead is finally in one place."
      style="height: 100vh" class=" 100vh landing-bg landing-bg-overlay flex justify-center items-end"
      :ui="{ title: 'font-serif text-white', description: 'text-white' }">

      <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
        <source
          src="https://cdn.prod.website-files.com/63177d78c6b7b970195ad37c/631881dada5f467db6f42b29_video-transcode.webm"
          type="video/webm">
      </video>

      <UContainer class="flex justify-center items-center my-0">
        <div style="width: 250px">
          <UButton to="/UserLogin" size="xl" block color="neutral" variant="soft" class="font-bold">LET'S GET THIS BREAD
          </UButton>
        </div>
      </UContainer>
    </UPageSection>

    <UPageSection class="">
      <UContainer class="font-medium text-xl text-center text-toast-400">

        <Motion v-bind="enterMotion(0.35)">
          <div class="font-bold text-5xl font-serif">
            What's in the oven?
          </div>
        </Motion>
<div class=" mb-12"/>
          <Motion v-bind="enterMotion(0.65)">
            <div>
              Bread + Butter is the all-in-one event planning platform designed to bring clients and planners together.
              <p /> From custom websites and digital invitations to seamless guest management—everything you need is
              finally
              in one place.
            </div>
          </Motion>
      </UContainer>
      <UMarquee class="py-2 -mx-8 sm:-mx-12 lg:-mx-16 [--duration:40s]">
        <div v-for="(img, index) in marqueeImages" :key="index" :initial="{
          scale: 1.1,
          opacity: 0,
          filter: 'blur(20px)'
        }" :animate="{
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)'
        }" :transition="{
          duration: 0.6,
          delay: index * 0.1
        }"> <!-- Using a simple div as Motion component is not defined -->
          <UPageCard class="w-80 h-95 bg-bread-400 bread-container" :class="index % 2 === 0 ? '-rotate-2' : 'rotate-2'"
            :ui="{ root: 'rounded-sm', container: 'p-1 sm:p-3' }">
            <div class="relative aspect-square overflow-hidden">
              <NuxtImg width="200" height="300" class="w-full h-full object-cover" fit="cover" v-bind="img" />
            </div>
            <div class="text-center font-medium la-belle-aurore-regular text-3xl -mt-2 text-black"
              :class="index % 2 === 0 ? 'rotate-2' : '-rotate-3'">{{ img.title }}</div>
          </UPageCard>
        </div>
      </UMarquee>
    </UPageSection>

    <UPageSection class="bg-toast-500">

      <UContainer class="font-regular text-xl text-center text-white">
        <img class="max-h-4/5 mb-12" src="~/assets/bpb-images/dashboard.png" />
        <div class="font-bold text-5xl font-serif mb-6">Powerful tools, baked right in.</div>
        <div>Say goodbye to half-baked plans. The Bread + Butter dashboard gives you a centralized hub for your entire
          event. Track tasks, manage suppliers, and monitor RSVPs with a visual, intuitive interface that keeps your big
          day from going stale.</div>
      </UContainer>
    </UPageSection>

    <UPageSection class="bg-bread-400">

      <UContainer class="font-regular text-xl text-center">
        <div class="font-bold text-5xl font-serif mb-12">Everything you <a class="text-toast-400">knead</a> for a
          <p />Flawless Celebration
        </div>
        <UPageGrid>
          <div v-for="(feature, index) in features" :key="index" class="bread-container p-6 px-8 bg-white text-left">
            <UIcon :name="feature.icon" class="size-9 my-2" />
            <div class="font-serif font-bold text-xl">{{ feature.title }}
            </div>
            <div class="font-thin text-sm mb-3  text-toast-400">{{ feature.subtitle }}</div>
            <div class="text-sm font-medium">{{ feature.description }}</div>
          </div>
        </UPageGrid>
      </UContainer>
    </UPageSection>

    <UPageSection class="bg-toast-700 space-y-0">

      <UContainer class="font-serif text-xl text-center text-white">
        <div class="font-bold text-5xl font-serif">Built for celebrations, perfected for planners
        </div>


      </UContainer>

      <UPageCard orientation="horizontal" class="bg-transparent border-none ring-0 text-white   h-[85vh]">
        <NuxtImg
          src="https://www.brides.com/thmb/lTIg3B7yNZEL6ttm_j8ZDlfnUlI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/RYP_W_TinaMatt-836-f0c8c03fd44e469da17b9e93637174b1.jpg"
          alt="Illustration" class=" rounded-lg  h-[85vh] w-full object-cover" loading="lazy" />

        <div>
          <div class="text-4xl font-bold">For Celebrants</div>
          <div class="text-xl text-bread-500">A slice of heaven</div>
          <div class="mt-6 font-semibold text-2xl">Stress-Free Planning</div>
          <div class="text-xl text-toast-100">Visualize your entire event at a glance with color-coded features and easy
            task management.</div>
          <div class="mt-6 font-semibold text-2xl">Personalized Touch</div>
          <div class="text-xl text-toast-100">Easily customize your website, invitations, and registries to match your
            unique theme.</div>
          <div class="mt-6 font-semibold text-2xl">Stay on Budget</div>
          <div class="text-xl text-toast-100">Built-in payment trackers and calendar schedules ensure nothing falls
            through the cracks.</div>
        </div>

      </UPageCard>

      <UPageCard orientation="horizontal" class="bg-transparent border-none ring-0 text-white  h-[85vh]">
        <div>
          <div class="text-4xl font-bold">For Planners</div>
          <div class="text-xl text-bread-500">Earning your crust</div>
          <div class="mt-6 font-semibold text-2xl">Client Management</div>
          <div class="text-xl text-toast-100">Manage multiple events and clients from a single master account
            seamlessly.</div>
          <div class="mt-6 font-semibold text-2xl">Streamlined Workflows</div>
          <div class="text-xl text-toast-100">Assign tasks directly to clients, track supplier payments, and monitor
            venue requirements.</div>
          <div class="mt-6 font-semibold text-2xl">Professional Dashboards</div>
          <div class="text-xl text-toast-100">Impress clients with a clean, centralized digital hub tailored to their
            specific event.</div>
        </div>
        <NuxtImg src="https://www.theknot.com/tk-media/images/7c8d329b-9c6c-4e86-a34a-95172619a6a1" alt="Illustration"
          class=" rounded-lg  h-[85vh] w-full object-cover" loading="lazy" />
      </UPageCard>

    </UPageSection>

    <UPageSection class="h-screen flex flex-col justify-center 100vh landing-bg landing-bg-overlay">
      <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
        <source src="../assets/CTA-bg.mp4" type="video/mp4">
      </video>
      <UPageGrid :ui="{ base: 'lg:grid-cols-5' }">
        <div></div>
        <div class=" col-span-3 flex flex-col justify-center items-center space-y-12">
          <div class="font-medium text-xl text-center text-white">
            <div class="font-bold text-5xl font-serif mb-6 text-bread-400">Ready to raise a toast to your next big
              event?</div>
            <div>Join thousands of celebrants, couples, and event professionals who are planning smarter, not harder.
              Let’s
              bake up something unforgettable together.</div>
          </div>


          <div style="width: 250px">
            <UButton to="/UserLogin" size="xl" block color="bread" variant="solid" class="font-bold text-toast-700">
              LET'S GET THIS
              BREAD
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