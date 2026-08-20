<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'FAQs - Bread + Butter',
  meta: [
    { name: 'description', content: 'Frequently Asked Questions about Bread + Butter event planning, packages, websites, RSVPs, suppliers, and support.' }
  ]
})

const searchQuery = ref('')
const activeCategory = ref('all')
const activeFaqId = ref('faq-1')

const categories = [
  { id: 'all', label: 'All Topics', icon: 'i-lucide-layers' },
  { id: 'getting-started', label: 'Getting Started', icon: 'i-lucide-rocket' },
  { id: 'packages-activation', label: 'Packages & Activation', icon: 'i-lucide-package' },
  { id: 'payments', label: 'Payments', icon: 'i-lucide-credit-card' },
  { id: 'account-access', label: 'Account Access', icon: 'i-lucide-user-check' },
  { id: 'event-website', label: 'Event Website', icon: 'i-lucide-globe' },
  { id: 'invitations-rsvps', label: 'Invitations & RSVPs', icon: 'i-lucide-mail' },
  { id: 'planning-tools', label: 'Planning Tools', icon: 'i-lucide-list-checks' },
  { id: 'suppliers', label: 'Suppliers', icon: 'i-lucide-briefcase' },
  { id: 'collaboration', label: 'Collaboration', icon: 'i-lucide-users' },
  { id: 'notifications-changes', label: 'Notifications & Changes', icon: 'i-lucide-bell' },
  { id: 'privacy-security', label: 'Privacy & Security', icon: 'i-lucide-shield-check' },
  { id: 'technical-support', label: 'Technical & Support', icon: 'i-lucide-help-circle' }
]

const faqs = [
  // GETTING STARTED
  {
    id: 'faq-1',
    category: 'getting-started',
    question: 'What is Bread + Butter?',
    answer: 'Bread + Butter is an all-in-one event planning platform that brings your event website, guests, RSVPs, tasks, suppliers, payments, schedules, requirements, and collaborators together in one organized space. It is designed to make planning easier for both celebrants and professional event planners.'
  },
  {
    id: 'faq-2',
    category: 'getting-started',
    question: 'Who can use Bread + Butter?',
    answer: 'Bread + Butter is made for celebrants planning their own events, professional event planners managing clients, and teams working together on a celebration.'
  },
  {
    id: 'faq-3',
    category: 'getting-started',
    question: 'Is Bread + Butter only for weddings?',
    answer: 'Not at all. Bread + Butter can be used for weddings, birthdays, debuts, baptisms, anniversaries, engagements, baby showers, corporate celebrations, and other special events.'
  },
  {
    id: 'faq-4',
    category: 'getting-started',
    question: 'Do I need an event planner to use Bread + Butter?',
    answer: 'No. You can use Bread + Butter whether you are planning your event yourself or working with a professional planner.'
  },
  {
    id: 'faq-5',
    category: 'getting-started',
    question: 'Can I use Bread + Butter with my event planner?',
    answer: 'Yes. Depending on your package, you may invite your planner or other collaborators so everyone can work from the same event information.'
  },
  {
    id: 'faq-6',
    category: 'getting-started',
    question: 'Can event planners use Bread + Butter for their clients?',
    answer: 'Yes. Bread + Butter is designed to help planners organize event details, clients, suppliers, tasks, schedules, payments, and requirements in one workspace.'
  },
  {
    id: 'faq-7',
    category: 'getting-started',
    question: 'Do I need to download an app?',
    answer: 'Bread + Butter is web based, so you can access your account through a compatible browser.'
  },
  {
    id: 'faq-8',
    category: 'getting-started',
    question: 'Can I use Bread + Butter on my phone?',
    answer: 'Yes. You can access your event through your mobile browser, making it easier to check important details while on the go.'
  },
  {
    id: 'faq-9',
    category: 'getting-started',
    question: 'Can I also use it on a laptop or desktop?',
    answer: 'Yes. You can access Bread + Butter through your supported browser on compatible devices.'
  },

  // PACKAGES & ACTIVATION
  {
    id: 'faq-10',
    category: 'packages-activation',
    question: 'What packages are available?',
    answer: 'Bread + Butter offers different portions depending on how much planning support you need. You can choose the package that best fits your celebration and the features you want to use.'
  },
  {
    id: 'faq-11',
    category: 'packages-activation',
    question: 'Which package is right for me?',
    answer: 'If you mainly need guest facing tools such as your event website, invitations, and RSVPs, a basic package may be enough. If you want more planning tools such as tasks, suppliers, payments, schedules, and requirements, choose a more complete package.'
  },
  {
    id: 'faq-12',
    category: 'packages-activation',
    question: 'What is included in my package?',
    answer: 'The features included will depend on the package you selected. You can check the package comparison before purchasing to see exactly what is included in each portion.'
  },
  {
    id: 'faq-13',
    category: 'packages-activation',
    question: 'Can I upgrade my package later?',
    answer: 'Where upgrades are available, you may move to a package with additional features as your planning needs grow.'
  },
  {
    id: 'faq-14',
    category: 'packages-activation',
    question: 'Can I downgrade my package?',
    answer: 'Package changes may depend on your current subscription, payment status, and the features already activated. Contact Bread + Butter Support for assistance.'
  },
  {
    id: 'faq-15',
    category: 'packages-activation',
    question: 'Can I add features without changing my entire package?',
    answer: 'Where add-ons are available, you may purchase additional features separately. Available add-ons will be shown in your account or package options.'
  },
  {
    id: 'faq-16',
    category: 'packages-activation',
    question: 'Can I use Bread + Butter for more than one event?',
    answer: 'Each event may require its own event space or package depending on the type of account you have. Professional planner accounts may have options designed for managing multiple events.'
  },
  {
    id: 'faq-17',
    category: 'packages-activation',
    question: 'Can I transfer my package to another event?',
    answer: 'Package transfers may be subject to the package terms and whether the event has already been set up or activated. Contact Support so the team can check your account.'
  },
  {
    id: 'faq-18',
    category: 'packages-activation',
    question: 'How will I know when I can get the package I availed?',
    answer: 'Once your payment and package have been successfully processed, you will receive a confirmation or activation notice with instructions on how to access your Bread + Butter features. You can also check your account for the status of your package.'
  },
  {
    id: 'faq-19',
    category: 'packages-activation',
    question: 'When can I start using Bread + Butter?',
    answer: 'You can start setting up your event once your selected package has been activated in your account.'
  },
  {
    id: 'faq-20',
    category: 'packages-activation',
    question: 'Why is my package not showing yet?',
    answer: 'Your payment or package activation may still be processing. Check your payment confirmation and account status first. If the package still does not appear, contact Bread + Butter Support and provide your account details and proof of payment.'
  },
  {
    id: 'faq-21',
    category: 'packages-activation',
    question: 'Will I receive a confirmation when my package is ready?',
    answer: 'Yes. You will be notified once your package has been successfully activated and is ready to use.'
  },

  // PAYMENTS
  {
    id: 'faq-22',
    category: 'payments',
    question: 'How can I pay for my package?',
    answer: 'Available payment methods will be shown during checkout. Choose your preferred payment option and follow the instructions provided.'
  },
  {
    id: 'faq-23',
    category: 'payments',
    question: 'How will I know if my payment pushed through?',
    answer: 'Once your payment is successful, you should receive a payment confirmation and your transaction status should be reflected in your account. If you are unsure, check whether you received a confirmation before making another payment.'
  },
  {
    id: 'faq-24',
    category: 'payments',
    question: 'What if my payment is still pending?',
    answer: 'Some transactions may take additional time to be confirmed depending on the payment method used. Avoid submitting another payment immediately. Check your account or contact Support if the status does not update.'
  },
  {
    id: 'faq-25',
    category: 'payments',
    question: 'What if my payment failed?',
    answer: 'If your payment was unsuccessful, you can try again using the same or another available payment method. Make sure your payment details are correct before resubmitting.'
  },
  {
    id: 'faq-26',
    category: 'payments',
    question: 'What if I was charged but my account says my payment failed?',
    answer: 'Do not make another payment yet. Keep your transaction reference, screenshot, receipt, or other proof of payment and contact Bread + Butter Support so the transaction can be checked.'
  },
  {
    id: 'faq-27',
    category: 'payments',
    question: 'What if I accidentally paid twice?',
    answer: 'Contact Support and provide both transaction details so the payments can be reviewed. Any refund or adjustment will be subject to Bread + Butter\'s applicable payment and refund policies.'
  },
  {
    id: 'faq-28',
    category: 'payments',
    question: 'Will I receive a receipt or proof of payment?',
    answer: 'A payment confirmation or transaction record should be provided once your payment has been successfully processed.'
  },
  {
    id: 'faq-29',
    category: 'payments',
    question: 'Is my payment information secure?',
    answer: 'Bread + Butter uses its available payment processing partners and security measures to handle transactions. Payment information is processed according to the applicable payment provider\'s security standards and policies.'
  },
  {
    id: 'faq-30',
    category: 'payments',
    question: 'Can someone else pay for my package?',
    answer: 'Yes, provided the payment can be properly matched to your Bread + Butter account or order. Keep the transaction reference in case verification is needed.'
  },

  // ACCOUNT ACCESS
  {
    id: 'faq-31',
    category: 'account-access',
    question: 'How do I create an account?',
    answer: 'Choose your preferred package or sign up option and follow the registration instructions. Make sure you use an active email address that you can access.'
  },
  {
    id: 'faq-32',
    category: 'account-access',
    question: 'What if I can\'t access my account?',
    answer: 'First, check that you are using the correct email address and password. If you still cannot log in, use the password recovery option or contact Bread + Butter Support for assistance.'
  },
  {
    id: 'faq-33',
    category: 'account-access',
    question: 'What will I do if I forgot my password?',
    answer: 'Select Forgot Password on the login page and enter the email address connected to your Bread + Butter account. Follow the instructions sent to your email to create a new password.'
  },
  {
    id: 'faq-34',
    category: 'account-access',
    question: 'I requested a password reset but did not receive an email. What should I do?',
    answer: 'Check your spam, junk, promotions, or other filtered folders first. Make sure you entered the same email address used to create your Bread + Butter account. If the email still does not arrive, contact Support.'
  },
  {
    id: 'faq-35',
    category: 'account-access',
    question: 'What if I forgot which email address I used?',
    answer: 'Contact Bread + Butter Support and provide enough information to help verify your account. For security purposes, additional verification may be required.'
  },
  {
    id: 'faq-36',
    category: 'account-access',
    question: 'Can I change my account email address?',
    answer: 'Where available, you can update your account information through your profile or account settings. If you are unable to change it yourself, contact Support.'
  },
  {
    id: 'faq-37',
    category: 'account-access',
    question: 'Can I change my password?',
    answer: 'Yes. You can change your password through your account settings or use the password reset option.'
  },
  {
    id: 'faq-38',
    category: 'account-access',
    question: 'Can I share my login details with my planner or team?',
    answer: 'We recommend keeping your personal login details private. Where collaborator access is included, invite your planner or team through the platform instead of sharing your password.'
  },
  {
    id: 'faq-39',
    category: 'account-access',
    question: 'Why was I logged out?',
    answer: 'For security, you may occasionally be asked to sign in again, especially after a period of inactivity or when accessing your account from another device.'
  },

  // EVENT WEBSITE
  {
    id: 'faq-40',
    category: 'event-website',
    question: 'Can I create my event website through Bread + Butter?',
    answer: 'Yes. Bread + Butter allows you to create a personalized digital home for your celebration.'
  },
  {
    id: 'faq-41',
    category: 'event-website',
    question: 'What can I put on my event website?',
    answer: 'Depending on your package and available features, you may include your event details, photos, story, schedules, venue information, RSVP details, registry, playlists, and other important information for your guests.'
  },
  {
    id: 'faq-42',
    category: 'event-website',
    question: 'Can I customize the look of my website?',
    answer: 'Available customization options may include themes, colors, photos, content, and other design elements depending on your selected package.'
  },
  {
    id: 'faq-43',
    category: 'event-website',
    question: 'Can I edit my event website after publishing it?',
    answer: 'Yes. You can update available content and event information when plans change.'
  },
  {
    id: 'faq-44',
    category: 'event-website',
    question: 'Will guests need a Bread + Butter account to view my event website?',
    answer: 'Guest access will depend on the privacy and access settings selected for your event.'
  },
  {
    id: 'faq-45',
    category: 'event-website',
    question: 'Can I keep my event website private?',
    answer: 'Where privacy controls are available, you can manage how guests access your event information.'
  },
  {
    id: 'faq-46',
    category: 'event-website',
    question: 'Can I change my event details later?',
    answer: 'Yes. Event information can be updated as your plans develop.'
  },
  {
    id: 'faq-47',
    category: 'event-website',
    question: 'What happens to my event website after the celebration?',
    answer: 'The availability of your website after your event may depend on your package duration and applicable account terms.'
  },

  // INVITATIONS AND RSVPS
  {
    id: 'faq-48',
    category: 'invitations-rsvps',
    question: 'Can I send digital invitations through Bread + Butter?',
    answer: 'Yes. Available packages may include digital invitation tools that work together with your event website and guest list.'
  },
  {
    id: 'faq-49',
    category: 'invitations-rsvps',
    question: 'Can guests RSVP online?',
    answer: 'Yes. Guests can submit their RSVP through the available guest response feature.'
  },
  {
    id: 'faq-50',
    category: 'invitations-rsvps',
    question: 'Where can I see who has RSVP\'d?',
    answer: 'Your guest management area allows you to monitor responses and see who has confirmed, declined, or has not yet responded.'
  },
  {
    id: 'faq-51',
    category: 'invitations-rsvps',
    question: 'Can guests change their RSVP?',
    answer: 'Where enabled, guest responses may be updated when circumstances change.'
  },
  {
    id: 'faq-52',
    category: 'invitations-rsvps',
    question: 'Can I set an RSVP deadline?',
    answer: 'Yes. You can include an RSVP deadline so guests know when you need their final response.'
  },
  {
    id: 'faq-53',
    category: 'invitations-rsvps',
    question: 'Can I send RSVP reminders?',
    answer: 'Where reminder features are available, you can follow up with guests who have not yet responded.'
  },
  {
    id: 'faq-54',
    category: 'invitations-rsvps',
    question: 'Can I add guests manually?',
    answer: 'Yes. You can add and organize guest information directly in your guest list.'
  },
  {
    id: 'faq-55',
    category: 'invitations-rsvps',
    question: 'Can I include plus ones?',
    answer: 'Yes. Guest arrangements such as plus ones can be managed according to the options available for your event.'
  },
  {
    id: 'faq-56',
    category: 'invitations-rsvps',
    question: 'Can I collect guest preferences?',
    answer: 'Depending on the available RSVP settings, you may collect information such as meal preferences, dietary restrictions, attendance details, and other guest information.'
  },
  {
    id: 'faq-57',
    category: 'invitations-rsvps',
    question: 'Can I organize guests by family or group?',
    answer: 'Where available, guest grouping can make it easier to manage households, families, entourages, or other guest categories.'
  },

  // PLANNING TOOLS
  {
    id: 'faq-58',
    category: 'planning-tools',
    question: 'Can I create a checklist for my event?',
    answer: 'Yes. Bread + Butter\'s planning tools help you keep track of what needs to be done, what is in progress, and what has already been completed.'
  },
  {
    id: 'faq-59',
    category: 'planning-tools',
    question: 'Can I assign tasks to other people?',
    answer: 'Where collaboration features are included, tasks may be assigned or shared with your planner or other collaborators.'
  },
  {
    id: 'faq-60',
    category: 'planning-tools',
    question: 'Can I set deadlines for tasks?',
    answer: 'Yes. Deadlines help you keep track of important planning milestones and upcoming responsibilities.'
  },
  {
    id: 'faq-61',
    category: 'planning-tools',
    question: 'Can I track my event schedule?',
    answer: 'Yes. Bread + Butter can help organize important dates, appointments, deadlines, and event schedules in one place.'
  },
  {
    id: 'faq-62',
    category: 'planning-tools',
    question: 'Can I create an event day timeline?',
    answer: 'Where available, you can organize the sequence of activities and important timings for your celebration.'
  },
  {
    id: 'faq-63',
    category: 'planning-tools',
    question: 'Can I keep track of event requirements?',
    answer: 'Yes. You can organize important requirements related to your ceremony, venue, church, suppliers, or other parts of your event.'
  },
  {
    id: 'faq-64',
    category: 'planning-tools',
    question: 'Can I upload documents?',
    answer: 'Where file upload features are available, you may keep relevant documents connected to your event or planning records.'
  },

  // SUPPLIERS
  {
    id: 'faq-65',
    category: 'suppliers',
    question: 'Can I keep my supplier details in Bread + Butter?',
    answer: 'Yes. Bread + Butter helps you organize supplier information alongside the rest of your event planning.'
  },
  {
    id: 'faq-66',
    category: 'suppliers',
    question: 'What supplier information can I keep?',
    answer: 'Depending on the available features, you may keep contact information, service details, payment schedules, notes, contracts, quotations, and other relevant information.'
  },
  {
    id: 'faq-67',
    category: 'suppliers',
    question: 'Can I keep track of supplier payments?',
    answer: 'Yes. You can monitor upcoming payment schedules and important supplier related deadlines.'
  },
  {
    id: 'faq-68',
    category: 'suppliers',
    question: 'Does Bread + Butter pay my suppliers for me?',
    answer: 'Unless specifically offered as part of a service, Bread + Butter functions as a planning and tracking platform rather than making supplier payments on your behalf.'
  },
  {
    id: 'faq-69',
    category: 'suppliers',
    question: 'Can my suppliers access Bread + Butter?',
    answer: 'Supplier access will depend on the collaboration features available for your package.'
  },
  {
    id: 'faq-70',
    category: 'suppliers',
    question: 'Does Bread + Butter recommend suppliers?',
    answer: 'If supplier recommendations or marketplace features are offered, available options will be shown separately from your planning tools.'
  },

  // COLLABORATION
  {
    id: 'faq-71',
    category: 'collaboration',
    question: 'Can I invite my planner to my event?',
    answer: 'Yes, if collaborator access is included in your package.'
  },
  {
    id: 'faq-72',
    category: 'collaboration',
    question: 'Can I invite family members or members of my entourage?',
    answer: 'Where collaborator access allows it, you may invite additional people who are helping you plan.'
  },
  {
    id: 'faq-73',
    category: 'collaboration',
    question: 'Will collaborators see everything in my account?',
    answer: 'Access may depend on the permissions and collaboration settings available for your package.'
  },
  {
    id: 'faq-74',
    category: 'collaboration',
    question: 'Can I remove a collaborator?',
    answer: 'Where collaborator management is available, you can update or remove access when needed.'
  },
  {
    id: 'faq-75',
    category: 'collaboration',
    question: 'What happens when my planner updates something?',
    answer: 'Changes made within the shared event workspace can be reflected in the event information available to authorized collaborators.'
  },
  {
    id: 'faq-76',
    category: 'collaboration',
    question: 'Can we work on the event at the same time?',
    answer: 'Bread + Butter is designed to make collaboration easier by keeping your event information in one shared workspace.'
  },

  // NOTIFICATIONS AND UPDATES
  {
    id: 'faq-77',
    category: 'notifications-changes',
    question: 'Will Bread + Butter remind me about deadlines?',
    answer: 'Available notification features may help you stay aware of upcoming tasks, payments, schedules, and other important dates.'
  },
  {
    id: 'faq-78',
    category: 'notifications-changes',
    question: 'How will I receive notifications?',
    answer: 'Notifications may be sent through your account and other available communication channels depending on your settings.'
  },
  {
    id: 'faq-79',
    category: 'notifications-changes',
    question: 'Can I turn notifications off?',
    answer: 'Where notification settings are available, you can adjust your preferences according to the updates you want to receive.'
  },
  {
    id: 'faq-80',
    category: 'notifications-changes',
    question: 'Will guests receive notifications?',
    answer: 'Guest notifications will depend on the communication and reminder features enabled for your event.'
  },
  {
    id: 'faq-81',
    category: 'notifications-changes',
    question: 'What if my event date changes?',
    answer: 'Update your event information as soon as possible so your planning details and guest information remain accurate.'
  },
  {
    id: 'faq-82',
    category: 'notifications-changes',
    question: 'What if my venue changes?',
    answer: 'You can update your venue information and other related event details through your event workspace.'
  },
  {
    id: 'faq-83',
    category: 'notifications-changes',
    question: 'What if I postpone my event?',
    answer: 'Contact Bread + Butter Support if your postponement affects your package validity, event access, or other account conditions.'
  },
  {
    id: 'faq-84',
    category: 'notifications-changes',
    question: 'What if I cancel my event?',
    answer: 'Contact Support regarding your account and package. Any cancellation, credit, extension, or refund will be subject to the applicable package terms.'
  },
  {
    id: 'faq-85',
    category: 'notifications-changes',
    question: 'Can I change the type of event after setting up my account?',
    answer: 'Minor event information can generally be updated, but major changes may depend on how your package or event has already been configured.'
  },

  // PRIVACY AND SECURITY
  {
    id: 'faq-86',
    category: 'privacy-security',
    question: 'Who can see my event information?',
    answer: 'Access depends on your event settings and the people you choose to share or collaborate with.'
  },
  {
    id: 'faq-87',
    category: 'privacy-security',
    question: 'Is my guest information private?',
    answer: 'Bread + Butter handles guest and account information according to its applicable privacy and data protection practices.'
  },
  {
    id: 'faq-88',
    category: 'privacy-security',
    question: 'Will my guest information be shared with suppliers?',
    answer: 'Guest information should only be made available according to the permissions and services connected to your event.'
  },
  {
    id: 'faq-89',
    category: 'privacy-security',
    question: 'Can I delete information from my account?',
    answer: 'Available account and data management options will depend on the type of information and applicable retention requirements.'
  },
  {
    id: 'faq-90',
    category: 'privacy-security',
    question: 'How does Bread + Butter protect my account?',
    answer: 'Use a strong password, keep your login information private, and make sure the email connected to your account remains secure.'
  },

  // TECHNICAL QUESTIONS & SUPPORT
  {
    id: 'faq-91',
    category: 'technical-support',
    question: 'Which browser should I use?',
    answer: 'For the best experience, use an updated version of a commonly supported browser.'
  },
  {
    id: 'faq-92',
    category: 'technical-support',
    question: 'What should I do if a page is not loading?',
    answer: 'Refresh the page, check your internet connection, and make sure your browser is up to date. If the issue continues, contact Bread + Butter Support.'
  },
  {
    id: 'faq-93',
    category: 'technical-support',
    question: 'What if a feature is not working?',
    answer: 'Try refreshing or signing back into your account first. If the issue continues, take a screenshot and send it to Support together with a short description of what happened.'
  },
  {
    id: 'faq-94',
    category: 'technical-support',
    question: 'Why can\'t I see a feature shown on the website?',
    answer: 'Some features may only be available under certain packages, account types, or product releases. Check your package inclusions or contact Support for clarification.'
  },
  {
    id: 'faq-95',
    category: 'technical-support',
    question: 'Can I use Bread + Butter outside the Philippines?',
    answer: 'Access may be possible wherever you have a compatible device and internet connection, subject to the availability of specific services or payment options in your location.'
  },
  {
    id: 'faq-96',
    category: 'technical-support',
    question: 'How can I contact Bread + Butter?',
    answer: 'You can reach the Bread + Butter team through the support or contact options provided on the website.'
  },
  {
    id: 'faq-97',
    category: 'technical-support',
    question: 'What information should I provide when asking for help?',
    answer: 'To help resolve your concern faster, include: your registered name, registered email address, event name, a short description of the concern, screenshots if applicable, and payment or transaction reference if payment related.'
  },
  {
    id: 'faq-98',
    category: 'technical-support',
    question: 'What if I have a concern that is not listed here?',
    answer: 'No worries. Send Bread + Butter Support a message and let the team know how they can help. We\'ll help you get back on a roll.'
  }
]

function getCategoryLabel(catId: string) {
  const cat = categories.find(c => c.id === catId)
  return cat ? cat.label : ''
}

const activeCategoryLabel = computed(() => {
  return getCategoryLabel(activeCategory.value) || 'All Topics'
})

const filteredFaqs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return faqs.filter(faq => {
    const catLabel = getCategoryLabel(faq.category).toLowerCase()
    const catSlug = faq.category.toLowerCase()

    // When there is an active search query, allow matching across all categories
    const matchesCategory = activeCategory.value === 'all' || faq.category === activeCategory.value || query !== ''

    const matchesSearch = query === '' ||
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      catLabel.includes(query) ||
      catSlug.includes(query)

    return matchesCategory && matchesSearch
  })
})

function getCategoryCount(catId: string) {
  if (catId === 'all') return faqs.length
  return faqs.filter(f => f.category === catId).length
}

function scrollToFaq(id: string) {
  activeFaqId.value = id
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
        <h1 id="faq-title" class="text-4xl sm:text-5xl font-bold font-serif text-bread-400">
          Frequently Asked Questions
        </h1>
        <p class="text-lg text-white">
          Got questions? We've got the goods. Everything you need to know about getting started, choosing your portion, managing your celebration, payments, account access, and more.
        </p>
      </div>

      <!-- Main FAQ Layout with UPageAside on left and container on right -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <!-- Left Side: UPageAside using bread-container CSS class -->
        <UPageAside class="bread-container bg-bread-400 text-toast-900 p-5 lg:col-span-4 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto space-y-6">
          <div>
            <h2 class="text-xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3 mb-4">
              Categories
            </h2>

            <!-- Categories Filter Navigation -->
            <div class="space-y-1">
              <button v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id" :class="[
                'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-left',
                activeCategory === cat.id
                  ? 'bg-toast-600 text-white shadow-md font-semibold'
                  : 'text-toast-800 hover:bg-toast-500/10'
              ]">
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

        <!-- Right Side: Main FAQ Container using bread-container CSS class -->
        <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-8 lg:col-span-8 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-toast-600/20 pb-4">
            <div>
              <h2 class="text-2xl font-bold font-serif text-toast-800">
                {{ activeCategoryLabel }}
              </h2>
              <p class="text-xs text-toast-700 mt-1">
                Showing {{ filteredFaqs.length }} question{{ filteredFaqs.length === 1 ? '' : 's' }}
              </p>
            </div>

            <!-- Search input on the right side of container header -->
            <div class="w-full sm:w-64 md:w-72">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Search questions or categories..."
                size="md"
                class="w-full bg-white/90 text-toast-900 border-toast-300 focus:border-toast-600 rounded-lg shadow-sm"
              />
            </div>
          </div>

          <div v-if="filteredFaqs.length === 0" class="py-12 text-center text-toast-800 space-y-3">
            <UIcon name="i-lucide-help-circle" class="w-12 h-12 mx-auto text-toast-600 opacity-60" />
            <p class="text-lg font-semibold">No questions found</p>
            <p class="text-sm text-toast-700">Try adjusting your search query or category filter.</p>
            <UButton size="xs" color="toast" variant="outline" @click="searchQuery = ''; activeCategory = 'all'">
              Reset Filters
            </UButton>
          </div>

          <div v-else class="space-y-4">
            <!-- Each FAQ item in individual container with bread-container class -->
            <div v-for="faq in filteredFaqs" :key="faq.id" :id="faq.id" :class="[
              'bread-container transition-all p-5 bg-white/95 border-l-4 cursor-pointer',
              activeFaqId === faq.id ? 'border-toast-600 shadow-md ring-2 ring-toast-600/20' : 'border-toast-300 hover:border-toast-500'
            ]" @click="activeFaqId = faq.id">
              <div class="flex items-start justify-between gap-4">
                <h3 class="text-lg font-bold text-toast-900 font-serif flex items-start gap-3">
                  <span class="w-2 h-2 rounded-full bg-toast-600 shrink-0 mt-2.5"></span>
                  <span>{{ faq.question }}</span>
                </h3>
              </div>
              <p class="mt-2 text-sm text-toast-800 leading-relaxed pl-5">
                {{ faq.answer }}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>
