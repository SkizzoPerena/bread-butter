<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import { isWeddingEventType } from '~/types/event'
import type {
  ChurchRequirementParty,
  ChurchRequirementRecord,
  PartyTracking,
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
  fetchRequirementsByEvent,
  createRequirement,
  updateRequirementDetails,
  updatePartyRequirement,
  deletePartyFile,
  deleteRequirement,
} = useEventChurchRequirements()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const requirements = ref<ChurchRequirementRecord[]>([])
const isLoadingEvent = ref(false)
const savingKey = ref<string | null>(null)

const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const editingRequirement = ref<ChurchRequirementRecord | null>(null)
const deletingRequirement = ref<ChurchRequirementRecord | null>(null)

const createForm = ref({
  displayName: '',
  category: '',
  timeline: '',
  sourceUrl: '',
  description: '',
})

const editForm = ref({
  displayName: '',
  category: '',
  timeline: '',
  sourceUrl: '',
  description: '',
})

type PartyDraft = {
  status: RequirementStatus
  dateAcquired: string
  notes: string
  pendingFile: File | null
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

const groupedRequirements = computed(() => groupRequirementsByCategoryAndTimeline(requirements.value))

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

function draftKey(requirementId: string, party: ChurchRequirementParty) {
  return `${requirementId}:${party}`
}

function buildPartyDraft(tracking: PartyTracking): PartyDraft {
  return {
    status: tracking.status,
    dateAcquired: toDateInputValue(tracking.dateAcquired),
    notes: tracking.notes ?? '',
    pendingFile: null,
  }
}

function clonePartyDrafts(
  source: Record<string, { groom: PartyDraft; bride: PartyDraft }>
): Record<string, { groom: PartyDraft; bride: PartyDraft }> {
  const next: Record<string, { groom: PartyDraft; bride: PartyDraft }> = {}
  for (const [id, parties] of Object.entries(source)) {
    next[id] = {
      groom: { ...parties.groom },
      bride: { ...parties.bride },
    }
  }
  return next
}

function syncDraftsFromRequirements(items: ChurchRequirementRecord[]) {
  const next: Record<string, { groom: PartyDraft; bride: PartyDraft }> = {}
  for (const item of items) {
    next[item._id] = {
      groom: buildPartyDraft(item.groom),
      bride: buildPartyDraft(item.bride),
    }
  }
  partyDrafts.value = next
  savedPartyDrafts.value = clonePartyDrafts(next)
}

function getPartyDraft(requirementId: string, party: ChurchRequirementParty): PartyDraft {
  return partyDrafts.value[requirementId]?.[party] ?? {
    status: 'required',
    dateAcquired: '',
    notes: '',
    pendingFile: null,
  }
}

function getSavedTracking(requirementId: string, party: ChurchRequirementParty): PartyTracking | null {
  const item = requirements.value.find((entry) => entry._id === requirementId)
  return item?.[party] ?? null
}

function isPartyDraftDirty(requirementId: string, party: ChurchRequirementParty): boolean {
  const current = partyDrafts.value[requirementId]?.[party]
  const saved = savedPartyDrafts.value[requirementId]?.[party]
  if (!current || !saved) {
    return false
  }
  return (
    current.status !== saved.status ||
    current.dateAcquired !== saved.dateAcquired ||
    current.notes !== saved.notes ||
    current.pendingFile !== null
  )
}

function replaceRequirementInList(updated: ChurchRequirementRecord) {
  requirements.value = requirements.value.map((item) =>
    item._id === updated._id ? updated : item
  )
  const nextDrafts = { ...partyDrafts.value }
  nextDrafts[updated._id] = {
    groom: buildPartyDraft(updated.groom),
    bride: buildPartyDraft(updated.bride),
  }
  partyDrafts.value = nextDrafts
  savedPartyDrafts.value = clonePartyDrafts(nextDrafts)
}

function onPartyFileSelected(
  requirementId: string,
  party: ChurchRequirementParty,
  event: Event
) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!partyDrafts.value[requirementId]) {
    return
  }
  partyDrafts.value[requirementId]![party].pendingFile = file
  input.value = ''
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
    requirements.value = []
    partyDrafts.value = {}
    savedPartyDrafts.value = {}
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'

  try {
    const response = await fetchRequirementsByEvent(targetEventId)
    if (response) {
      requirements.value = response.requirements ?? []
      syncDraftsFromRequirements(requirements.value)
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not load church requirements', error })
  }
}

async function savePartyRequirement(requirementId: string, party: ChurchRequirementParty) {
  if (mutationsDisabled.value || !isPartyDraftDirty(requirementId, party)) {
    return
  }

  const draft = getPartyDraft(requirementId, party)
  const key = draftKey(requirementId, party)
  savingKey.value = key

  try {
    const response = await updatePartyRequirement(
      requirementId,
      party,
      {
        status: draft.status,
        dateAcquired: fromDateInputValue(draft.dateAcquired),
        notes: draft.notes,
      },
      draft.pendingFile ?? undefined
    )
    if (response?.requirement) {
      replaceRequirementInList(response.requirement)
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

async function removePartyFile(requirementId: string, party: ChurchRequirementParty) {
  if (mutationsDisabled.value) {
    return
  }

  const key = draftKey(requirementId, party)
  savingKey.value = key

  try {
    const response = await deletePartyFile(requirementId, party)
    if (response?.requirement) {
      replaceRequirementInList(response.requirement)
    }
    toast.add({
      title: 'File removed',
      description: `${party === 'groom' ? 'Groom' : 'Bride'} file removed.`,
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not remove file', error })
  } finally {
    savingKey.value = null
  }
}

function openCreateModal() {
  createForm.value = {
    displayName: '',
    category: '',
    timeline: '',
    sourceUrl: '',
    description: '',
  }
  isCreateModalOpen.value = true
}

async function submitCreateRequirement() {
  if (mutationsDisabled.value || !createForm.value.displayName.trim()) {
    return
  }

  try {
    const response = await createRequirement({
      eventId: eventId.value || 'mock-event-id',
      displayName: createForm.value.displayName.trim(),
      category: createForm.value.category.trim(),
      timeline: createForm.value.timeline.trim(),
      sourceUrl: createForm.value.sourceUrl.trim(),
      description: createForm.value.description.trim(),
    })
    if (response?.requirement) {
      requirements.value = [...requirements.value, response.requirement]
      syncDraftsFromRequirements(requirements.value)
    }
    isCreateModalOpen.value = false
    toast.add({ title: 'Requirement created' })
  } catch (error) {
    reportApiError(toast, { title: 'Could not create requirement', error })
  }
}

function openEditModal(item: ChurchRequirementRecord) {
  editingRequirement.value = item
  editForm.value = {
    displayName: item.displayName,
    category: item.category,
    timeline: item.timeline,
    sourceUrl: item.sourceUrl,
    description: item.description,
  }
  isEditModalOpen.value = true
}

async function submitEditRequirement() {
  if (mutationsDisabled.value || !editingRequirement.value || !editForm.value.displayName.trim()) {
    return
  }

  try {
    const response = await updateRequirementDetails(editingRequirement.value._id, {
      displayName: editForm.value.displayName.trim(),
      category: editForm.value.category.trim(),
      timeline: editForm.value.timeline.trim(),
      sourceUrl: editForm.value.sourceUrl.trim(),
      description: editForm.value.description.trim(),
    })
    if (response?.requirement) {
      replaceRequirementInList(response.requirement)
    }
    isEditModalOpen.value = false
    editingRequirement.value = null
    toast.add({ title: 'Requirement updated' })
  } catch (error) {
    reportApiError(toast, { title: 'Could not update requirement', error })
  }
}

function openDeleteModal(item: ChurchRequirementRecord) {
  deletingRequirement.value = item
  isDeleteModalOpen.value = true
}

async function confirmDeleteRequirement() {
  if (mutationsDisabled.value || !deletingRequirement.value) {
    return
  }

  const targetId = deletingRequirement.value._id

  try {
    await deleteRequirement(targetId)
    requirements.value = requirements.value.filter((item) => item._id !== targetId)
    const nextDrafts = { ...partyDrafts.value }
    delete nextDrafts[targetId]
    partyDrafts.value = nextDrafts
    savedPartyDrafts.value = clonePartyDrafts(nextDrafts)
    isDeleteModalOpen.value = false
    deletingRequirement.value = null
    toast.add({ title: 'Requirement deleted' })
  } catch (error) {
    reportApiError(toast, { title: 'Could not delete requirement', error })
  }
}

function isSavingParty(requirementId: string, party: ChurchRequirementParty) {
  return savingKey.value === draftKey(requirementId, party)
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
  <UContainer class="space-y-6 py-8 pb-12">
    <div
      v-if="isPageLoading"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading church requirements...</span>
    </div>

    <div v-else class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted">
          Track church and civil documents for the groom and bride.
        </p>
        <UButton
          icon="i-lucide-plus"
          color="yellow"
          :disabled="mutationsDisabled || isSubmitting"
          @click="openCreateModal"
        >
          Add requirement
        </UButton>
      </div>

      <UAlert
        v-if="isEventCancelled"
        color="warning"
        variant="subtle"
        title="Event cancelled"
        description="This event is cancelled. Church requirement updates are disabled."
      />

      <div v-if="requirements.length === 0" class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-muted">
        No church requirements yet. Add one or wait for default templates to be seeded.
      </div>

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
              :key="item._id"
              class="white-bread-container space-y-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-2 min-w-0 flex-1">
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
                <div class="flex shrink-0 gap-2">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    :disabled="mutationsDisabled || isSubmitting"
                    @click="openEditModal(item)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="outline"
                    size="sm"
                    :disabled="mutationsDisabled || isSubmitting"
                    @click="openDeleteModal(item)"
                  />
                </div>
              </div>

              <div v-if="partyDrafts[item._id]" class="grid gap-4 md:grid-cols-2">
                <div
                  v-for="party in (['groom', 'bride'] as ChurchRequirementParty[])"
                  :key="`${item._id}-${party}`"
                  class="rounded-lg border border-gray-200 p-4 space-y-3"
                  :class="{ 'border-yellow-300 bg-yellow-50/40': isPartyDraftDirty(item._id, party) }"
                >
                  <div class="font-medium capitalize">
                    {{ party }}
                  </div>

                  <UFormField :label="`Status`" :name="`${item._id}-${party}-status`">
                    <USelect
                      v-model="partyDrafts[item._id]![party].status"
                      :items="statusSelectItems"
                      class="w-full"
                      :disabled="mutationsDisabled || isSubmitting"
                    />
                  </UFormField>

                  <UFormField
                    :label="`Date acquired`"
                    :name="`${item._id}-${party}-date-acquired`"
                  >
                    <UInput
                      v-model="partyDrafts[item._id]![party].dateAcquired"
                      type="date"
                      class="w-full"
                      :disabled="mutationsDisabled || isSubmitting"
                    />
                  </UFormField>

                  <UFormField
                    :label="`Notes`"
                    :name="`${item._id}-${party}-notes`"
                  >
                    <UTextarea
                      v-model="partyDrafts[item._id]![party].notes"
                      :rows="2"
                      class="w-full"
                      :disabled="mutationsDisabled || isSubmitting"
                    />
                  </UFormField>

                  <UFormField :label="`Document`" :name="`${item._id}-${party}-file`">
                    <div class="space-y-2">
                      <a
                        v-if="getSavedTracking(item._id, party)?.attachedFile?.fileURL && !partyDrafts[item._id]![party].pendingFile"
                        :href="getSavedTracking(item._id, party)!.attachedFile!.fileURL"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <UIcon name="i-lucide-file-text" class="size-4" />
                        {{ getSavedTracking(item._id, party)!.attachedFile!.fileName }}
                      </a>
                      <p
                        v-if="partyDrafts[item._id]![party].pendingFile"
                        class="text-sm text-muted"
                      >
                        Selected: {{ partyDrafts[item._id]![party].pendingFile!.name }}
                      </p>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-yellow-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-yellow-900"
                        :disabled="mutationsDisabled || isSubmitting"
                        @change="onPartyFileSelected(item._id, party, $event)"
                      />
                      <UButton
                        v-if="getSavedTracking(item._id, party)?.attachedFile?.fileURL"
                        icon="i-lucide-trash-2"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :loading="isSavingParty(item._id, party)"
                        :disabled="mutationsDisabled || isSubmitting"
                        @click="removePartyFile(item._id, party)"
                      >
                        Remove file
                      </UButton>
                    </div>
                  </UFormField>

                  <UButton
                    icon="i-lucide-save"
                    color="slate"
                    :loading="isSavingParty(item._id, party)"
                    :disabled="mutationsDisabled || isSubmitting || !isPartyDraftDirty(item._id, party)"
                    @click="savePartyRequirement(item._id, party)"
                  >
                    Save {{ party }}
                  </UButton>
                </div>
              </div>
            </UPageCard>
          </div>
        </section>
      </div>
    </div>

    <UModal
      v-model:open="isCreateModalOpen"
      title="Add requirement"
      :ui="churchRequirementModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Display name" required>
            <UInput v-model="createForm.displayName" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Category">
            <UInput v-model="createForm.category" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Timeline">
            <UInput v-model="createForm.timeline" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Source URL">
            <UInput v-model="createForm.sourceUrl" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="createForm.description" :rows="3" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isSubmitting"
              @click="isCreateModalOpen = false"
            />
            <UButton
              label="Create"
              color="yellow"
              :loading="isSubmitting"
              :disabled="!createForm.displayName.trim()"
              @click="submitCreateRequirement"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isEditModalOpen"
      title="Edit requirement"
      :ui="churchRequirementModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Display name" required>
            <UInput v-model="editForm.displayName" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Category">
            <UInput v-model="editForm.category" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Timeline">
            <UInput v-model="editForm.timeline" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Source URL">
            <UInput v-model="editForm.sourceUrl" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="editForm.description" :rows="3" class="w-full" :disabled="isSubmitting" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isSubmitting"
              @click="isEditModalOpen = false"
            />
            <UButton
              label="Save"
              color="yellow"
              :loading="isSubmitting"
              :disabled="!editForm.displayName.trim()"
              @click="submitEditRequirement"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Delete requirement"
      :ui="churchRequirementModalUi"
      :close="{ variant: 'link', class: 'rounded-full text-white' }"
      :dismissible="!isSubmitting"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          Delete
          <span class="font-medium text-highlighted">{{ deletingRequirement?.displayName }}</span>?
          This cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isSubmitting"
            @click="isDeleteModalOpen = false"
          />
          <UButton
            label="Delete"
            color="error"
            :loading="isSubmitting"
            @click="confirmDeleteRequirement"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
