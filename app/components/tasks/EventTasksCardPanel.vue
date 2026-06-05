<script lang="ts" setup>
import type { EventRecord, TasksSummary } from '~/types/event'
import type { TaskStatus } from '~/types/task'

const props = defineProps<{
  eventId: string
  eventRecord: EventRecord | null
  tasksSummary?: TasksSummary | null
  isEventCancelled?: boolean
}>()

const emit = defineEmits<{
  'update:tasksSummary': [value: TasksSummary | null]
}>()

const eventIdRef = toRef(props, 'eventId')
const isEventCancelledRef = toRef(props, 'isEventCancelled')
const tasksSummaryRef = toRef(props, 'tasksSummary')

const {
  isUiOnlyMode,
  isLoading,
  updatingTaskId,
  searchQuery,
  priorityFilter,
  sortBy,
  isFormOpen,
  editingTask,
  isDetailsOpen,
  selectedTask,
  isActionModalOpen,
  taskForAction,
  actionMode,
  isActionSubmitting,
  mutationsDisabled,
  actionModalTitle,
  tasksForStatus,
  statusCount,
  openCreateModal,
  openDetailsModal,
  openEditModal,
  handleRestoreTask,
  openCancelModal,
  openRemoveModal,
  closeActionModal,
  handleStatusChange,
  handleFormSaved,
  confirmTaskAction,
} = useEventTasksManager({
  eventId: eventIdRef,
  isEventCancelled: isEventCancelledRef,
  tasksSummary: tasksSummaryRef,
  onSummarySync: (value) => emit('update:tasksSummary', value),
})

const tabItems = computed(() => {
  const items: { label: string; slot: string }[] = [
    { label: `Ongoing (${statusCount('ONGOING')})`, slot: 'ongoing' },
    { label: `Completed (${statusCount('COMPLETED')})`, slot: 'completed' },
  ]
  if (statusCount('CANCELLED') > 0) {
    items.push({ label: `Cancelled (${statusCount('CANCELLED')})`, slot: 'cancelled' })
  }
  return items
})

function emptyLabel(status: TaskStatus): string {
  if (status === 'ONGOING') {
    return 'No ongoing tasks.'
  }
  if (status === 'COMPLETED') {
    return 'No completed tasks.'
  }
  return 'No cancelled tasks.'
}
</script>

<template>
  <UPageCard class="white-bread-container space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-xl font-semibold text-muted">Tasks Checklist</div>
      <UButton
        icon="i-lucide-list-plus"
        :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
        @click="openCreateModal"
      >
        Add New Task
      </UButton>
    </div>

    <UAlert
      v-if="mutationsDisabled"
      color="warning"
      variant="subtle"
      title="Event cancelled"
      description="Tasks cannot be added or edited. Use Remove to permanently delete a task from this event."
    />

    <TaskToolbar
      v-model:search-query="searchQuery"
      v-model:priority-filter="priorityFilter"
      v-model:sort-by="sortBy"
    />

    <div
      v-if="isLoading"
      class="flex items-center justify-center py-12 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading tasks...</span>
    </div>

    <UTabs
      v-else
      :items="tabItems"
      variant="link"
    >
      <template #ongoing>
        <div class="mt-4">
          <UPageColumns v-if="tasksForStatus('ONGOING').length > 0">
            <EventTaskChecklistCard
              v-for="task in tasksForStatus('ONGOING')"
              :key="task._id"
              :task="task"
              :disabled="mutationsDisabled"
              :is-event-cancelled="isEventCancelled"
              :updating-task-id="updatingTaskId"
              @select="openDetailsModal"
              @edit="openEditModal"
              @cancel="openCancelModal"
              @restore="handleRestoreTask"
              @remove="openRemoveModal"
              @status-change="handleStatusChange"
            />
          </UPageColumns>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ emptyLabel('ONGOING') }}
          </p>
        </div>
      </template>

      <template #completed>
        <div class="mt-4">
          <UPageColumns v-if="tasksForStatus('COMPLETED').length > 0">
            <EventTaskChecklistCard
              v-for="task in tasksForStatus('COMPLETED')"
              :key="task._id"
              :task="task"
              :disabled="mutationsDisabled"
              :is-event-cancelled="isEventCancelled"
              :updating-task-id="updatingTaskId"
              @select="openDetailsModal"
              @edit="openEditModal"
              @cancel="openCancelModal"
              @restore="handleRestoreTask"
              @remove="openRemoveModal"
              @status-change="handleStatusChange"
            />
          </UPageColumns>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ emptyLabel('COMPLETED') }}
          </p>
        </div>
      </template>

      <template #cancelled>
        <div class="mt-4">
          <UPageColumns v-if="tasksForStatus('CANCELLED').length > 0">
            <EventTaskChecklistCard
              v-for="task in tasksForStatus('CANCELLED')"
              :key="task._id"
              :task="task"
              :disabled="mutationsDisabled"
              :is-event-cancelled="isEventCancelled"
              :updating-task-id="updatingTaskId"
              @select="openDetailsModal"
              @edit="openEditModal"
              @cancel="openCancelModal"
              @restore="handleRestoreTask"
              @remove="openRemoveModal"
              @status-change="handleStatusChange"
            />
          </UPageColumns>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ emptyLabel('CANCELLED') }}
          </p>
        </div>
      </template>
    </UTabs>

    <TaskDetailsModal
      v-model:open="isDetailsOpen"
      :task="selectedTask"
    />

    <TaskFormModal
      v-model:open="isFormOpen"
      :event-id="eventId"
      :event-record="eventRecord"
      :task="editingTask"
      :disabled="mutationsDisabled"
      @saved="handleFormSaved"
    />

    <UModal
      v-model:open="isActionModalOpen"
      :title="actionModalTitle"
      :dismissible="!isActionSubmitting"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          <template v-if="actionMode === 'remove'">
            Permanently remove
            <span class="font-medium text-highlighted">{{ taskForAction?.title }}</span>
            ? Any subtasks will become main tasks. Attached photos for this task will be deleted.
            This cannot be undone.
          </template>
          <template v-else>
            Cancel
            <span class="font-medium text-highlighted">{{ taskForAction?.title }}</span>
            ? It will move to the Cancelled section.
          </template>
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Back"
            color="neutral"
            variant="outline"
            :disabled="isActionSubmitting"
            @click="closeActionModal"
          />
          <UButton
            :label="actionMode === 'remove' ? 'Remove permanently' : 'Cancel task'"
            color="error"
            :loading="isActionSubmitting"
            @click="confirmTaskAction"
          />
        </div>
      </template>
    </UModal>
  </UPageCard>
</template>
