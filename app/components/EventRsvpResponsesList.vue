<script lang="ts" setup>
import type { EventQuestion } from '~/types/event'
import type { RsvpRecord, RsvpStatusFilter } from '~/types/rsvp'
import { reportApiError } from '~/types/auth'
import {
  formatRsvpAnswerValue,
  formatRsvpAnswerNotes,
  formatRsvpDate,
  isRetiredQuestion,
  mapRsvpStatusToBadgeColor,
  mapRsvpStatusToLabel,
} from '~/utils/rsvpDisplay'

const props = withDefaults(defineProps<{
  eventId: string
  currentQuestions: EventQuestion[]
  hideHeader?: boolean
}>(), {
  hideHeader: false,
})

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: 'ALL' as const },
  { label: 'Attending', value: 'GOING' as const },
  { label: 'Not Attending', value: 'NOT_GOING' as const },
  { label: 'Pending', value: 'PENDING' as const },
]

const PAGE_SIZE = 25

const toast = useToast()
const { fetchEventRsvps } = useRsvps()

const rsvps = ref<RsvpRecord[]>([])
const isLoading = ref(false)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const statusFilter = ref<RsvpStatusFilter>('ALL')

function formatGuestName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function loadRsvps() {
  if (!props.eventId) {
    rsvps.value = []
    total.value = 0
    totalPages.value = 1
    return
  }

  isLoading.value = true
  try {
    const response = await fetchEventRsvps(props.eventId, {
      page: page.value,
      limit: PAGE_SIZE,
      status: statusFilter.value,
    })
    rsvps.value = response.rsvps ?? []
    total.value = response.total ?? 0
    totalPages.value = response.totalPages ?? 1
    page.value = response.page ?? page.value
  } catch (error) {
    reportApiError(toast, { title: 'Could not load RSVP responses', error })
    rsvps.value = []
    total.value = 0
    totalPages.value = 1
  } finally {
    isLoading.value = false
  }
}

function handleStatusFilterChange(value: RsvpStatusFilter) {
  statusFilter.value = value
  page.value = 1
  loadRsvps()
}

watch(
  () => props.eventId,
  () => {
    page.value = 1
    statusFilter.value = 'ALL'
    loadRsvps()
  },
  { immediate: true }
)

watch(page, () => {
  loadRsvps()
})

defineExpose({ reload: loadRsvps })
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-wrap items-center gap-3"
      :class="hideHeader ? 'justify-end' : 'justify-between'"
    >
      <div v-if="!hideHeader">
        <div class="text-lg font-semibold text-highlighted">
          RSVP Responses
        </div>
        <p class="text-sm text-muted">
          {{ total.toLocaleString() }} invitation{{ total === 1 ? '' : 's' }} sent
        </p>
      </div>

      <UFormField label="Filter by status" name="rsvpStatusFilter" class="min-w-48">
        <USelect
          :model-value="statusFilter"
          :items="STATUS_FILTER_OPTIONS"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="handleStatusFilterChange($event as RsvpStatusFilter)"
        />
      </UFormField>
    </div>

    <div
      v-if="isLoading"
      class="flex items-center justify-center py-12 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading responses...</span>
    </div>

    <div
      v-else-if="!rsvps.length"
      class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
    >
      <UIcon name="i-lucide-inbox" class="size-10 text-muted" />
      <p class="mt-4 text-base font-medium">No RSVP responses yet</p>
      <p class="mt-1 max-w-sm text-sm text-muted">
        Responses will appear here after you send invitations and guests reply.
      </p>
    </div>

    <div v-else class="space-y-3">
      <UPageCard
        v-for="rsvp in rsvps"
        :key="rsvp._id"
        class="bg-muted/10"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="font-medium text-highlighted">
              {{ formatGuestName(rsvp.name) }}
            </p>
            <p class="text-sm text-muted">
              {{ rsvp.email }}
            </p>
          </div>

          <div class="flex flex-col items-end gap-1">
            <UBadge
              :color="mapRsvpStatusToBadgeColor(rsvp.status)"
              variant="subtle"
            >
              {{ mapRsvpStatusToLabel(rsvp.status) }}
            </UBadge>
            <p
              v-if="formatRsvpDate(rsvp.respondedAt)"
              class="text-xs text-muted"
            >
              Responded {{ formatRsvpDate(rsvp.respondedAt) }}
            </p>
            <p
              v-else-if="formatRsvpDate(rsvp.invitedAt)"
              class="text-xs text-muted"
            >
              Invited {{ formatRsvpDate(rsvp.invitedAt) }}
            </p>
          </div>
        </div>

        <USeparator class="my-4" />

        <div v-if="rsvp.answers.length" class="space-y-3">
          <div
            v-for="(answer, index) in rsvp.answers"
            :key="`${rsvp._id}-${index}-${answer.question}`"
            class="rounded-lg border border-default/60 bg-default/40 px-4 py-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="text-sm font-medium text-highlighted">
                {{ answer.question }}
              </p>
              <UBadge
                v-if="isRetiredQuestion(answer.question, currentQuestions)"
                color="warning"
                variant="subtle"
                size="xs"
              >
                Previous question
              </UBadge>
            </div>
            <p class="mt-2 text-sm text-muted">
              {{ formatRsvpAnswerValue(answer.answer) }}
            </p>
            <p
              v-if="formatRsvpAnswerNotes(answer.notes)"
              class="mt-2 text-sm text-muted italic"
            >
              Notes: {{ formatRsvpAnswerNotes(answer.notes) }}
            </p>
          </div>
        </div>

        <p v-else class="text-sm text-muted italic">
          No answers submitted yet
        </p>
      </UPageCard>
    </div>

    <div
      v-if="!isLoading && totalPages > 1"
      class="flex justify-center pt-2"
    >
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="PAGE_SIZE"
        show-edges
      />
    </div>
  </div>
</template>
