<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import { isWeddingEventType } from '~/types/event'
import type {
  BulkPartyRequirementUpdate,
  ChurchRequirementParty,
  ChurchRequirementRecord,
  PartyTracking,
  RequirementItem,
  RequirementStatus,
} from '~/types/churchRequirement'
import {
  REQUIREMENT_STATUS_OPTIONS,
  formatRequirementStatusLabel,
  fromDateInputValue,
  groupRequirementsByCategoryAndTimeline,
  toDateInputValue,
} from '~/types/churchRequirement'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Church Requirements',
  bgClass: 'bg-yellow-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()
const {
  isLoading: isLoadingRequirements,
  isSubmitting,
  fetchChurchRequirements,
  updatePartyRequirement,
  bulkUpdatePartyRequirements,
} = useEventChurchRequirements()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const churchRequirement = ref<ChurchRequirementRecord | null>(null)
const isLoadingEvent = ref(false)
const savingKey = ref<string | null>(null)
const isBulkSaveModalOpen = ref(false)

type PartyDraft = {
  status: RequirementStatus
  dateRequested: string
  dateAcquired: string
}

const partyDrafts = ref<Record<string, { groom: PartyDraft; bride: PartyDraft }>>({})
const savedPartyDrafts = ref<Record<string, { groom: PartyDraft; bride: PartyDraft }>>({})

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')
const isWeddingEvent = computed(() =>
  isWeddingEventType(eventRecord.value?.eventType ?? (isUiOnlyMode.value ? 'WEDDING' : ''))
)
const mutationsDisabled = computed(
  () =>
    isEventCancelled.value ||
    !isWeddingEvent.value ||
    (!eventId.value && !isUiOnlyMode.value)
)

const isPageLoading = computed(() => isLoadingEvent.value || isLoadingRequirements.value)

const requirementByTaskKey = computed(() => {
  const map = new Map<string, RequirementItem>()
  for (const item of churchRequirement.value?.requirements ?? []) {
    map.set(item.taskKey, item)
  }
  return map
})

const groupedRequirements = computed(() =>
  groupRequirementsByCategoryAndTimeline(churchRequirement.value?.requirements ?? [])
)

const statusSelectItems = computed(() =>
  REQUIREMENT_STATUS_OPTIONS.map((status) => ({
    label: formatRequirementStatusLabel(status),
    value: status,
  }))
)

const churchRequirementModalUi = {
  header: 'bg-yellow-500 border-none',
  title: 'text-white font-serif text-xl',
  content: 'border-none ring-transparent w-full max-w-md',
  overlay: 'bg-yellow-900/30',
}

function draftKey(taskKey: string, party: ChurchRequirementParty) {
  return `${taskKey}:${party}`
}

function buildPartyDraft(tracking: PartyTracking): PartyDraft {
  return {
    status: tracking.status,
    dateRequested: toDateInputValue(tracking.dateRequested),
    dateAcquired: toDateInputValue(tracking.dateAcquired),
  }
}

function clonePartyDrafts(
  source: Record<string, { groom: PartyDraft; bride: PartyDraft }>
): Record<string, { groom: PartyDraft; bride: PartyDraft }> {
  const next: Record<string, { groom: PartyDraft; bride: PartyDraft }> = {}
  for (const [taskKey, parties] of Object.entries(source)) {
    next[taskKey] = {
      groom: { ...parties.groom },
      bride: { ...parties.bride },
    }
  }
  return next
}

function syncDraftsFromRecord(record: ChurchRequirementRecord) {
  const next: Record<string, { groom: PartyDraft; bride: PartyDraft }> = {}
  for (const item of record.requirements) {
    next[item.taskKey] = {
      groom: buildPartyDraft(item.groom),
      bride: buildPartyDraft(item.bride),
    }
  }
  partyDrafts.value = next
  savedPartyDrafts.value = clonePartyDrafts(next)
}

function getPartyDraft(taskKey: string, party: ChurchRequirementParty): PartyDraft {
  return partyDrafts.value[taskKey]?.[party] ?? {
    status: 'required',
    dateRequested: '',
    dateAcquired: '',
  }
}

function isPartyDraftDirty(taskKey: string, party: ChurchRequirementParty): boolean {
  const current = partyDrafts.value[taskKey]?.[party]
  const saved = savedPartyDrafts.value[taskKey]?.[party]
  if (!current || !saved) {
    return false
  }
  return (
    current.status !== saved.status ||
    current.dateRequested !== saved.dateRequested ||
    current.dateAcquired !== saved.dateAcquired
  )
}

type ChangedFieldKey = 'status' | 'dateRequested' | 'dateAcquired'

interface ChangedFieldEntry {
  id: string
  taskKey: string
  party: ChurchRequirementParty
  displayName: string
  field: ChangedFieldKey
  fieldLabel: string
  valueLabel: string
}

const FIELD_LABELS: Record<ChangedFieldKey, string> = {
  status: 'Status',
  dateRequested: 'Date requested',
  dateAcquired: 'Date acquired',
}

function formatDraftFieldValue(field: ChangedFieldKey, draft: PartyDraft): string {
  if (field === 'status') {
    return formatRequirementStatusLabel(draft.status)
  }
  if (field === 'dateRequested') {
    return draft.dateRequested || 'Cleared'
  }
  if (field === 'dateAcquired') {
    return draft.dateAcquired || 'Cleared'
  }
  return ''
}

function getChangedFieldsForParty(
  taskKey: string,
  party: ChurchRequirementParty,
  displayName: string
): ChangedFieldEntry[] {
  const current = partyDrafts.value[taskKey]?.[party]
  const saved = savedPartyDrafts.value[taskKey]?.[party]
  if (!current || !saved) {
    return []
  }

  const fields: ChangedFieldKey[] = ['status', 'dateRequested', 'dateAcquired']
  return fields
    .filter((field) => current[field] !== saved[field])
    .map((field) => ({
      id: `${taskKey}:${party}:${field}`,
      taskKey,
      party,
      displayName,
      field,
      fieldLabel: FIELD_LABELS[field],
      valueLabel: formatDraftFieldValue(field, current),
    }))
}

interface DirtyPartyEntry {
  taskKey: string
  party: ChurchRequirementParty
  displayName: string
  draft: PartyDraft
}

const changedFields = computed<ChangedFieldEntry[]>(() => {
  const entries: ChangedFieldEntry[] = []
  for (const [taskKey, parties] of Object.entries(partyDrafts.value)) {
    const displayName = requirementByTaskKey.value.get(taskKey)?.displayName ?? taskKey
    for (const party of ['groom', 'bride'] as ChurchRequirementParty[]) {
      entries.push(...getChangedFieldsForParty(taskKey, party, displayName))
    }
  }
  return entries
})

const changedFieldCount = computed(() => changedFields.value.length)

const dirtyParties = computed<DirtyPartyEntry[]>(() => {
  const entries: DirtyPartyEntry[] = []
  const seen = new Set<string>()

  for (const [taskKey, parties] of Object.entries(partyDrafts.value)) {
    const displayName = requirementByTaskKey.value.get(taskKey)?.displayName ?? taskKey
    for (const party of ['groom', 'bride'] as ChurchRequirementParty[]) {
      if (!isPartyDraftDirty(taskKey, party)) {
        continue
      }
      const key = draftKey(taskKey, party)
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      entries.push({
        taskKey,
        party,
        displayName,
        draft: { ...parties[party] },
      })
    }
  }
  return entries
})

const hasUnsavedChanges = computed(() => changedFieldCount.value > 0)

function draftToUpdate(entry: DirtyPartyEntry): BulkPartyRequirementUpdate {
  return {
    taskKey: entry.taskKey,
    party: entry.party,
    status: entry.draft.status,
    dateRequested: fromDateInputValue(entry.draft.dateRequested),
    dateAcquired: fromDateInputValue(entry.draft.dateAcquired),
  }
}

watch(changedFieldCount, (count) => {
  if (count === 0) {
    isBulkSaveModalOpen.value = false
  }
})

function formatChangedFieldSummary(entry: ChangedFieldEntry) {
  const partyLabel = entry.party === 'groom' ? 'Groom' : 'Bride'
  return `${entry.displayName} — ${partyLabel}`
}

async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
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
          coverImageURL: null,
        } satisfies EventRecord,
        guestList: [],
        rsvpSummary: null,
        tasks: null,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

async function loadChurchRequirementsData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    churchRequirement.value = null
    partyDrafts.value = {}
    savedPartyDrafts.value = {}
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'

  try {
    const response = await fetchChurchRequirements(targetEventId)
    if (response) {
      churchRequirement.value = response.churchRequirement
      syncDraftsFromRecord(response.churchRequirement)
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not load church requirements', error })
  }
}

function applySavedRecord(record: ChurchRequirementRecord) {
  churchRequirement.value = record
  syncDraftsFromRecord(record)
}

async function savePartyRequirement(taskKey: string, party: ChurchRequirementParty) {
  if (mutationsDisabled.value || !isPartyDraftDirty(taskKey, party)) {
    return
  }

  const draft = getPartyDraft(taskKey, party)
  const key = draftKey(taskKey, party)
  savingKey.value = key

  try {
    const response = await updatePartyRequirement(eventId.value || 'mock-event-id', taskKey, party, {
      status: draft.status,
      dateRequested: fromDateInputValue(draft.dateRequested),
      dateAcquired: fromDateInputValue(draft.dateAcquired),
    })
    if (response) {
      applySavedRecord(response.churchRequirement)
    }
    toast.add({
      title: 'Requirement updated',
      description: `${party === 'groom' ? 'Groom' : 'Bride'} tracking saved.`,
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not update requirement', error })
  } finally {
    savingKey.value = null
  }
}

async function saveAllDirtyParties() {
  if (mutationsDisabled.value || dirtyParties.value.length === 0) {
    return
  }

  const fieldCount = changedFieldCount.value
  const updates = dirtyParties.value.map(draftToUpdate)

  try {
    const response = await bulkUpdatePartyRequirements(eventId.value || 'mock-event-id', {
      updates,
    })
    if (response) {
      applySavedRecord(response.churchRequirement)
    }
    isBulkSaveModalOpen.value = false
    toast.add({
      title: 'Requirements saved',
      description: `${fieldCount} changed field${fieldCount === 1 ? '' : 's'} saved.`,
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not save requirements', error })
  }
}

function isSavingParty(taskKey: string, party: ChurchRequirementParty) {
  return savingKey.value === draftKey(taskKey, party)
}

onMounted(async () => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/UserDashboard')
    return
  }

  await loadEventData()

  if (!isWeddingEvent.value) {
    toast.add({
      title: 'Not a wedding event',
      description: 'Church requirements are only available for wedding events.',
      color: 'error',
    })
    navigateTo({
      path: '/UserEventDashboard',
      query: eventId.value ? { eventId: eventId.value } : undefined,
    })
    return
  }

  await loadChurchRequirementsData()
})

watch(eventId, async () => {
  await loadEventData()
  if (isWeddingEvent.value) {
    await loadChurchRequirementsData()
  }
})
</script>

<template>
  <UContainer
    class="space-y-6 py-8"
    :class="hasUnsavedChanges ? 'pb-28' : 'pb-12'"
  >
    <div
      v-if="isPageLoading"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading church requirements...</span>
    </div>

    <div v-else class="space-y-6">
      <UAlert
        v-if="isEventCancelled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="This event is cancelled. Church requirement updates are disabled."
      />

      <div class="space-y-8">
        <section
          v-for="categorySection in groupedRequirements"
          :key="categorySection.category"
          class="space-y-4"
        >
          <h2 class="text-2xl font-semibold font-serif text-muted">
            {{ categorySection.category }}
          </h2>

          <div
            v-for="timelineSection in categorySection.timelines"
            :key="`${categorySection.category}-${timelineSection.timeline}`"
            class="space-y-4"
          >
            <div class="flex items-center gap-2">
              <UBadge color="yellow" variant="subtle">
                {{ timelineSection.timeline }}
              </UBadge>
            </div>

            <UPageCard
              v-for="item in timelineSection.items"
              :key="item.taskKey"
              class="white-bread-container space-y-4"
            >
              <div class="space-y-2">
                <h3 class="text-lg font-semibold">
                  {{ item.displayName }}
                </h3>
                <p class="text-sm text-muted whitespace-pre-wrap">
                  {{ item.description }}
                </p>
                <a
                  v-if="item.sourceUrl"
                  :href="item.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <UIcon name="i-lucide-external-link" class="size-4" />
                  Source link
                </a>
              </div>

              <div v-if="partyDrafts[item.taskKey]" class="grid gap-4 md:grid-cols-2">
                <div
                  v-for="party in (['groom', 'bride'] as ChurchRequirementParty[])"
                  :key="`${item.taskKey}-${party}`"
                  class="rounded-lg border border-gray-200 p-4 space-y-3"
                  :class="{ 'border-yellow-300 bg-yellow-50/40': isPartyDraftDirty(item.taskKey, party) }"
                >
                  <div class="font-medium capitalize">
                    {{ party }}
                  </div>

                  <UFormField :label="`Status`" :name="`${item.taskKey}-${party}-status`">
                    <USelect
                      v-model="partyDrafts[item.taskKey]![party].status"
                      :items="statusSelectItems"
                      class="w-full"
                      :disabled="mutationsDisabled || isSubmitting"
                    />
                  </UFormField>

                  <UFormField
                    :label="`Date requested`"
                    :name="`${item.taskKey}-${party}-date-requested`"
                  >
                    <UInput
                      v-model="partyDrafts[item.taskKey]![party].dateRequested"
                      type="date"
                      class="w-full"
                      :disabled="mutationsDisabled || isSubmitting"
                    />
                  </UFormField>

                  <UFormField
                    :label="`Date acquired`"
                    :name="`${item.taskKey}-${party}-date-acquired`"
                  >
                    <UInput
                      v-model="partyDrafts[item.taskKey]![party].dateAcquired"
                      type="date"
                      class="w-full"
                      :disabled="mutationsDisabled || isSubmitting"
                    />
                  </UFormField>

                  <UButton
                    icon="i-lucide-save"
                    color="slate"
                    :loading="isSavingParty(item.taskKey, party)"
                    :disabled="mutationsDisabled || isSubmitting || !isPartyDraftDirty(item.taskKey, party)"
                    @click="savePartyRequirement(item.taskKey, party)"
                  >
                    Save {{ party }}
                  </UButton>
                </div>
              </div>
            </UPageCard>
          </div>
        </section>
      </div>

      <div
        v-if="hasUnsavedChanges"
        class="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none"
      >
        <div
          class="pointer-events-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-white px-4 py-3 shadow-lg dark:border-yellow-800 dark:bg-neutral-900"
        >
          <span class="text-sm font-medium text-highlighted">
            You have {{ changedFieldCount }} changed field{{ changedFieldCount === 1 ? '' : 's' }}.
          </span>
          <UButton
            icon="i-lucide-save"
            color="yellow"
            :disabled="mutationsDisabled || isSubmitting"
            @click="isBulkSaveModalOpen = true"
          >
            Review &amp; Save All
          </UButton>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="isBulkSaveModalOpen"
      title="Save changes"
      :ui="churchRequirementModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          You have {{ changedFieldCount }} changed field{{ changedFieldCount === 1 ? '' : 's' }}.
        </p>
        <ul class="mb-4 max-h-64 space-y-2 overflow-y-auto text-sm">
          <li
            v-for="entry in changedFields"
            :key="entry.id"
            class="rounded-md border border-gray-200 px-3 py-2"
          >
            <div class="font-medium">
              {{ formatChangedFieldSummary(entry) }}
            </div>
            <div class="mt-1 text-muted">
              {{ entry.fieldLabel }}: {{ entry.valueLabel }}
            </div>
          </li>
        </ul>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="isBulkSaveModalOpen = false"
          />
          <UButton
            label="Save All"
            color="yellow"
            :loading="isSubmitting"
            :disabled="mutationsDisabled || changedFieldCount === 0"
            @click="saveAllDirtyParties"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
