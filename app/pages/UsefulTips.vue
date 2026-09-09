<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'Useful Tips - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'Expert checklists, budgeting formulas, timelines, and battle-tested advice for seamless celebration planning from Bread + Butter.'
    }
  ]
})

const searchQuery = ref('')
const activeCategory = ref('all')
const activeTipId = ref('tip-1')

const categories = [
  { id: 'all', label: 'All Topics', icon: 'i-lucide-layers' },
  { id: 'timelines', label: 'Timelines & Milestones', icon: 'i-lucide-calendar-clock' },
  { id: 'budgeting', label: 'Budgeting & Finances', icon: 'i-lucide-wallet' },
  { id: 'guest-rsvps', label: 'Guest Lists & RSVPs', icon: 'i-lucide-mail-check' },
  { id: 'suppliers-vendors', label: 'Suppliers & Contracts', icon: 'i-lucide-briefcase' },
  { id: 'event-website', label: 'Event Website & Invites', icon: 'i-lucide-globe' },
  { id: 'day-of-prep', label: 'Day-Of Coordination', icon: 'i-lucide-check-circle-2' },
  { id: 'post-event', label: 'Post-Event Wrap-Up', icon: 'i-lucide-sparkles' }
]

const tips = [
  // TIMELINES & MILESTONES
  {
    id: 'tip-1',
    category: 'timelines',
    question: 'When should we book our primary venue and church?',
    answer: 'Book your ceremony venue, church, and reception spaces at least 10 to 12 months prior to your target date. Popular wedding dates (especially October through February and June) often book out over a full year in advance.',
    proTip: 'Always lock in your venue contract before paying non-refundable deposits to date-dependent suppliers.'
  },
  {
    id: 'tip-2',
    category: 'timelines',
    question: 'How far in advance should invitations be sent out?',
    answer: 'Send digital invitations and website links 8 to 10 weeks before the celebration. For destination weddings or events with overseas guests, distribute Save-the-Dates 6 to 8 months ahead to allow for flight and hotel bookings.',
    proTip: 'Send your Save-the-Date as soon as your venue date is confirmed.'
  },
  {
    id: 'tip-3',
    category: 'timelines',
    question: 'When is the optimal deadline for RSVP confirmations?',
    answer: 'Set your guest RSVP deadline exactly 4 weeks prior to the event date. Banquet caterers and venue coordinators typically request final headcounts and seating charts 2 weeks in advance, giving you a comfortable 2-week buffer to follow up with pending guests.',
    proTip: 'Bread + Butter lets you view pending vs confirmed guests in one live dashboard.'
  },
  {
    id: 'tip-4',
    category: 'timelines',
    question: 'When should event styling, florals, and theme palettes be finalized?',
    answer: 'Finalize your floral choices, lighting plan, and color moodboards by months 6 to 5. This gives your event stylist and florist sufficient lead time to order specialized flowers, linens, and custom backdrop installations.',
    proTip: 'Share a single digital moodboard link with both your stylist and photo/video team.'
  },

  // BUDGETING & FINANCES
  {
    id: 'tip-5',
    category: 'budgeting',
    question: 'How much contingency reserve should we budget for unexpected costs?',
    answer: 'Always set aside a 10% to 15% contingency reserve in your master event budget. Incidental expenses such as venue overtime fees, sound extension cords, extra crew meals, and weather adjustments frequently arise during celebration week.',
    proTip: 'Never allocate 100% of your total funds to initial supplier quotes.'
  },
  {
    id: 'tip-6',
    category: 'budgeting',
    question: 'How should celebration expenses be structured and prioritized?',
    answer: 'A trusted guideline is the 50/30/20 formula: allocate 50% to venue, catering, and beverage; 30% to photo/video, coordination, music, and styling; and 20% for attire, stationery, gifts, and contingency.',
    proTip: 'Identify the top 3 priorities that matter most to you as a couple before allocating funds.'
  },
  {
    id: 'tip-7',
    category: 'budgeting',
    question: 'How can we track supplier downpayment milestones without losing receipts?',
    answer: 'Record every deposit, second tranche, and final balance in a centralized payment schedule. Reputable event vendors typically work on milestone structures (e.g. 30% downpayment, 40% mid-way, 30% on the day).',
    proTip: 'Use the Bread + Butter built-in payments tracker to log transfer slips and due dates.'
  },
  {
    id: 'tip-8',
    category: 'budgeting',
    question: 'Where can we save money without sacrificing the guest experience?',
    answer: 'Replace printed single-use paper menus and ceremony booklets with digital guides hosted on your event website. Reinvest those printing savings into guest entertainment or premium catering options.',
    proTip: 'Digital programs can be updated at the last minute with zero reprint costs.'
  },

  // GUEST LISTS & RSVPS
  {
    id: 'tip-9',
    category: 'guest-rsvps',
    question: 'How do we collect dietary restrictions and meal choices efficiently?',
    answer: 'Ask for severe allergies, vegetarian, vegan, and halal preferences directly within your digital RSVP questionnaire. You can then export a categorized sheet directly to your head banquet manager.',
    proTip: 'Provide distinct meal tags to your banquet team for each table assignment.'
  },
  {
    id: 'tip-10',
    category: 'guest-rsvps',
    question: 'What is the most polite way to follow up with late RSVPs?',
    answer: 'Send a gentle reminder 5 days before your cutoff. Frame it warmly around catering deadlines: "We are finalizing headcounts with our chef this week and would love to reserve your seat—please let us know if you can make it!"',
    proTip: 'A polite personal message is far more effective than an impersonal broadcast.'
  },
  {
    id: 'tip-11',
    category: 'guest-rsvps',
    question: 'How should plus-ones and reserved seat counts be communicated clearly?',
    answer: 'Explicitly state on each invitation card or digital link: "We have reserved [X] seats in your honor." Specifying the number directly prevents assumptions and awkward plus-one additions.',
    proTip: 'Use individualized RSVP links so guests can only accept the exact number of allocated seats.'
  },
  {
    id: 'tip-12',
    category: 'guest-rsvps',
    question: 'How should we anticipate last-minute guest cancellations?',
    answer: 'Plan for an average 5% to 10% attrition rate during event week due to unavoidable illness or travel hiccups. If you have a secondary guest list, invite them 3 weeks prior as initial declines roll in.',
    proTip: 'Confirm your caterer’s final guarantee deadline (usually 7 to 14 days out).'
  },

  // SUPPLIERS & CONTRACTS
  {
    id: 'tip-13',
    category: 'suppliers-vendors',
    question: 'What essential questions should we ask suppliers before signing a contract?',
    answer: 'Ask about crew meal requirements, ingress and breakdown hours, overtime fees per 30 minutes, electrical/generator load requirements, and their backup protocol in case of sickness or equipment breakdown.',
    proTip: 'Request a written rider with all technical and electrical specifications.'
  },
  {
    id: 'tip-14',
    category: 'suppliers-vendors',
    question: 'Do we need to provide meals for suppliers, photographers, and coordinators?',
    answer: 'Yes! Photo and video crews, planners, audio technicians, and musicians work intensive 8 to 14 hour shifts. Always budget dedicated crew meals in your catering headcount so your team remains energized.',
    proTip: 'Coordinate crew meal timing with your planner so vendors eat while guests are eating.'
  },
  {
    id: 'tip-15',
    category: 'suppliers-vendors',
    question: 'How do we coordinate smooth venue ingress and delivery access for all vendors?',
    answer: 'Distribute a standardized vendor arrival schedule 2 weeks ahead with loading dock directions, security clearance requirements, and your coordinator’s mobile number.',
    proTip: 'Stagger vendor arrival times to avoid loading bay bottlenecks on event morning.'
  },
  {
    id: 'tip-16',
    category: 'suppliers-vendors',
    question: 'Should we sign formal written contracts for every vendor?',
    answer: 'Always. Never rely on verbal promises or direct social media messages. A binding written agreement outlines exact deliverables, arrival times, deposit refund clauses, and force majeure protections.',
    proTip: 'Keep digital copies of all supplier contracts organized in your Bread + Butter hub.'
  },

  // EVENT WEBSITE & INVITES
  {
    id: 'tip-17',
    category: 'event-website',
    question: 'What essential details should be included on our event website?',
    answer: 'Include pinned Google Maps / Waze links, ceremony and reception timelines, attire color palettes and dress code guides, RSVP cutoff dates, and gift registry information.',
    proTip: 'Pin your exact reception parking entrance to save guests from circling the block.'
  },
  {
    id: 'tip-18',
    category: 'event-website',
    question: 'How can our website assist out-of-town and international guests?',
    answer: 'Add an accommodation and travel guide with nearby hotel recommendations, airport transit tips, and local weather forecasts to keep traveling guests at ease.',
    proTip: 'Include a FAQ block answering questions about kids, parking, and photography.'
  },
  {
    id: 'tip-19',
    category: 'event-website',
    question: 'Can digital websites work together with traditional printed invitations?',
    answer: 'Absolutely! Many celebrants print elegant keepsake invitations for immediate family while printing simple QR cards for friends and extended guests to RSVP directly on their Bread + Butter website.',
    proTip: 'Include a short custom URL and QR code on your printed stationery.'
  },

  // DAY-OF COORDINATION
  {
    id: 'tip-20',
    category: 'day-of-prep',
    question: 'What items belong in the Celebrant Emergency Survival Kit?',
    answer: 'Prepare a small tote with fabric double-sided tape, sewing needle and thread, safety pins, pain relievers, blister bandages, mints, stain remover pens, phone power banks, blotting paper, and hydration packs.',
    proTip: 'Entrust the kit to your maid of honor or day-of coordinator.'
  },
  {
    id: 'tip-21',
    category: 'day-of-prep',
    question: 'Who should handle vendor calls on the day of the celebration?',
    answer: 'Give all suppliers and coordinators the phone number of your wedding planner or designated lead contact. The celebrants should keep their phones away so they can fully savor every minute.',
    proTip: 'Assign a family coordinator to answer questions from arriving guests.'
  },
  {
    id: 'tip-22',
    category: 'day-of-prep',
    question: 'How much schedule buffer should we build into the day’s timeline?',
    answer: 'Add 20-minute buffer periods after hair and makeup, between photoshoot locations, and before the reception entrance. Events naturally experience minor delays, and built-in buffers prevent stress.',
    proTip: 'Schedule hair and makeup to finish at least 45 minutes before first-look photos.'
  },
  {
    id: 'tip-23',
    category: 'day-of-prep',
    question: 'What is the most recommended thing to do right before the reception?',
    answer: 'Take 10 to 15 quiet minutes together in a private holding room right after the ceremony to eat a plate of warm appetizers, drink water, and absorb the milestone before greeting your guests.',
    proTip: 'Ask your coordinator to deliver a private sampler plate to your holding room.'
  },

  // POST-EVENT WRAP-UP
  {
    id: 'tip-24',
    category: 'post-event',
    question: 'When is the appropriate window to send out thank-you notes?',
    answer: 'Send thank-you messages within 2 to 3 weeks after your celebration while memories are vibrant. Personalized digital thank-you notes can be sent directly to your confirmed guest list.',
    proTip: 'Mention the specific gift or memory when thanking each guest.'
  },
  {
    id: 'tip-25',
    category: 'post-event',
    question: 'Who is responsible for collecting gifts and personal decor at midnight?',
    answer: 'Appoint a trusted sibling or family lead ahead of time to collect gift envelopes, personalized decor, extra favors, and framed portraits at the end of the reception.',
    proTip: 'Provide your designated person with storage boxes and packing tape.'
  }
]

function getCategoryLabel(catId: string) {
  const cat = categories.find(c => c.id === catId)
  return cat ? cat.label : ''
}

const activeCategoryLabel = computed(() => {
  return getCategoryLabel(activeCategory.value) || 'All Topics'
})

const filteredTips = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return tips.filter(tip => {
    const catLabel = getCategoryLabel(tip.category).toLowerCase()
    const catSlug = tip.category.toLowerCase()

    const matchesCategory = activeCategory.value === 'all' || tip.category === activeCategory.value || query !== ''

    const matchesSearch = query === '' ||
      tip.question.toLowerCase().includes(query) ||
      tip.answer.toLowerCase().includes(query) ||
      tip.proTip.toLowerCase().includes(query) ||
      catLabel.includes(query) ||
      catSlug.includes(query)

    return matchesCategory && matchesSearch
  })
})

function getCategoryCount(catId: string) {
  if (catId === 'all') return tips.length
  return tips.filter(t => t.category === catId).length
}

function scrollToTip(id: string) {
  activeTipId.value = id
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-8">

      <!-- Hero / Title Section -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <h1 id="tips-title" class="text-4xl sm:text-5xl font-bold font-serif text-bread-400">
          Useful Tips & Insights
        </h1>
        <p class="text-lg text-white">
          Battle-tested advice, practical formulas, and milestone checklists from seasoned event coordinators to ensure your celebration goes without a hitch.
        </p>
      </div>

      <!-- Main Layout with UPageAside on left and container on right (Matching FAQs template) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <!-- Left Side: UPageAside using bread-container CSS class -->
        <UPageAside class="bread-container bg-bread-400 text-toast-900 p-5 lg:col-span-4 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto space-y-6">
          <div>
            <h2 class="text-xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3 mb-4">
              Categories
            </h2>

            <!-- Categories Filter Navigation -->
            <div class="space-y-1">
              <button
                v-for="cat in categories"
                :key="cat.id"
                @click="activeCategory = cat.id"
                :class="[
                  'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-left cursor-pointer',
                  activeCategory === cat.id
                    ? 'bg-toast-600 text-white shadow-md font-semibold'
                    : 'text-toast-800 hover:bg-toast-500/10'
                ]"
              >
                <div class="flex items-center gap-2.5 truncate">
                  <UIcon :name="cat.icon" class="w-4 h-4 shrink-0" />
                  <span class="truncate">{{ cat.label }}</span>
                </div>
                <UBadge
                  size="xs"
                  :color="activeCategory === cat.id ? 'bread' : 'neutral'"
                  variant="subtle"
                  class="rounded-full px-2 shrink-0"
                >
                  {{ getCategoryCount(cat.id) }}
                </UBadge>
              </button>
            </div>
          </div>
        </UPageAside>

        <!-- Right Side: Main Tips Container using bread-container CSS class -->
        <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-8 lg:col-span-8 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-toast-600/20 pb-4">
            <div>
              <h2 class="text-2xl font-bold font-serif text-toast-800">
                {{ activeCategoryLabel }}
              </h2>
              <p class="text-xs text-toast-700 mt-1">
                Showing {{ filteredTips.length }} tip{{ filteredTips.length === 1 ? '' : 's' }}
              </p>
            </div>

            <!-- Search input on the right side of container header -->
            <div class="w-full sm:w-64 md:w-72">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Search tips, topics, or advice..."
                size="md"
                class="w-full bg-white/90 text-toast-900 border-toast-300 focus:border-toast-600 rounded-lg shadow-sm"
              />
            </div>
          </div>

          <div v-if="filteredTips.length === 0" class="py-12 text-center text-toast-800 space-y-3">
            <UIcon name="i-lucide-lightbulb" class="w-12 h-12 mx-auto text-toast-600 opacity-60" />
            <p class="text-lg font-semibold">No tips found</p>
            <p class="text-sm text-toast-700">Try adjusting your search query or category filter.</p>
            <UButton size="xs" color="toast" variant="outline" @click="searchQuery = ''; activeCategory = 'all'">
              Reset Filters
            </UButton>
          </div>

          <div v-else class="space-y-4">
            <!-- Each Tip item in individual container with bread-container class -->
            <div
              v-for="tip in filteredTips"
              :key="tip.id"
              :id="tip.id"
              :class="[
                'bread-container transition-all p-5 bg-white/95 border-l-4 cursor-pointer',
                activeTipId === tip.id
                  ? 'border-toast-600 shadow-md ring-2 ring-toast-600/20'
                  : 'border-toast-300 hover:border-toast-500'
              ]"
              @click="activeTipId = tip.id"
            >
              <div class="flex items-start justify-between gap-4">
                <h3 class="text-lg font-bold text-toast-900 font-serif flex items-start gap-3">
                  <span class="w-2 h-2 rounded-full bg-toast-600 shrink-0 mt-2.5"></span>
                  <span>{{ tip.question }}</span>
                </h3>
              </div>
              <p class="mt-2 text-sm text-toast-800 leading-relaxed pl-5">
                {{ tip.answer }}
              </p>
              <div class="mt-3 ml-5 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-toast-600/10 text-xs font-medium text-toast-800">
                <UIcon name="i-lucide-sparkles" class="size-3.5 text-toast-600 shrink-0" />
                <span>{{ tip.proTip }}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>

<style scoped></style>
