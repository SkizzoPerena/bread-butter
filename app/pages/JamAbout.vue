<script setup lang="ts">
definePageMeta({
  layout: 'jam-landing-navbar',
})

useHead({
  title: 'About Jam - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Meet your new favorite spread. Jam by Bread + Butter brings invitations, RSVPs, seating arrangements, and guest check-ins together in one simple, sweet platform.'
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-jam-800 text-white pt-20 sm:pt-24 lg:pt-28 pb-16 sm:pb-20 px-3.5 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto space-y-6 sm:space-y-8">

      <!-- Hero Header -->
      <div class="text-center space-y-2.5 sm:space-y-3 max-w-2xl mx-auto px-2">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-bread-400">
          About Jam
        </h1>
        <p class="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed">
          Meet your new favorite spread.
        </p>
      </div>

      <!-- Main Simplified Container (Responsive padding, Jam themed) -->
      <div class="bread-container bg-bread-400 text-jam-900 p-5 sm:p-8 lg:p-12 space-y-8 sm:space-y-10">

        <!-- Section 1: Intro -->
        <section class="space-y-3.5 sm:space-y-4">
          <p class="text-sm sm:text-base md:text-lg font-medium text-jam-950 leading-relaxed">
            Every great celebration starts with a guest list. But somewhere between sending invitations, chasing RSVPs, arranging seats, and welcoming guests, things can get a little sticky.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            Spreadsheets pile up, messages get buried, guest counts keep changing, and suddenly, managing the guest list feels like an event of its own.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            So we thought: what if guest management could be a whole lot sweeter?
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            That's how <span class="font-bold text-jam-950">Jam by Bread + Butter</span> came into the mix.
          </p>

          <p class="text-sm sm:text-base md:text-lg font-bold text-jam-950">
            One simple platform to bring your invitations, RSVPs, seating arrangements, and guest check-ins together, without all the usual juggling.
          </p>
        </section>

        <!-- Section 2: Why We Built It -->
        <section class="space-y-3.5 sm:space-y-4 border-t border-jam-600/20 pt-6 sm:pt-8">
          <h2 class="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-jam-800">
            Why We Built It
          </h2>

          <p class="text-sm sm:text-base md:text-lg font-semibold text-jam-950 leading-relaxed">
            Because managing guests shouldn't be harder than planning the celebration.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            From the first invitation to the last guest checking in, there's a lot to keep track of.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            Jam makes it easier to send digital invitations, track responses, automate RSVP follow-ups, arrange seating, and manage QR code registration and check-ins.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            Whether you're hosting a small gathering or managing hundreds of guests, Jam helps keep everything running smoothly.
          </p>

          <p class="text-base sm:text-lg md:text-xl font-serif font-bold text-jam-950 italic pt-1 leading-snug">
            You bring the guests. We'll bring the Jam.
          </p>
        </section>

        <!-- Section 3: Why Jam? -->
        <section class="space-y-3.5 sm:space-y-4 border-t border-jam-600/20 pt-6 sm:pt-8">
          <h2 class="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-jam-800">
            Why Jam?
          </h2>

          <p class="text-sm sm:text-base md:text-lg font-semibold text-jam-950 leading-relaxed">
            Because every great celebration deserves a little something extra.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            Just like jam brings everything together with a touch of sweetness, our platform brings all your guest management essentials into one place.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            It's simple, practical, and made to take the sticky situations out of managing guest lists.
          </p>

          <p class="text-lg sm:text-xl md:text-2xl font-serif font-bold text-jam-950 italic pt-1 sm:pt-2 leading-snug">
            One guest list. One sweet solution.
          </p>
        </section>

        <!-- Section 4: The People Behind the Jam -->
        <section class="space-y-3.5 sm:space-y-4 border-t border-jam-600/20 pt-6 sm:pt-8">
          <h2 class="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-jam-800">
            The People Behind the Jam
          </h2>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            Jam is brought to you by Bread + Butter, a digital productivity platform built to make event planning simpler and more organized.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            Combining real-world event planning experience with the technology expertise of
            <a
              href="https://www.blinkpunch.com"
              target="_blank"
              rel="noopener noreferrer"
              class="font-bold underline decoration-jam-500 hover:text-jam-700 transition-colors"
            >
              Blink Punch Software Solutions
            </a>, we're creating practical digital tools that make celebrations easier to manage and better to experience.
          </p>
        </section>

        <!-- Section 5: Where We're Going -->
        <section class="space-y-3.5 sm:space-y-4 border-t border-jam-600/20 pt-6 sm:pt-8">
          <h2 class="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-jam-800">
            Where We're Going
          </h2>

          <p class="text-sm sm:text-base md:text-lg font-semibold text-jam-950 leading-relaxed">
            We're just getting started!
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            Our goal is to make guest management smarter, smoother, and more enjoyable for everyone—from celebrants hosting their special moments to event professionals managing large-scale gatherings.
          </p>

          <p class="text-sm sm:text-base md:text-lg text-jam-900 leading-relaxed">
            As Jam grows, we'll keep finding better ways to bring people together, one guest list at a time.
          </p>

          <!-- Bottom Sign-off -->
          <div class="pt-5 sm:pt-6 border-t border-jam-600/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p class="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-jam-950">
                Jam by Bread + Butter
              </p>
              <p class="text-sm sm:text-base md:text-lg text-jam-800 italic mt-0.5">
                Big guest lists? That's our Jam.
              </p>
            </div>
            <UButton
              to="/jam"
              color="neutral"
              variant="solid"
              size="lg"
              class="bg-jam-900 hover:bg-jam-950 text-white font-bold text-sm w-fit shadow-md transition-all active:scale-95"
            >
              LET'S JAM!
            </UButton>
          </div>
        </section>

      </div>

    </div>
  </div>
</template>

<style scoped></style>
