<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'Terms and Conditions - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Data Privacy Consent and Terms & Conditions for Bread + Butter event planning platform and packages.'
    }
  ]
})

const route = useRoute()

const fromSource = computed(() => {
  const from = route.query.from as string | undefined
  if (from === 'user-signup' || from === 'signup') return 'user'
  if (from === 'partner-signup') return 'partner'
  return null
})

const returnUrl = computed(() => {
  if (fromSource.value === 'partner') return '/partners/signup'
  return '/user/signup'
})
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto space-y-8">

      <!-- Hero Header -->
      <div class="text-center space-y-4 max-w-2xl mx-auto">
        <!-- Return Button at Top when accessed from Sign-up -->
        <div v-if="fromSource" class="flex justify-center mb-2">
          <UButton
            :to="returnUrl"
            icon="i-lucide-arrow-left"
            color="bread"
            variant="solid"
            size="md"
            class="font-bold text-toast-900 bg-bread-400 hover:bg-bread-300 shadow-md"
          >
            Return to Sign-up
          </UButton>
        </div>

        <h1 class="text-4xl sm:text-5xl font-bold font-serif text-bread-400">
          Terms & Conditions
        </h1>
        <p class="text-base sm:text-lg text-white/90">
          Please review the Data Privacy Consent and Terms & Conditions governing your use of Bread + Butter services and event platform.
        </p>
      </div>

      <!-- Main Single Container -->
      <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-10 lg:p-12 space-y-10">

        <!-- Form retention banner when coming from Sign-up -->
        <div
          v-if="fromSource"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-bread-200/95 border border-toast-600/20 text-toast-900 px-4 py-3 rounded-xl shadow-sm"
        >
          <div class="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-center sm:text-left">
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-toast-600 shrink-0" />
            <span>Your sign-up information and credentials have been retained.</span>
          </div>
          <UButton
            :to="returnUrl"
            icon="i-lucide-arrow-left"
            color="primary"
            size="xs"
            class="font-bold text-xs shrink-0"
          >
            Return to Sign-up
          </UButton>
        </div>

        <!-- Section 1: Data Privacy Consent -->
        <section class="space-y-4">
          <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3">
            DATA PRIVACY CONSENT
          </h2>

          <div class="space-y-4 text-sm sm:text-base text-toast-900 leading-relaxed">
            <p>
              By creating an account, availing of a Bread + Butter package, or using the Bread + Butter platform, I acknowledge and agree that Bread + Butter may collect, use, store, and process the personal information I provide for purposes reasonably necessary to provide and manage its services.
            </p>

            <p>
              This may include my name, contact details, account information, event details, payment and transaction information, photographs, documents, guest information, supplier information, schedules, requirements, and other information that I voluntarily provide through the platform.
            </p>

            <p class="font-medium text-toast-950">
              I understand that my information may be used for purposes including:
            </p>

            <ul class="list-disc pl-6 space-y-2 text-toast-900">
              <li>creating and maintaining my Bread + Butter account;</li>
              <li>setting up and managing my event;</li>
              <li>activating and administering my selected package;</li>
              <li>managing guests, RSVPs, suppliers, tasks, schedules, requirements, and payment records;</li>
              <li>allowing authorized planners or collaborators to assist with my event;</li>
              <li>processing and confirming transactions;</li>
              <li>providing customer and technical support;</li>
              <li>sending important account, event, payment, or service related notices;</li>
              <li>maintaining the security and proper operation of the platform; and</li>
              <li>complying with applicable legal and regulatory requirements.</li>
            </ul>

            <p>
              I understand that I may also provide personal information relating to my guests, suppliers, planners, family members, or other persons involved in my event.
            </p>

            <p>
              By providing such information, I confirm that I am authorized or otherwise have a lawful basis to provide and use such information for purposes related to my event.
            </p>

            <p>
              Bread + Butter will not sell my personal information and will only disclose or provide access to information when reasonably necessary to provide the service, to authorized collaborators or service providers, or when required by law.
            </p>

            <p>
              I understand that reasonable organizational, technical, and physical safeguards will be used to protect personal information. However, I also understand that no online platform can guarantee absolute security.
            </p>

            <p>
              I may exercise my rights under applicable Philippine data privacy laws, including the right to be informed, access, object, correct, request erasure or blocking, and exercise other rights provided by law.
            </p>

            <p>
              By proceeding, I acknowledge that I have read and understood this Data Privacy Consent and agree to the processing of my personal information in accordance with the foregoing and the Bread + Butter Privacy Policy.
            </p>
          </div>
        </section>

        <hr class="border-toast-600/20 my-8" />

        <!-- Section 2: Terms and Conditions -->
        <section class="space-y-6">
          <div class="space-y-2 border-b border-toast-600/20 pb-3">
            <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800">
              TERMS AND CONDITIONS
            </h2>
            <p class="text-sm sm:text-base text-toast-900 leading-relaxed">
              By creating an account, purchasing a package, or using Bread + Butter, I acknowledge that I have read, understood, and agree to the following Terms and Conditions.
            </p>
          </div>

          <div class="space-y-6 text-sm sm:text-base text-toast-900 leading-relaxed">

            <!-- 1 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                1. Bread + Butter Services
              </h3>
              <p>
                Bread + Butter is an event planning platform that provides digital tools and features designed to help celebrants and event planners organize and manage events.
              </p>
              <p>
                Features may include event websites, invitations, guest and RSVP management, tasks, suppliers, payment tracking, schedules, requirements, collaboration tools, and other features included in the package selected by the client.
              </p>
              <p>
                Features and inclusions may vary depending on the package availed of.
              </p>
            </div>

            <!-- 2 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                2. Account Information
              </h3>
              <p>
                The client is responsible for providing complete and accurate information when creating and maintaining an account.
              </p>
              <p>
                The client is also responsible for keeping login credentials secure and for activities performed through the account.
              </p>
              <p>
                Login information should not be shared with unauthorized persons.
              </p>
            </div>

            <!-- 3 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                3. Package Inclusions
              </h3>
              <p>
                The client shall have access only to the features and services included in the package purchased.
              </p>
              <p>
                The client is responsible for reviewing the package inclusions before completing payment.
              </p>
              <p>
                Bread + Butter may introduce improvements or additional features to the platform from time to time.
              </p>
            </div>

            <!-- 4 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                4. Package Activation
              </h3>
              <p>
                The client's package shall be activated upon confirmation of successful payment and completion of any information required by Bread + Butter.
              </p>
              <p>
                The client will receive confirmation once the package is ready for use.
              </p>
              <p>
                If payment has been made but the package has not been activated, the client should contact Bread + Butter and provide the corresponding proof of payment or transaction reference.
              </p>
            </div>

            <!-- 5 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                5. Payments
              </h3>
              <p>
                All payments made for Bread + Butter packages are non-refundable, subject to rights and remedies that cannot be waived under applicable law.
              </p>
              <p>
                The client is responsible for confirming the selected package and its inclusions before making payment.
              </p>
              <p>
                If a transaction appears unsuccessful but the client has been charged, the client should contact Bread + Butter before attempting another payment.
              </p>
              <p>
                Any duplicate or erroneous payment should immediately be reported for verification.
              </p>
            </div>

            <!-- 6 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                6. Package Upgrades
              </h3>
              <p>
                Bread + Butter packages may be upgraded to a higher available package.
              </p>
              <p>
                If the client upgrades, payments previously made for the existing package may be credited toward the price of the upgraded package, and the client shall pay the applicable price difference.
              </p>
              <p>
                An upgrade does not entitle the client to a cash refund of any amount previously paid.
              </p>
              <p>
                Package upgrades shall be subject to the packages and features available at the time the upgrade is requested.
              </p>
            </div>

            <!-- 7 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                7. No Downgrades or Cash Conversion
              </h3>
              <p>
                Once a package has been purchased and activated, it may not be downgraded in exchange for a refund, credit balance, or cash equivalent.
              </p>
              <p>
                Any unused feature or service included in the selected package has no cash value and cannot be exchanged for another service unless Bread + Butter expressly allows otherwise.
              </p>
            </div>

            <!-- 8 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                8. Event Changes
              </h3>
              <p>
                The client is responsible for keeping event information accurate and updated, including event dates, venues, schedules, guests, suppliers, and other important details.
              </p>
              <p>
                If an event is postponed, rescheduled, or otherwise changed, the client should update the relevant information through the platform.
              </p>
              <p>
                Any effect of a major event change on package duration or availability shall be subject to Bread + Butter's applicable package rules.
              </p>
            </div>

            <!-- 9 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                9. Client Content
              </h3>
              <p>
                The client retains ownership of photographs, videos, text, documents, and other original materials uploaded to Bread + Butter.
              </p>
              <p>
                By uploading such materials, the client gives Bread + Butter permission to host, store, display, and process them only as reasonably necessary to provide the platform and its services.
              </p>
              <p>
                The client confirms that he or she has the right or appropriate permission to upload and use such content.
              </p>
            </div>

            <!-- 10 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                10. Guest and Third Party Information
              </h3>
              <p>
                The client may enter information concerning guests, planners, suppliers, collaborators, and other persons involved in the event.
              </p>
              <p>
                The client is responsible for ensuring that such information is lawfully obtained and may properly be provided and used for purposes relating to the event.
              </p>
              <p>
                The client shall avoid uploading personal information that is unnecessary for the planning or management of the event.
              </p>
            </div>

            <!-- 11 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                11. Collaborator Access
              </h3>
              <p>
                Where included in the selected package, the client may authorize an event planner or other collaborator to access the event workspace.
              </p>
              <p>
                The client is responsible for deciding who should be given access.
              </p>
              <p>
                The client should remove access when a person is no longer authorized to participate in the planning of the event.
              </p>
            </div>

            <!-- 12 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                12. Supplier Information
              </h3>
              <p>
                Bread + Butter may allow the client to organize supplier details, contracts, quotations, payment schedules, and other supplier information.
              </p>
              <p>
                Unless expressly stated otherwise, Bread + Butter is not a party to agreements entered into between the client and independent suppliers.
              </p>
              <p>
                The client remains responsible for confirming supplier services, payments, schedules, deliverables, and contractual obligations.
              </p>
            </div>

            <!-- 13 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                13. Payment Tracking
              </h3>
              <p>
                Any supplier payment, budget, or expense tracking feature provided by Bread + Butter is intended only as an organizational tool.
              </p>
              <p>
                Recording a payment as paid, pending, or due on the platform does not itself constitute proof that an outside financial transaction has occurred.
              </p>
              <p>
                The client remains responsible for confirming actual payments directly with the relevant supplier or payment provider.
              </p>
            </div>

            <!-- 14 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                14. Event Website and Published Information
              </h3>
              <p>
                The client is responsible for reviewing all information before publishing or sharing an event website, invitation, RSVP page, or other guest facing content.
              </p>
              <p>
                The client should avoid publishing confidential or unnecessary personal information.
              </p>
              <p>
                Bread + Butter shall not be responsible for incorrect event information entered or published by the client or an authorized collaborator.
              </p>
            </div>

            <!-- 15 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                15. Proper Use of the Platform
              </h3>
              <p>
                Bread + Butter may not be used for unlawful, fraudulent, abusive, or unauthorized purposes.
              </p>
              <p class="font-medium text-toast-950">
                The client shall not attempt to:
              </p>
              <ul class="list-disc pl-6 space-y-1 text-toast-900">
                <li>access another user's account without permission;</li>
                <li>interfere with the operation or security of the platform;</li>
                <li>upload malicious or unlawful content;</li>
                <li>violate another person's privacy or intellectual property rights; or</li>
                <li>use Bread + Butter for activities unrelated to its intended services.</li>
              </ul>
              <p>
                Bread + Butter may suspend or restrict access for serious or repeated violations.
              </p>
            </div>

            <!-- 16 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                16. Platform Availability
              </h3>
              <p>
                Bread + Butter aims to provide reliable access to the platform, but temporary interruptions may occur because of maintenance, upgrades, technical issues, internet outages, third party service interruptions, or circumstances beyond reasonable control.
              </p>
              <p>
                Where reasonably possible, Bread + Butter will work to restore affected services as soon as practicable.
              </p>
            </div>

            <!-- 17 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                17. Client Responsibility
              </h3>
              <p>
                Bread + Butter is intended to assist with the planning and organization of an event.
              </p>
              <p>
                The client remains responsible for final decisions and for verifying important information concerning the event, including guest details, supplier commitments, payments, schedules, deadlines, requirements, and other arrangements.
              </p>
            </div>

            <!-- 18 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                18. Limitation of Liability
              </h3>
              <p class="font-medium text-toast-950">
                To the extent permitted by applicable law, Bread + Butter shall not be responsible for losses resulting solely from:
              </p>
              <ul class="list-disc pl-6 space-y-1 text-toast-900">
                <li>incorrect information entered by the client;</li>
                <li>failure of the client to update event information;</li>
                <li>unauthorized sharing of account credentials;</li>
                <li>acts or omissions of independent suppliers;</li>
                <li>failures of third party services outside Bread + Butter's reasonable control; or</li>
                <li>events beyond Bread + Butter's reasonable control.</li>
              </ul>
              <p>
                Nothing in these Terms shall exclude or limit any liability or consumer right that cannot legally be excluded or waived.
              </p>
            </div>

            <!-- 19 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                19. Data Privacy
              </h3>
              <p>
                The client's personal information shall be processed in accordance with the Bread + Butter Data Privacy Consent, Privacy Policy, and applicable Philippine data privacy laws.
              </p>
            </div>

            <!-- 20 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                20. Changes to the Terms
              </h3>
              <p>
                Bread + Butter may update these Terms when reasonably necessary to reflect changes in its services, operations, or applicable requirements.
              </p>
              <p>
                Material changes affecting existing clients will be communicated through the platform, website, email, or other appropriate means.
              </p>
            </div>

            <!-- 21 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                21. Governing Law
              </h3>
              <p>
                These Terms and Conditions shall be governed by the laws of the Republic of the Philippines.
              </p>
            </div>

            <!-- 22 -->
            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold font-serif text-toast-800">
                22. Acceptance
              </h3>
              <p class="font-medium text-toast-950">
                By creating an account, checking the acceptance box, proceeding with payment, or using Bread + Butter, the client confirms that he or she:
              </p>
              <ul class="list-disc pl-6 space-y-1 text-toast-900">
                <li>has reviewed the selected package and its inclusions;</li>
                <li>understands that payments are non-refundable, subject to applicable law;</li>
                <li>understands that packages may be upgraded by paying the applicable difference;</li>
                <li>agrees to these Terms and Conditions; and</li>
                <li>acknowledges the Bread + Butter Data Privacy Consent and Privacy Policy.</li>
              </ul>
            </div>

          </div>
        </section>

        <!-- Bottom Return CTA when accessed from Sign-up -->
        <div
          v-if="fromSource"
          class="p-5 bg-bread-200/90 rounded-xl border border-toast-600/20 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div class="space-y-0.5 text-center sm:text-left">
            <p class="font-bold text-toast-900 text-sm sm:text-base">Ready to complete your registration?</p>
            <p class="text-xs text-toast-700">Your information is saved and waiting for you.</p>
          </div>
          <UButton
            :to="returnUrl"
            icon="i-lucide-arrow-left"
            color="primary"
            size="md"
            class="font-bold shrink-0"
          >
            Return to Sign-up
          </UButton>
        </div>

        <!-- Footer Contact Link -->
        <div class="pt-6 border-t border-toast-600/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-toast-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-toast-600" />
            <span>Questions regarding our Terms or Privacy Policy?</span>
          </div>
          <ULink
            to="/contact-us"
            class="font-semibold text-toast-700 hover:text-toast-900 underline flex items-center gap-1"
          >
            Contact Support
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
          </ULink>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
</style>
