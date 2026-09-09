<script setup lang="ts">
definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'About - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Bread + Butter started with a simple thought: what if your entire celebration had one home? Learn why we built it and the team behind the platform.'
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto space-y-8">

      <!-- Hero Header -->
      <div class="text-center space-y-3 max-w-2xl mx-auto">
        <h1 class="text-4xl sm:text-5xl font-bold font-serif text-bread-400">
          About Bread + Butter
        </h1>
        <p class="text-base sm:text-lg text-white/90 leading-relaxed">
          Meet your bakers.
        </p>
      </div>

      <!-- Main Simplified Container (No nested card boxes) -->
      <div class="bread-container bg-bread-400 text-toast-900 p-8 sm:p-12 lg:p-14 space-y-10">

        <!-- Section 1: About -->
        <section class="space-y-4">
          <p class="text-base sm:text-lg font-medium text-toast-950 leading-relaxed">
            <img
              src="~/assets/bpb-icons/wordmark-toast.svg"
              alt="Bread + Butter"
              class="inline-block h-5 sm:h-6 w-auto align-middle mr-1.5 -mt-1"
            /> started with a simple thought: why does planning one beautiful celebration require so many
            different places to keep track of it?
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            Guest lists were in one file, supplier updates were buried in chats, payments had their own tracker,
            schedules lived somewhere else, and requirements were kept in another folder. We saw how easily planning
            could become scattered, even when everyone involved was doing their part.
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            So we asked ourselves: what if the entire celebration had one home?
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            A place where guests could find what they needed, celebrants could see what mattered and what came next, and
            planners could keep every moving part organized.
          </p>

          <p class="text-base sm:text-lg font-bold text-toast-950">
            That idea became Bread + Butter.
          </p>
        </section>

        <!-- Section 2: Why We Built It -->
        <section class="space-y-4 border-t border-toast-600/20 pt-8">
          <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800">
            Why We Built It
          </h2>

          <p class="text-base sm:text-lg font-semibold text-toast-950 leading-relaxed">
            We built Bread + Butter to make planning feel lighter.
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            Celebrations come with countless details, decisions, deadlines, and people to coordinate. Bread + Butter
            brings your event website, invitations, guests, RSVPs, tasks, suppliers, schedules, requirements, and more
            into one digital home, making it easier to stay organized and move forward with confidence.
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            For celebrants, it creates a clearer and more enjoyable planning experience. For planners, it provides a
            practical way to manage details, collaborate, and keep everything moving.
          </p>

          <p class="text-lg sm:text-xl font-serif font-bold text-toast-950 italic pt-1">
            Your guests see the celebration. You see everything that makes it happen.
          </p>
        </section>

        <!-- Section 3: Why Bread + Butter? -->
        <section class="space-y-4 border-t border-toast-600/20 pt-8">
          <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800">
            Why Bread + Butter?
          </h2>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            The name reflects what we want the platform to become: one of the essentials you rely on to make everything
            work a little more smoothly.
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            Not another app to add to the mix, but the place where everything finally comes together.
          </p>

          <p class="text-xl sm:text-2xl font-serif font-bold text-toast-950 italic pt-2">
            Everything you knead, all in one place.
          </p>
        </section>

        <!-- Section 4: The People Behind the Celebration -->
        <section class="space-y-4 border-t border-toast-600/20 pt-8">
          <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800">
            The People Behind the Celebration
          </h2>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            Behind Bread + Butter is a team that understands both event planning and the technology that can make it
            easier.
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            Our real-world understanding of celebrations, combined with the technology and product development expertise
            of
            <a href="https://www.blinkpunch.com" target="_blank" rel="noopener noreferrer"
              class="font-bold underline decoration-toast-500 hover:text-toast-700 transition-colors">
              Blink Punch Software Solutions
            </a>, helped shape a platform built around the way events are actually planned.
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            We are creating Bread + Butter for the people celebrating, the planners making it happen, and everyone
            working together behind the scenes.
          </p>
        </section>

        <!-- Section 5: Where We’re Going -->
        <section class="space-y-4 border-t border-toast-600/20 pt-8">
          <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800">
            Where We’re Going
          </h2>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            As Bread + Butter grows, our goal remains simple: to make celebrations easier to manage and better to
            experience.
          </p>

          <p class="text-base sm:text-lg text-toast-900 leading-relaxed">
            We will continue building smarter ways to plan, collaborate, and bring every detail together from the first
            plan to the final toast.
          </p>

          <div class="pt-6 border-t border-toast-600/20">
            <p class="text-2xl sm:text-3xl font-serif font-bold text-toast-950">
              Bread + Butter
            </p>
            <p class="text-base sm:text-lg text-toast-800 italic mt-0.5">
              Your celebration’s digital home.
            </p>
          </div>
        </section>

      </div>

    </div>
  </div>
</template>

<style scoped></style>
