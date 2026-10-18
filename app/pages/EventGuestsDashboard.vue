<script lang="ts" setup>
import { nextTick } from 'vue'
import { toCanvas } from 'html-to-image'
import type { TableColumn } from '@nuxt/ui'
import type { EventRecord, GuestRecord, RsvpSummary } from '~/types/event'
import type { InvitationRecord } from '~/types/invitation'
import type { CustomSiteRecord } from '~/types/customSite'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'
import { useGuests } from '~/composables/useGuests'
import { useInvitation } from '~/composables/useInvitation'
import { useCustomSite } from '~/composables/useCustomSite'
import { useEventGuestsManager, addGuestSchema, editGuestSchema } from '~/composables/useEventGuestsManager'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { useEventGuestGroupsManager } from '~/composables/useEventGuestGroupsManager'
import { useEventGuestRolesAndTablesManager } from '~/composables/useEventGuestRolesAndTablesManager'
import type { GuestRoleRecord } from '~/types/guest_role'
import {
  generateImageInvitationEmailHtml,
  buildGuestWebsiteUrl,
  DEFAULT_APP_DOMAIN,
} from '~/utils/invitationEmailTemplate'
import { resolveCustomSiteTheme, type ColorPalette, type TypographySet } from '~/utils/websiteTheme'
import { formatDateWithWeekday, formatTime } from '~/utils/invitationDisplay'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Guest List',
  bgClass: 'bg-orange-50'
})

useWeddingFonts()

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { fetchGuestsByEvent, sendGuestInvite } = useGuests()
const { fetchInvitationByEvent } = useInvitation()
const { fetchCustomSitesByEvent } = useCustomSite()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const { isExporting, exportEventPdf } = useEventPdfExport()
const { startPageTransition, finishPageTransition } = usePageTransition()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const rsvpSummary = ref<RsvpSummary | null>(null)
const guestList = ref<GuestRecord[]>([])
const isLoadingEvent = ref(false)
const isLoadingGuests = ref(false)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')

const reloadGuestDataRef = ref<((targetEventId?: string) => Promise<void>) | null>(null)
const guestRoles = ref<GuestRoleRecord[]>([])
const selectedTab = ref('guest-list')

// Established Invitation & Custom Site State for Straight JPEG Email Generation
const establishedInvitation = ref<InvitationRecord | null>(null)
const establishedCustomSite = ref<CustomSiteRecord | null>(null)
const headlessCardRef = ref<HTMLElement | null>(null)
const headlessGuestName = ref('Guest')

const cachedDesign = ref<{
  eventId?: string
  palette?: ColorPalette
  typography?: TypographySet
  websiteSlug?: string
  bannerImageUrl?: string
  bannerImageSource?: string
  requestLine?: string
  eventLabel?: string
  eventDate?: string
  eventTime?: string
  eventVenue?: string
  deadlineText?: string
  deadlineDate?: string
  savedAt?: string
} | null>(null)

const establishedTheme = computed(() => resolveCustomSiteTheme(establishedCustomSite.value))

const palette = computed<ColorPalette>(() => {
  if (cachedDesign.value?.palette?.colors) {
    return cachedDesign.value.palette
  }
  return establishedTheme.value.palette
})

const typography = computed<TypographySet>(() => {
  if (cachedDesign.value?.typography?.headerFont) {
    return cachedDesign.value.typography
  }
  return establishedTheme.value.typography
})

const effectiveBannerImageUrl = computed(() => {
  // 1. Direct bannerImageUrl on establishedInvitation record
  if (establishedInvitation.value?.bannerImageUrl?.trim()) {
    return establishedInvitation.value.bannerImageUrl.trim()
  }
  // 2. Banner image in blocks array (from backend)
  const blockBanner = establishedInvitation.value?.blocks?.find(b => b.type === 'banner-image')?.content
  if (blockBanner?.trim()) {
    return blockBanner.trim()
  }
  // 3. Cached established design from InvitationMaker in localStorage
  if (cachedDesign.value?.bannerImageUrl?.trim()) {
    return cachedDesign.value.bannerImageUrl.trim()
  }
  // 4. Custom site header image (matching InvitationMaker default)
  if (establishedCustomSite.value?.headerImageURL?.trim()) {
    return establishedCustomSite.value.headerImageURL.trim()
  }
  return ''
})

const effectiveInvitation = computed(() => ({
  requestLine: establishedInvitation.value?.requestLine || cachedDesign.value?.requestLine || 'Together with their families',
  eventLabel: establishedInvitation.value?.eventLabel || cachedDesign.value?.eventLabel || establishedCustomSite.value?.title || 'Alex & Jordan are getting married!',
  eventDate: establishedInvitation.value?.eventDate || cachedDesign.value?.eventDate || '',
  eventTime: establishedInvitation.value?.eventTime || cachedDesign.value?.eventTime || '',
  eventVenue: establishedInvitation.value?.eventVenue || cachedDesign.value?.eventVenue || establishedCustomSite.value?.whereToStay?.location || '',
  deadlineText: establishedInvitation.value?.deadlineText || cachedDesign.value?.deadlineText || 'Please let us know if you can make it so we can accommodate you.',
  deadlineDate: establishedInvitation.value?.deadlineDate || cachedDesign.value?.deadlineDate || '',
  bannerImageUrl: effectiveBannerImageUrl.value,
}))

const websiteSlug = computed(() => {
  if (cachedDesign.value?.websiteSlug?.trim()) {
    return cachedDesign.value.websiteSlug.trim()
  }
  if (establishedCustomSite.value?.siteName?.trim()) {
    return establishedCustomSite.value.siteName.trim()
  }
  if (establishedCustomSite.value?.title?.trim()) {
    return establishedCustomSite.value.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
  }
  return ''
})

async function loadEstablishedDesign() {
  const id = eventId.value

  // Read local cache first for instant synchronization
  if (typeof window !== 'undefined') {
    try {
      const raw =
        (id ? localStorage.getItem(`bpb_invitation_established_${id}`) : null) ||
        localStorage.getItem('bpb_invitation_established_latest')
      if (raw) {
        cachedDesign.value = JSON.parse(raw)
      }
    } catch (err) {
      console.warn('Could not load cached invitation design:', err)
    }
  }

  if (!id) return
  try {
    const [inv, sites] = await Promise.all([
      fetchInvitationByEvent(id).catch(() => null),
      fetchCustomSitesByEvent(id).catch(() => []),
    ])
    establishedInvitation.value = inv
    establishedCustomSite.value = sites?.[0] ?? null
  } catch (err) {
    console.warn('Could not load established invitation/site design:', err)
  }
}

async function captureStationeryCard(guestName: string): Promise<string | null> {
  headlessGuestName.value = guestName || 'Guest'
  await nextTick()
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready
    } catch {
      // Font load fallback
    }
  }

  if (headlessCardRef.value) {
    // Wait for all images inside headlessCardRef to load and decode
    const images = Array.from(headlessCardRef.value.querySelectorAll('img'))
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
        return new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
          if ('decode' in img) {
            img.decode().then(resolve).catch(resolve)
          }
          setTimeout(resolve, 800)
        })
      })
    )

    try {
      const canvas = await toCanvas(headlessCardRef.value, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f7f4ef',
      })

      // All emails are sent in high-efficiency JPEG format (~100-140KB, 100% universal email client compatibility)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90)

      if (dataUrl && dataUrl.startsWith('data:image/')) {
        return dataUrl
      }
    } catch (err) {
      console.warn('Could not capture headless stationery card:', err)
    }
  }

  if (typeof window !== 'undefined') {
    const cached =
      localStorage.getItem(`bpb_invitation_card_${eventId.value}`) ||
      localStorage.getItem('bpb_invitation_card_latest')
    if (cached && cached.startsWith('data:image/')) {
      return cached
    }
  }
  return null
}

const {
  isAddGuestModalOpen,
  isEditGuestModalOpen,
  isSubmittingGuest,
  isUpdatingGuest,
  sendingGuestId,
  isInvitingAll,
  deletingGuestId,
  isRemoveGuestModalOpen,
  guestToRemove,
  isNoQuestionsWarningOpen,
  addGuestState,
  editGuestState,
  mutationsDisabled,
  tableRows,
  isGuestListEmpty,
  guestListSize,
  invitationsSentCount,
  canInviteAll,
  canSendGuestInvite,
  remainingEmails,
  hasEmailCredits,
  rsvpStats,
  handleAddGuest,
  openEditGuestModal,
  closeEditGuestModal,
  handleEditGuest,
  openRemoveGuestModal,
  closeRemoveGuestModal,
  handleRemoveGuest,
  handleInviteAll,
  handleSendGuestInvite,
  confirmInviteWithoutQuestions,
} = useEventGuestsManager({
  eventId,
  eventRecord,
  isEventCancelled,
  rsvpSummary,
  guestList,
  isLoadingGuests,
  autoLoadGuests: false,
  onGuestListMutated: () => reloadGuestDataRef.value?.(),
})

async function sendStraightInvitation(guestId: string, options: { silent?: boolean } = {}) {
  const guest = guestList.value.find((g) => g._id === guestId)
  if (!guest) return

  if (!guest.email || !guest.email.includes('@')) {
    if (!options.silent) {
      toast.add({
        title: 'Missing Email',
        description: `${guest.firstName || 'Guest'} does not have a valid email address.`,
        color: 'error',
      })
    }
    throw new Error('Guest has no valid email address.')
  }

  sendingGuestId.value = guestId
  try {
    if (!establishedInvitation.value && !establishedCustomSite.value) {
      await loadEstablishedDesign()
    }

    // 1. If guest has no RSVP record yet, register with backend once so MongoDB record exists
    if (!guest.rsvp?._id) {
      await sendGuestInvite(guestId).catch(() => null)
    }

    const rsvpId = guest.rsvp?._id || guest._id
    const guestFullName = `${guest.firstName} ${guest.lastName}`.trim() || 'Guest'

    // 2. Capture latest stationery PNG card
    const cardImage = await captureStationeryCard(guestFullName)

    // 3. Resolve destination URL (Strictly NO #rsvp hash)
    const destinationUrl = websiteSlug.value
      ? buildGuestWebsiteUrl({
          origin: DEFAULT_APP_DOMAIN,
          websiteSlug: websiteSlug.value,
          rsvpId,
        })
      : ''

    // 4. Generate HTML email with clickable PNG card
    const safeHeadline = effectiveInvitation.value.eventLabel || 'Wedding Invitation & RSVP'
    const finalHtml = generateImageInvitationEmailHtml({
      invitation: {
        requestLine: effectiveInvitation.value.requestLine,
        eventLabel: safeHeadline,
        eventDate: effectiveInvitation.value.eventDate,
        eventTime: effectiveInvitation.value.eventTime,
        eventVenue: effectiveInvitation.value.eventVenue,
        deadlineText: effectiveInvitation.value.deadlineText,
        deadlineDate: effectiveInvitation.value.deadlineDate,
        bannerImageUrl: effectiveBannerImageUrl.value,
        guestName: guestFullName,
      },
      palette: palette.value,
      typography: typography.value,
      websiteUrl: destinationUrl,
      guestName: guestFullName,
      imageSrc: 'cid:invitation-card',
    })

    // 5. Send via server route using Resend (hello@blinkpunch.com)
    const clientApiKey = typeof window !== 'undefined' ? localStorage.getItem('bpb_resend_api_key')?.trim() : undefined
    const fromSender = typeof window !== 'undefined' ? localStorage.getItem('bpb_resend_sender')?.trim() || 'hello@blinkpunch.com' : 'hello@blinkpunch.com'

    await $fetch<{ success: boolean; id: string; message: string }>('/api/send-invitation-email', {
      method: 'POST',
      body: {
        to: guest.email.trim(),
        from: fromSender,
        subject: `${safeHeadline} — Your Invitation & RSVP`,
        apiKey: clientApiKey,
        html: finalHtml,
        imageBase64: cardImage || undefined,
      },
    })

    // 6. Update local state
    if (!guest.rsvp) {
      guest.rsvp = {
        _id: rsvpId,
        status: 'PENDING',
        invitedAt: new Date().toISOString(),
        respondedAt: null,
      }
    } else {
      guest.rsvp.invitedAt = new Date().toISOString()
    }

    if (!options.silent) {
      toast.add({
        title: 'Invitation Sent!',
        description: `Delivered clickable stationery PNG to ${guest.email}!`,
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }
  } catch (err: any) {
    const errorMsg = err?.data?.statusMessage || err?.message || 'Could not send invitation email.'
    if (!options.silent) {
      toast.add({
        title: 'Could not send invitation',
        description: errorMsg,
        color: 'error',
      })
    }
    throw err
  } finally {
    sendingGuestId.value = null
  }
}

async function handleStraightInviteAll() {
  if (isInvitingAll.value) return
  const eligibleGuests = guestList.value.filter((g) => canSendGuestInvite(g) && g.email && g.email.includes('@'))
  if (eligibleGuests.length === 0) {
    toast.add({
      title: 'No Pending Guests',
      description: 'All guests with valid email addresses have already been invited.',
      color: 'info',
    })
    return
  }

  isInvitingAll.value = true
  let successCount = 0
  let failureCount = 0

  for (const guest of eligibleGuests) {
    try {
      await sendStraightInvitation(guest._id, { silent: true })
      successCount++
    } catch {
      failureCount++
    }
  }

  isInvitingAll.value = false
  if (successCount > 0) {
    toast.add({
      title: 'Invitations Sent!',
      description: `Successfully delivered stationery invitations to ${successCount} guest(s).`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } else if (failureCount > 0) {
    toast.add({
      title: 'Sending Failed',
      description: 'Could not send invitations. Please ensure your RESEND_API_KEY is configured.',
      color: 'error',
    })
  }
}

const {
  isLoadingGroups,
  isGroupActionLoading,
  searchQuery,
  isGroupAssignmentModalOpen,
  isAddToExistingModalOpen,
  isRenameGroupModalOpen,
  groupAssignmentMode,
  createGroupName,
  renameGroupName,
  targetGroupId,
  groupOptions,
  assignableGroupOptions,
  displayRows,
  groupsBySection,
  isGroupsTabEmpty,
  isSearchEmpty,
  showActionBar,
  selectedCount,
  selectedGuestIds,
  selectionContext,
  canGroupGuests,
  showCreateGroupHint,
  canRenameGroup,
  canUngroupAll,
  canAddToExistingGroup,
  assignModalGuestCount,
  allUngroupedVisibleSelected,
  someUngroupedVisibleSelected,
  canUngroupSingle,
  allVisibleSelected,
  someVisibleSelected,
  guestGroups,
  loadGuestGroups,
  clearSelection,
  toggleSelection,
  toggleSelectAllVisible,
  openGroupAssignmentModal,
  openAddToExistingModal,
  openAssignGuestsToGroupModal,
  closeAddToExistingModal,
  toggleSelectAllUngrouped,
  openRenameGroupModal,
  handleGroupAssignment,
  handleAddToExistingGroup,
  handleRenameGroup,
  handleRemoveGuestFromGroup,
  openRenameGroupModalForGroup,
  handleUngroupSingle,
  handleUngroupAll,
} = useEventGuestGroupsManager({
  eventId,
  tableRows,
  mutationsDisabled,
  isUiOnlyMode,
  guestRoles,
})

const {
  isLoadingRoles,
  isRoleTableActionLoading,
  isRoleAssignmentModalOpen,
  isRoleUnassignmentModalOpen,
  isTableAssignmentModalOpen,
  roleAssignmentMode,
  targetRoleId,
  targetUnassignRoleId,
  createRoleName,
  targetTableValue,
  roleOptions,
  unassignRoleOptions,
  tableOptions,
  tableAssignmentModalTitle,
  tableAssignmentGuestCount,
  tableAssignmentSubmitLabel,
  canAssignRole,
  canUnassignRole,
  canAssignTable,
  rolesBySection,
  tablesBySection,
  loadGuestRoles,
  loadEventTables,
  reloadAll,
  openRoleAssignmentModal,
  openRoleUnassignmentModal,
  openTableAssignmentModal,
  openGuestTableTransferModal,
  closeTableAssignmentModal,
  handleRoleAssignment,
  handleRoleUnassignment,
  handleRemoveGuestFromRole,
  handleUnassignGuestFromTable,
  handleTableAssignment,
} = useEventGuestRolesAndTablesManager({
  eventId,
  guestList,
  guestRoles,
  tableRows,
  selectedGuestIds,
  mutationsDisabled,
  isUiOnlyMode,
  searchQuery,
  onGuestListMutated: () => reloadGuestDataRef.value?.(),
  clearSelection,
})

const guestModalUi = {
  header: 'bg-orange-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md',
  overlay: 'bg-orange-900/30',
}

const tabItems = computed(() => [
  { label: `Guest List (${guestListSize.value})`, slot: 'guest-list' },
  { label: `Groups (${guestGroups.value.length})`, slot: 'groups' },
  { label: `Roles (${guestRoles.value.length})`, slot: 'roles' },
  { label: 'Tables', slot: 'tables' },
])

const isRolesTabEmpty = computed(
  () => rolesBySection.value.length === 0 && !isLoadingRoles.value
)

const isTablesTabEmpty = computed(() => tablesBySection.value.length === 0)

const showGuestListActionBar = computed(
  () => showActionBar.value && selectedTab.value === 'guest-list'
)

const showTablesActionBar = computed(
  () => showActionBar.value && selectedTab.value === 'tables'
)

const showGroupsActionBar = computed(
  () => showActionBar.value && selectedTab.value === 'groups' && canAddToExistingGroup.value
)

const canAssignUngroupedToGroup = computed(
  () => !mutationsDisabled.value && guestGroups.value.length > 0
)

const canAssignToExistingInModal = computed(
  () => guestGroups.value.length > 0
)

function rsvpStatusColor(status: string): 'success' | 'error' | 'secondary' {
  if (status === 'Attending') return 'success'
  if (status === 'Not Attending') return 'error'
  return 'secondary'
}

const bulkAddLink = computed(() => ({
  path: '/event/add-guests-bulk',
  query: eventId.value ? { eventId: eventId.value } : {},
}))

const rsvpMakerLink = computed(() => ({
  path: '/event/rsvp',
  query: eventId.value ? { eventId: eventId.value } : {},
}))

const emailCreditsLink = computed(() => {
  const id = eventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')
  return {
    path: '/event/email-credits',
    query: id ? { eventId: id } : {},
  }
})

const columns: TableColumn<GuestTableRow>[] = [
  {
    id: 'select',
    header: () =>
      h(UCheckbox, {
        modelValue: allVisibleSelected.value,
        indeterminate: someVisibleSelected.value,
        disabled: mutationsDisabled.value || displayRows.value.length === 0,
        'aria-label': 'Select all visible guests',
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          toggleSelectAllVisible(value === true)
        },
      }),
    cell: ({ row }) => {
      const person = row.original
      return h(UCheckbox, {
        modelValue: selectedGuestIds.value.has(person.guestId),
        disabled: mutationsDisabled.value,
        'aria-label': `Select ${person.displayName}`,
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          toggleSelection(person.guestId, value === true)
        },
      })
    },
  },
  {
    accessorKey: 'displayName',
    header: 'Name',
    cell: ({ row }) => {
      const person = row.original
      const showEnvelope =
        person.envelopeName.trim()
        && person.envelopeName.trim().toLowerCase()
          !== person.displayName.trim().toLowerCase()
      return h('div', { class: 'space-y-1' }, [
        h('span', { class: 'font-medium' }, person.displayName),
        showEnvelope
          ? h('p', { class: 'text-xs text-muted' }, `Envelope: ${person.envelopeName}`)
          : null,
        h('div', { class: 'flex flex-wrap gap-1' }, [
          person.groupName
            ? h(
                UBadge,
                { variant: 'subtle', color: 'orange', size: 'xs' },
                () => person.groupName
              )
            : null,
          ...(person.roleNames ?? []).map((roleName) =>
            h(
              UBadge,
              { variant: 'subtle', color: 'neutral', size: 'xs' },
              () => roleName
            )
          ),
        ]),
      ])
    },
  },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'tableLabel',
    header: 'Table',
    cell: ({ row }) => row.original.tableLabel ?? '—',
  },
  {
    accessorKey: 'rsvpStatus',
    header: 'RSVP Status',
    cell: ({ row }) => {
      const color = {
        Attending: 'success' as const,
        'Not Attending': 'error' as const,
        Pending: 'secondary' as const,
      }[row.getValue('rsvpStatus') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('rsvpStatus')
      )
    },
  },
  {
    accessorKey: 'invitationSent',
    header: 'Invitation Sent',
    cell: ({ row }) => (row.getValue('invitationSent') ? 'Yes' : 'No'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const person = row.original
      const canEdit = !mutationsDisabled.value
      const canSendInvite = canSendGuestInvite(person)
      const canRemove = !mutationsDisabled.value
      const isSendingThisGuest = sendingGuestId.value === person.guestId

      return h('div', { class: 'flex items-center justify-end gap-1' }, [
        canSendInvite
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'orange',
              icon: 'i-lucide-send',
              loading: isSendingThisGuest,
              disabled: mutationsDisabled.value || Boolean(sendingGuestId.value),
              'aria-label': 'Send invitation',
              title: 'Send clickable stationery invitation PNG straight',
              onClick: () => sendStraightInvitation(person.guestId),
            })
          : h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'neutral',
              icon: 'i-lucide-mail-check',
              loading: isSendingThisGuest,
              disabled: mutationsDisabled.value || Boolean(sendingGuestId.value),
              'aria-label': 'Resend invitation',
              title: 'Resend clickable stationery invitation PNG straight',
              onClick: () => sendStraightInvitation(person.guestId),
            }),
        canRemove
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              variant: 'ghost',
              color: 'error',
              icon: 'i-lucide-trash-2',
              loading: deletingGuestId.value === person.guestId,
              'aria-label': 'Remove guest',
              onClick: () => openRemoveGuestModal(person),
            })
          : null,
      ])
    },
  },
]

async function loadGuestList(targetEventId: string) {
  isLoadingGuests.value = true
  try {
    guestList.value = await fetchGuestsByEvent(targetEventId)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load guests', error })
    guestList.value = []
  } finally {
    isLoadingGuests.value = false
  }
}

async function reloadGuestData(targetEventId?: string) {
  const id = targetEventId ?? eventId.value
  if (!id) return
  await Promise.all([
    loadGuestList(id),
    loadGuestGroups(id),
    reloadAll(id),
  ])
}

reloadGuestDataRef.value = reloadGuestData

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    rsvpSummary.value = null
    guestList.value = []
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  isLoadingEvent.value = true

  try {
    const detail = await loadPageData({
      fetch: async () => fetchEvent(targetEventId),
      mock: () => ({
        event: {
          _id: targetEventId,
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: {
          totalSent: 100,
          going: 60,
          notGoing: 15,
          pending: 25,
        },
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    rsvpSummary.value = detail.rsvpSummary
    setActiveEvent(detail.event)

    await Promise.all([
      reloadGuestData(targetEventId),
      loadEstablishedDesign(),
    ])
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
    finishPageTransition()
  }
}

onMounted(() => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/')
    return
  }
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">

    <ClientOnly>
      <Teleport to="#navbar-actions">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            :to="rsvpMakerLink"
            icon="i-lucide-calendar"
          >
            RSVP
          </UButton>
          <UButton
            :to="bulkAddLink"
            icon="i-lucide-users"
            :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
          >
            Bulk Add
          </UButton>
          <UButton
            icon="i-lucide-mail"
            :disabled="!canInviteAll || isInvitingAll"
            :loading="isInvitingAll"
            color="orange"
            variant="soft"
            @click="handleStraightInviteAll"
          >
            Invite All
          </UButton>
          <UButton
            icon="i-lucide-mail-plus"
            color="orange"
            variant="soft"
            :to="emailCreditsLink"
            :disabled="!eventId && !isUiOnlyMode"
          >
            Buy Email Credits
          </UButton>
          <UButton
            icon="i-lucide-user-plus"
            color="orange"
            :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
            @click="() => { isAddGuestModalOpen = true }"
          >
            Add Guest
          </UButton>
          <UButton
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            :loading="isExporting"
            :disabled="!eventId || isExporting"
            @click="exportEventPdf(eventId, 'guests')"
          >
            Export PDF
          </UButton>
        </div>
      </Teleport>
    </ClientOnly>

    <div
      v-if="isLoadingEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>

    <UPageCard v-else class="white-bread-container space-y-4">

      <UAlert
        v-if="mutationsDisabled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="The guest list cannot be modified for a cancelled event."
      />

      <UAlert
        v-if="!hasEmailCredits && !isUiOnlyMode"
        color="warning"
        variant="subtle"
        title="No email credits remaining"
        description="You have used all invitation emails included in your event plan."
        class="mb-4"
      >
        <template #actions>
          <UButton
            icon="i-lucide-mail-plus"
            color="warning"
            variant="soft"
            :to="emailCreditsLink"
          >
            Buy Email Credits
          </UButton>
        </template>
      </UAlert>

      <UPageGrid>
        <UPageCard
          class="bg-orange-50 dark:bg-orange-900/20 ring ring-inset ring-orange-500/25"
          description="Emails remaining"
          :ui="{ title: 'text-orange-600 dark:text-orange-400', description: 'text-orange-600/70 dark:text-orange-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ remainingEmails?.toLocaleString() ?? '—' }}</div>
          </template>
        </UPageCard>
        <UPageCard
          class="bg-orange-50 dark:bg-orange-900/20 ring ring-inset ring-orange-500/25"
          description="Total Invitations Sent"
          :ui="{ title: 'text-orange-600 dark:text-orange-400', description: 'text-orange-600/70 dark:text-orange-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ invitationsSentCount }}/{{ guestListSize }}</div>
          </template>
        </UPageCard>
        <UPageCard
          class="bg-orange-50 dark:bg-orange-900/20 ring ring-inset ring-orange-500/25"
          description="Total Responses"
          :ui="{ title: 'text-orange-600 dark:text-orange-400', description: 'text-orange-600/70 dark:text-orange-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ rsvpStats.responses }}</div>
          </template>
        </UPageCard>
        <UPageCard
          class="bg-orange-50 dark:bg-orange-900/20 ring ring-inset ring-orange-500/25"
          description="Total Attendees"
          :ui="{ title: 'text-orange-600 dark:text-orange-400', description: 'text-orange-600/70 dark:text-orange-400/70' }"
        >
          <template #title>
            <div class="text-2xl font-bold">{{ rsvpStats.attendees }}</div>
          </template>
        </UPageCard>
      </UPageGrid>

      <div
        v-if="isLoadingGuests || isLoadingGroups || isLoadingRoles"
        class="flex items-center justify-center py-12 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        <span class="ml-2 text-sm">Loading guests...</span>
      </div>

      <div
        v-else-if="isGuestListEmpty"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
      >
        <UIcon name="i-lucide-users" class="size-10 text-muted" />
        <p class="mt-4 text-base font-medium">No guests yet</p>
        <p class="mt-1 max-w-sm text-sm text-muted">
          Add guests one at a time or use Bulk Add to import your list and start sending invitations.
        </p>
        <div
          v-if="!mutationsDisabled"
          class="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          <UButton
            icon="i-lucide-user-plus"
            color="orange"
            @click="() => { isAddGuestModalOpen = true }"
          >
            Add Guest
          </UButton>
          <UButton
            :to="bulkAddLink"
            icon="i-lucide-users"
          >
            Bulk Add
          </UButton>
        </div>
      </div>

      <template v-else>
        <UTabs
          v-model="selectedTab"
          :items="tabItems"
          value-key="slot"
          variant="link"
          class="w-full"
        >
          <template #guest-list>
            <div class="mt-4 space-y-4">
              <UInput
                v-model="searchQuery"
                type="search"
                placeholder="Search by name, address, envelope, email, group, role, or table..."
                icon="i-lucide-search"
                class="w-full sm:w-72"
              />

              <div
                v-if="isSearchEmpty"
                class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
              >
                <UIcon name="i-lucide-search-x" class="size-10 text-muted" />
                <p class="mt-4 text-base font-medium">No guests match your search</p>
                <p class="mt-1 max-w-sm text-sm text-muted">
                  Try a different name, address, envelope name, email, group, role, or table. Matching a grouped guest shows their whole group.
                </p>
              </div>

              <div
                v-else
                class="relative"
                :class="showGuestListActionBar ? 'pb-24' : ''"
              >
                <UTable
                  :data="displayRows"
                  :columns="columns"
                />
              </div>
            </div>
          </template>

          <template #groups>
            <div
              class="mt-4 space-y-4"
              :class="showGroupsActionBar ? 'pb-24' : ''"
            >
              <UInput
                v-model="searchQuery"
                type="search"
                placeholder="Search by name, address, envelope, email, or group..."
                icon="i-lucide-search"
                class="w-full sm:w-72"
              />

              <div
                v-if="isGroupsTabEmpty"
                class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
              >
                <UIcon name="i-lucide-users-round" class="size-10 text-muted" />
                <p class="mt-4 text-base font-medium">No guest groups yet</p>
                <p class="mt-1 max-w-sm text-sm text-muted">
                  Select two or more guests on the Guest List tab and create a group to see them here.
                </p>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="section in groupsBySection"
                  :key="section.groupId ?? 'ungrouped'"
                  class="rounded-lg border border-default bg-muted/10"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default px-4 py-3">
                    <div class="flex min-w-0 items-center gap-3">
                      <UCheckbox
                        v-if="!section.groupId && !mutationsDisabled && section.guests.length > 0"
                        :model-value="allUngroupedVisibleSelected"
                        :indeterminate="someUngroupedVisibleSelected"
                        aria-label="Select all ungrouped guests"
                        @update:model-value="(value: boolean | 'indeterminate') => toggleSelectAllUngrouped(value === true)"
                      />
                      <h3 class="font-medium text-highlighted">
                        {{ section.groupName }}
                        <span class="text-sm font-normal text-muted">({{ section.guests.length }})</span>
                      </h3>
                    </div>
                    <UButton
                      v-if="!mutationsDisabled && section.groupId"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-pencil"
                      :loading="isGroupActionLoading"
                      @click="openRenameGroupModalForGroup(section.groupId!)"
                    >
                      Rename
                    </UButton>
                  </div>
                  <ul class="divide-y divide-default">
                    <li
                      v-for="guest in section.guests"
                      :key="`${section.groupId ?? 'ungrouped'}-${guest.guestId}`"
                      class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div class="flex min-w-0 flex-1 items-center gap-3">
                        <UCheckbox
                          v-if="!section.groupId && !mutationsDisabled"
                          :model-value="selectedGuestIds.has(guest.guestId)"
                          :aria-label="`Select ${guest.displayName}`"
                          @update:model-value="(value: boolean | 'indeterminate') => toggleSelection(guest.guestId, value === true)"
                        />
                        <div class="min-w-0">
                          <p class="font-medium">{{ guest.displayName }}</p>
                          <p class="text-muted">{{ guest.email }}</p>
                          <p
                            v-if="guest.envelopeName.trim() && guest.envelopeName.trim().toLowerCase() !== guest.displayName.trim().toLowerCase()"
                            class="text-xs text-muted mt-0.5"
                          >
                            Envelope: {{ guest.envelopeName }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <UBadge
                          :color="rsvpStatusColor(guest.rsvpStatus)"
                          variant="subtle"
                          class="capitalize"
                        >
                          {{ guest.rsvpStatus }}
                        </UBadge>
                        <UButton
                          v-if="!mutationsDisabled && !section.groupId && canAssignUngroupedToGroup"
                          size="xs"
                          variant="ghost"
                          color="orange"
                          icon="i-lucide-user-plus"
                          :loading="isGroupActionLoading"
                          aria-label="Add to group"
                          @click="openAssignGuestsToGroupModal([guest.guestId])"
                        />
                        <UButton
                          v-if="!mutationsDisabled && section.groupId"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          icon="i-lucide-user-minus"
                          :loading="isGroupActionLoading"
                          aria-label="Remove from group"
                          @click="handleRemoveGuestFromGroup(section.groupId!, guest.guestId)"
                        />
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </template>

          <template #roles>
            <div class="mt-4 space-y-4">
              <UInput
                v-model="searchQuery"
                type="search"
                placeholder="Search by name, address, envelope, email, group, role, or table..."
                icon="i-lucide-search"
                class="w-full sm:w-72"
              />

              <div
                v-if="isRolesTabEmpty"
                class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
              >
                <UIcon name="i-lucide-theater" class="size-10 text-muted" />
                <p class="mt-4 text-base font-medium">No roles assigned yet</p>
                <p class="mt-1 max-w-sm text-sm text-muted">
                  Select guests on the Guest List tab and assign them a role.
                </p>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="section in rolesBySection"
                  :key="section.roleId"
                  class="rounded-lg border border-default bg-muted/10"
                >
                  <div class="border-b border-default px-4 py-3">
                    <h3 class="font-medium text-highlighted">
                      {{ section.roleName }}
                      <span class="text-sm font-normal text-muted">({{ section.guests.length }})</span>
                    </h3>
                  </div>
                  <ul class="divide-y divide-default">
                    <li
                      v-for="guest in section.guests"
                      :key="`${section.roleId}-${guest.guestId}`"
                      class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div>
                        <p class="font-medium">{{ guest.displayName }}</p>
                        <p class="text-muted">{{ guest.email }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <UBadge
                          :color="rsvpStatusColor(guest.rsvpStatus)"
                          variant="subtle"
                          class="capitalize"
                        >
                          {{ guest.rsvpStatus }}
                        </UBadge>
                        <UButton
                          v-if="!mutationsDisabled"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          icon="i-lucide-user-minus"
                          :loading="isRoleTableActionLoading"
                          aria-label="Remove from role"
                          @click="handleRemoveGuestFromRole(section.roleId, guest.guestId)"
                        />
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </template>

          <template #tables>
            <div
              class="mt-4 space-y-4"
              :class="showTablesActionBar ? 'pb-24' : ''"
            >
              <UInput
                v-model="searchQuery"
                type="search"
                placeholder="Search by name, address, envelope, email, group, role, or table..."
                icon="i-lucide-search"
                class="w-full sm:w-72"
              />

              <div
                v-if="isTablesTabEmpty"
                class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
              >
                <UIcon name="i-lucide-layout-grid" class="size-10 text-muted" />
                <p class="mt-4 text-base font-medium">No table assignments yet</p>
                <p class="mt-1 max-w-sm text-sm text-muted">
                  Select guests here or on the Guest List tab to assign tables, or use the actions on each row to move or unassign.
                </p>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="section in tablesBySection"
                  :key="section.label"
                  class="rounded-lg border border-default bg-muted/10"
                >
                  <div class="border-b border-default px-4 py-3">
                    <h3 class="font-medium text-highlighted">
                      {{ section.label }}
                      <span class="text-sm font-normal text-muted">({{ section.guests.length }})</span>
                    </h3>
                  </div>
                  <ul class="divide-y divide-default">
                    <li
                      v-for="guest in section.guests"
                      :key="`${section.label}-${guest.guestId}`"
                      class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div class="flex min-w-0 flex-1 items-center gap-3">
                        <UCheckbox
                          :model-value="selectedGuestIds.has(guest.guestId)"
                          :disabled="mutationsDisabled"
                          :aria-label="`Select ${guest.displayName}`"
                          @update:model-value="(value: boolean | 'indeterminate') => toggleSelection(guest.guestId, value === true)"
                        />
                        <div class="min-w-0">
                          <p class="font-medium">{{ guest.displayName }}</p>
                          <p class="text-muted">{{ guest.email }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <UBadge
                          :color="rsvpStatusColor(guest.rsvpStatus)"
                          variant="subtle"
                          class="capitalize"
                        >
                          {{ guest.rsvpStatus }}
                        </UBadge>
                        <UButton
                          v-if="!mutationsDisabled && section.tableCode != null"
                          size="xs"
                          variant="ghost"
                          color="orange"
                          icon="i-lucide-arrow-right-left"
                          :loading="isRoleTableActionLoading"
                          aria-label="Move to another table"
                          @click="openGuestTableTransferModal(guest.guestId)"
                        />
                        <UButton
                          v-if="!mutationsDisabled && section.tableCode != null"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          icon="i-lucide-user-minus"
                          :loading="isRoleTableActionLoading"
                          aria-label="Unassign from table"
                          @click="handleUnassignGuestFromTable(guest.guestId)"
                        />
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </template>
        </UTabs>

        <div
          v-if="showGuestListActionBar || showTablesActionBar || showGroupsActionBar"
          class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-white px-4 py-3 shadow-lg dark:border-orange-800 dark:bg-neutral-900"
        >
          <div class="space-y-1">
            <span class="text-sm font-medium text-highlighted">
              {{ selectedCount }} selected
            </span>
            <p
              v-if="showGuestListActionBar && showCreateGroupHint"
              class="text-xs text-muted"
            >
              Select at least 2 guests to create a new group
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <template v-if="showGuestListActionBar">
              <UButton
                v-if="canAssignRole"
                color="orange"
                variant="outline"
                icon="i-lucide-theater"
                :loading="isRoleTableActionLoading"
                @click="openRoleAssignmentModal"
              >
                Assign role…
              </UButton>
              <UButton
                v-if="canUnassignRole"
                color="neutral"
                variant="outline"
                icon="i-lucide-user-minus"
                :loading="isRoleTableActionLoading"
                @click="openRoleUnassignmentModal"
              >
                Unassign role…
              </UButton>
              <UButton
                v-if="canGroupGuests"
                color="orange"
                icon="i-lucide-users-round"
                :loading="isGroupActionLoading"
                @click="openGroupAssignmentModal"
              >
                Group guests…
              </UButton>
              <UButton
                v-if="canRenameGroup"
                color="orange"
                variant="outline"
                icon="i-lucide-pencil"
                :loading="isGroupActionLoading"
                @click="openRenameGroupModal"
              >
                Rename group
              </UButton>
              <UButton
                v-if="canAddToExistingGroup"
                color="orange"
                variant="outline"
                icon="i-lucide-user-plus"
                :loading="isGroupActionLoading"
                @click="openAddToExistingModal"
              >
                Add to existing group
              </UButton>
              <UButton
                v-if="canUngroupSingle"
                color="neutral"
                variant="outline"
                icon="i-lucide-user-minus"
                :loading="isGroupActionLoading"
                @click="handleUngroupSingle"
              >
                Ungroup
              </UButton>
              <UButton
                v-if="canUngroupAll && (selectionContext === 'same_group' || selectionContext === 'mixed')"
                color="neutral"
                variant="outline"
                icon="i-lucide-user-minus"
                :loading="isGroupActionLoading"
                @click="handleUngroupAll"
              >
                Ungroup all
              </UButton>
            </template>
            <template v-if="showGroupsActionBar">
              <UButton
                color="orange"
                icon="i-lucide-user-plus"
                :loading="isGroupActionLoading"
                @click="openAddToExistingModal"
              >
                Add to existing group
              </UButton>
            </template>
            <UButton
              v-if="showTablesActionBar && canAssignTable"
              color="orange"
              variant="outline"
              icon="i-lucide-layout-grid"
              :loading="isRoleTableActionLoading"
              @click="openTableAssignmentModal"
            >
              Assign table…
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isGroupActionLoading || isRoleTableActionLoading"
              @click="clearSelection"
            >
              Clear
            </UButton>
          </div>
        </div>
      </template>

      <UModal
        v-model:open="isAddGuestModalOpen"
        title="Add Guest"
        :ui="guestModalUi"
        :close="{ variant: 'link', class: 'rounded-full text-white' }"
        :dismissible="!isSubmittingGuest"
      >
        <template #body>
          <UForm
            :schema="addGuestSchema"
            :state="addGuestState"
            class="space-y-4"
            @submit="handleAddGuest"
          >
            <UFormField label="First name" name="firstName" required>
              <UInput
                v-model="addGuestState.firstName"
                class="w-full"
                placeholder="Juan"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Last name" name="lastName" required>
              <UInput
                v-model="addGuestState.lastName"
                class="w-full"
                placeholder="Dela Cruz"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Email" name="email" required>
              <UInput
                v-model="addGuestState.email"
                type="email"
                class="w-full"
                placeholder="jdelacruz@example.com"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Mailing address" name="mailingAddress">
              <UTextarea
                v-model="addGuestState.mailingAddress"
                class="w-full"
                placeholder="123 Rizal St, Manila"
                :disabled="mutationsDisabled"
                :rows="2"
              />
            </UFormField>
            <UFormField label="Contact number" name="contactNumber">
              <UInput
                v-model="addGuestState.contactNumber"
                class="w-full"
                placeholder="+63 912 345 6789"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Envelope name" name="envelopeName">
              <UInput
                v-model="addGuestState.envelopeName"
                class="w-full"
                placeholder="Mr. & Mrs. Juan Dela Cruz"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UButton
              type="submit"
              block
              color="orange"
              class="mt-4"
              :loading="isSubmittingGuest"
              :disabled="mutationsDisabled"
            >
              Add Guest
            </UButton>
          </UForm>
        </template>
      </UModal>

      <UModal
        v-model:open="isEditGuestModalOpen"
        title="Edit Guest"
        :ui="guestModalUi"
        :close="{ variant: 'link', class: 'rounded-full text-white' }"
        :dismissible="!isUpdatingGuest"
      >
        <template #body>
          <UForm
            :schema="editGuestSchema"
            :state="editGuestState"
            class="space-y-4"
            @submit="handleEditGuest"
          >
            <UFormField label="First name" name="firstName" required>
              <UInput
                v-model="editGuestState.firstName"
                class="w-full"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Last name" name="lastName" required>
              <UInput
                v-model="editGuestState.lastName"
                class="w-full"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Email" name="email" required>
              <UInput
                v-model="editGuestState.email"
                type="email"
                class="w-full"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Mailing address" name="mailingAddress">
              <UTextarea
                v-model="editGuestState.mailingAddress"
                class="w-full"
                :disabled="mutationsDisabled"
                :rows="2"
              />
            </UFormField>
            <UFormField label="Contact number" name="contactNumber">
              <UInput
                v-model="editGuestState.contactNumber"
                class="w-full"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <UFormField label="Envelope name" name="envelopeName">
              <UInput
                v-model="editGuestState.envelopeName"
                class="w-full"
                :disabled="mutationsDisabled"
              />
            </UFormField>
            <div class="flex gap-2 pt-2">
              <UButton
                variant="outline"
                color="neutral"
                class="flex-1"
                :disabled="isUpdatingGuest"
                @click="closeEditGuestModal"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                color="orange"
                class="flex-1"
                :loading="isUpdatingGuest"
                :disabled="mutationsDisabled"
              >
                Save changes
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

      <UModal
        v-model:open="isRoleAssignmentModalOpen"
        title="Assign role"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isRoleTableActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Assign {{ selectedCount }} guest{{ selectedCount === 1 ? '' : 's' }} to a role.
          </p>
          <div
            v-if="roleOptions.length > 0"
            class="mb-4 flex gap-2"
          >
            <UButton
              label="Existing role"
              :color="roleAssignmentMode === 'existing' ? 'orange' : 'neutral'"
              :variant="roleAssignmentMode === 'existing' ? 'solid' : 'outline'"
              class="flex-1"
              :disabled="isRoleTableActionLoading"
              @click="() => { roleAssignmentMode = 'existing' }"
            />
            <UButton
              label="Create new"
              :color="roleAssignmentMode === 'new' ? 'orange' : 'neutral'"
              :variant="roleAssignmentMode === 'new' ? 'solid' : 'outline'"
              class="flex-1"
              :disabled="isRoleTableActionLoading"
              @click="() => { roleAssignmentMode = 'new' }"
            />
          </div>
          <UFormField
            v-if="roleAssignmentMode === 'existing'"
            label="Role"
            name="targetRole"
            required
          >
            <USelect
              v-model="targetRoleId"
              :items="roleOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isRoleTableActionLoading"
            />
          </UFormField>
          <UFormField
            v-else
            label="Role name"
            name="createRoleName"
            required
          >
            <UInput
              v-model="createRoleName"
              class="w-full"
              placeholder="Ring Bearer"
              :disabled="isRoleTableActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isRoleTableActionLoading"
              @click="() => { isRoleAssignmentModalOpen = false }"
            />
            <UButton
              label="Assign role"
              color="orange"
              :loading="isRoleTableActionLoading"
              :disabled="roleAssignmentMode === 'existing' && !targetRoleId"
              @click="handleRoleAssignment"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isRoleUnassignmentModalOpen"
        title="Unassign role"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isRoleTableActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Remove {{ selectedCount }} guest{{ selectedCount === 1 ? '' : 's' }} from a role.
            Guests who do not have the selected role are skipped.
          </p>
          <UFormField label="Role" name="unassignRole" required>
            <USelect
              v-model="targetUnassignRoleId"
              :items="unassignRoleOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isRoleTableActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isRoleTableActionLoading"
              @click="() => { isRoleUnassignmentModalOpen = false }"
            />
            <UButton
              label="Remove role"
              color="orange"
              :loading="isRoleTableActionLoading"
              :disabled="!targetUnassignRoleId"
              @click="handleRoleUnassignment"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isTableAssignmentModalOpen"
        :title="tableAssignmentModalTitle"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isRoleTableActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Place {{ tableAssignmentGuestCount }} guest{{ tableAssignmentGuestCount === 1 ? '' : 's' }} at a table.
            Choose <span class="font-medium">Unassigned</span> to remove table seating.
          </p>
          <UFormField label="Table" name="targetTable" required>
            <USelect
              v-model="targetTableValue"
              :items="tableOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isRoleTableActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isRoleTableActionLoading"
              @click="closeTableAssignmentModal"
            />
            <UButton
              :label="tableAssignmentSubmitLabel"
              color="orange"
              :loading="isRoleTableActionLoading"
              :disabled="targetTableValue === undefined"
              @click="handleTableAssignment"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isGroupAssignmentModalOpen"
        title="Group guests"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isGroupActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Group {{ selectedCount }} guests together. A group requires at least 2 members.
          </p>
          <div
            v-if="canAssignToExistingInModal"
            class="mb-4 flex gap-2"
          >
            <UButton
              label="Create new group"
              :color="groupAssignmentMode === 'new' ? 'orange' : 'neutral'"
              :variant="groupAssignmentMode === 'new' ? 'solid' : 'outline'"
              class="flex-1"
              :disabled="isGroupActionLoading"
              @click="() => { groupAssignmentMode = 'new' }"
            />
            <UButton
              label="Add to existing"
              :color="groupAssignmentMode === 'existing' ? 'orange' : 'neutral'"
              :variant="groupAssignmentMode === 'existing' ? 'solid' : 'outline'"
              class="flex-1"
              :disabled="isGroupActionLoading"
              @click="() => { groupAssignmentMode = 'existing' }"
            />
          </div>
          <UFormField
            v-if="groupAssignmentMode === 'new'"
            label="Group name (optional)"
            name="groupName"
          >
            <UInput
              v-model="createGroupName"
              class="w-full"
              placeholder="Smith Family"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <UFormField
            v-else
            label="Group"
            name="targetGroup"
            required
          >
            <USelect
              v-model="targetGroupId"
              :items="assignableGroupOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isGroupActionLoading"
              @click="() => { isGroupAssignmentModalOpen = false }"
            />
            <UButton
              :label="groupAssignmentMode === 'new' ? 'Create group' : 'Add to group'"
              color="orange"
              :loading="isGroupActionLoading"
              :disabled="groupAssignmentMode === 'existing' && !targetGroupId"
              @click="handleGroupAssignment"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isAddToExistingModalOpen"
        title="Add to existing group"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isGroupActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Add
            {{ assignModalGuestCount }}
            guest{{ assignModalGuestCount === 1 ? '' : 's' }}
            to an existing group.
          </p>
          <UFormField label="Group" name="targetGroup" required>
            <USelect
              v-model="targetGroupId"
              :items="groupOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isGroupActionLoading"
              @click="closeAddToExistingModal"
            />
            <UButton
              label="Add to group"
              color="orange"
              :loading="isGroupActionLoading"
              :disabled="!targetGroupId"
              @click="handleAddToExistingGroup"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isRenameGroupModalOpen"
        title="Rename group"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!isGroupActionLoading"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Rename the group shared by all selected guests.
          </p>
          <UFormField label="Group name" name="renameGroupName">
            <UInput
              v-model="renameGroupName"
              class="w-full"
              placeholder="Smith Family"
              :disabled="isGroupActionLoading"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isGroupActionLoading"
              @click="() => { isRenameGroupModalOpen = false }"
            />
            <UButton
              label="Save"
              color="orange"
              :loading="isGroupActionLoading"
              @click="handleRenameGroup"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isRemoveGuestModalOpen"
        title="Remove guest"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
        :dismissible="!deletingGuestId"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            Remove
            <span class="font-medium text-highlighted">{{ guestToRemove?.displayName }}</span>
            from the guest list?
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Back"
              color="neutral"
              variant="outline"
              :disabled="Boolean(deletingGuestId)"
              @click="closeRemoveGuestModal"
            />
            <UButton
              label="Remove guest"
              color="error"
              :loading="Boolean(deletingGuestId)"
              @click="handleRemoveGuest"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isNoQuestionsWarningOpen"
        title="No RSVP questions"
        :ui="{ content: 'border-none ring-transparent max-w-md' }"
      >
        <template #body>
          <p class="mb-4 text-sm text-muted">
            This event has no RSVP questions configured. Invitations may not collect
            meaningful responses until you set up RSVP questions in the RSVP dashboard.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="() => { isNoQuestionsWarningOpen = false }"
            />
            <UButton
              label="Send anyway"
              color="orange"
              @click="confirmInviteWithoutQuestions"
            />
          </div>
        </template>
      </UModal>
      <!-- Headless Stationery Card Capture Node (Off-screen for HTML-to-Image Generation) -->
      <div
        style="position: fixed; left: -9999px; top: -9999px; width: 560px; pointer-events: none; z-index: -50;"
        aria-hidden="true"
      >
        <div
          ref="headlessCardRef"
          class="w-140 text-center relative rounded-2xl shadow-xl overflow-hidden"
          :class="effectiveBannerImageUrl ? '' : 'p-8'"
          :style="{
            backgroundColor: palette.colors.primary,
            borderColor: palette.colors.secondary,
            borderWidth: '2px',
            borderStyle: 'solid',
          }"
        >
          <!-- Top Banner Image Component (Flush Top & Sides, 1:5 Horizontal Banner) -->
          <div
            v-if="effectiveBannerImageUrl"
            class="w-full overflow-hidden border-b"
            :style="{ borderColor: `${palette.colors.secondary}40` }"
          >
            <img
              :src="effectiveBannerImageUrl"
              alt="Invitation Header Banner"
              class="w-full aspect-5/1 object-cover object-center block"
              crossorigin="anonymous"
            />
          </div>

          <!-- Card Content Wrapper -->
          <div
            class="relative"
            :class="effectiveBannerImageUrl ? 'p-6 sm:p-8' : ''"
          >
            <!-- Inner Stationery Double Border Frame -->
            <div
              class="absolute inset-3 rounded-xl pointer-events-none"
              :style="{
                borderColor: `${palette.colors.secondary}45`,
                borderWidth: '1px',
                borderStyle: 'solid',
              }"
            />

            <!-- Invitation Card Content -->
            <div class="relative z-10 flex flex-col gap-6 text-center py-4 px-4 sm:px-6">
              <!-- Personalized Guest Greeting -->
              <div
                class="text-xs font-semibold uppercase tracking-[0.18em]"
                :style="{
                  color: palette.colors.secondary_text_color,
                  fontFamily: typography.subheaderFont,
                }"
              >
                Dear {{ headlessGuestName }},
              </div>

              <!-- 1. Header Area (Fixed Fields) -->
              <div class="space-y-4">
                <p
                  class="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em]"
                  :style="{
                    color: palette.colors.secondary_text_color,
                    fontFamily: typography.subheaderFont,
                  }"
                >
                  {{ effectiveInvitation.requestLine || 'Together with their families' }}
                </p>

                <h1
                  class="text-4xl sm:text-5xl font-bold leading-tight"
                  :style="{
                    color: palette.colors.text_color,
                    fontFamily: typography.headerFont,
                  }"
                >
                  {{ effectiveInvitation.eventLabel || 'Alex & Jordan are getting married!' }}
                </h1>

                <!-- Date, Time, and Venue -->
                <div class="mt-6 flex flex-col items-center gap-1">
                  <div
                    class="text-base sm:text-lg font-semibold uppercase tracking-wider"
                    :style="{
                      color: palette.colors.text_color,
                      fontFamily: typography.subheaderFont,
                    }"
                  >
                    {{ formatDateWithWeekday(effectiveInvitation.eventDate) || 'Saturday, October 24, 2026' }}
                  </div>

                  <div
                    v-if="effectiveInvitation.eventTime"
                    class="text-sm sm:text-base font-normal"
                    :style="{
                      color: palette.colors.secondary_text_color,
                      fontFamily: typography.bodyFont,
                    }"
                  >
                    {{ formatTime(effectiveInvitation.eventTime) || '4:00 PM' }}
                  </div>

                  <div
                    class="flex items-center justify-center text-sm sm:text-base font-medium pt-2"
                    :style="{
                      color: palette.colors.text_color,
                      fontFamily: typography.subheaderFont,
                    }"
                  >
                    <UIcon name="i-lucide-map-pin" class="w-4 h-4 mr-1.5 opacity-70" />
                    {{ effectiveInvitation.eventVenue || 'The Grand Promenade, Cityville' }}
                  </div>
                </div>
              </div>

              <!-- Decorative Divider -->
              <div class="flex items-center justify-center my-1">
                <div
                  class="w-16 h-[1.5px]"
                  :style="{ backgroundColor: `${palette.colors.secondary}70` }"
                />
                <span
                  class="mx-3 text-xs"
                  :style="{ color: palette.colors.secondary }"
                >
                  ✦
                </span>
                <div
                  class="w-16 h-[1.5px]"
                  :style="{ backgroundColor: `${palette.colors.secondary}70` }"
                />
              </div>

              <!-- 2. Prominent "RSVP Here" CTA Button -->
              <div class="my-2 flex flex-col items-center justify-center gap-2">
                <div
                  class="inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-full font-semibold text-sm sm:text-base shadow-md"
                  :style="{
                    backgroundColor: palette.colors.secondary,
                    color: palette.colors.secondary_text_color,
                    fontFamily: typography.subheaderFont,
                  }"
                >
                  <span>RSVP Here</span>
                  <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
                </div>
              </div>

              <!-- 3. Footer Area (RSVP Deadline) -->
              <div
                v-if="effectiveInvitation.deadlineText || effectiveInvitation.deadlineDate"
                class="mt-2 pt-5 border-t"
                :style="{ borderColor: `${palette.colors.secondary}40` }"
              >
                <div
                  v-if="effectiveInvitation.deadlineText"
                  class="prose max-w-md mx-auto text-center text-xs sm:text-sm leading-relaxed"
                  :style="{
                    color: palette.colors.secondary_text_color,
                    fontFamily: typography.bodyFont,
                  }"
                  v-html="effectiveInvitation.deadlineText"
                />

                <div
                  v-if="effectiveInvitation.deadlineDate"
                  class="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full font-medium text-xs sm:text-sm border shadow-xs"
                  :style="{
                    backgroundColor: `${palette.colors.secondary}20`,
                    color: palette.colors.secondary_text_color,
                    borderColor: `${palette.colors.secondary}60`,
                    fontFamily: typography.subheaderFont,
                  }"
                >
                  <UIcon name="i-lucide-calendar" class="w-4 h-4 shrink-0" />
                  <span>RSVP Deadline: {{ formatDateWithWeekday(effectiveInvitation.deadlineDate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UPageCard>
  </UContainer>
</template>
