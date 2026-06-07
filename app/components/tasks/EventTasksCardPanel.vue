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
  assignees,
  assigneeSelectItems,
  isLoading,
  updatingTaskId,
  searchQuery,
  priorityFilter,
  sortBy,
  selectedTab,
  tabItems,
  isFormOpen,
  editingTask,
  isDetailsOpen,
  selectedTask,
  isRemoveModalOpen,
  taskForRemove,
  isRemoveSubmitting,
  isManageAssigneesOpen,
  mutationsDisabled,
  tasksForTab,
  openCreateModal,
  openDetailsModal,
  openEditModal,
  openManageAssigneesModal,
  openRemoveModal,
  closeRemoveModal,
  handleStatusChange,
  handleMoveToTodo,
  handleFormSaved,
  handleAssigneesChanged,
  confirmRemoveTask,
} = useEventTasksManager({
  eventId: eventIdRef,
  isEventCancelled: isEventCancelledRef,
  tasksSummary: tasksSummaryRef,
  onSummarySync: (value) => emit('update:tasksSummary', value),
})

defineExpose({ openCreateModal })

const tabSlots = ['todo', 'ongoing', 'completed'] as const

function emptyLabel(status: TaskStatus): string {
  if (status === 'TODO') return 'No tasks to do.'
  if (status === 'ONGOING') return 'No ongoing tasks.'
  return 'No completed tasks.'
}

function tabStatus(index: number): TaskStatus {
  const statuses: TaskStatus[] = ['TODO', 'ONGOING', 'COMPLETED']
  return statuses[index] ?? 'TODO'
}
</script>

<template>
  <UPageCard class="white-bread-container space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-xl font-semibold text-muted">Tasks Checklist</div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          icon="i-lucide-users"
          variant="outline"
          :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
          @click="openManageAssigneesModal"
        >
          Manage Assignees
        </UButton>
        <UButton
          icon="i-lucide-list-plus"
          :disabled="mutationsDisabled || (!eventId && !isUiOnlyMode)"
          @click="openCreateModal"
        >
          Add New Task
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="mutationsDisabled"
      color="warning"
      variant="subtle"
      title="Event cancelled"
      description="Tasks cannot be added or edited while this event is cancelled."
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
      v-model="selectedTab"
      :items="tabItems"
      variant="link"
    >
      <template
        v-for="(slot, index) in tabSlots"
        :key="slot"
        #[slot]
      >
        <div class="mt-4">
          <UPageColumns v-if="tasksForTab(index).length > 0">
            <EventTaskChecklistCard
              v-for="task in tasksForTab(index)"
              :key="task._id"
              :task="task"
              :disabled="mutationsDisabled"
              :updating-task-id="updatingTaskId"
              @select="openDetailsModal"
              @edit="openEditModal"
              @remove="openRemoveModal"
              @move-to-todo="handleMoveToTodo"
              @status-change="handleStatusChange"
            />
          </UPageColumns>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ emptyLabel(tabStatus(index)) }}
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
      :assignee-select-items="assigneeSelectItems"
      :disabled="mutationsDisabled"
      @saved="handleFormSaved"
    />

    <ManageAssigneesModal
      v-model:open="isManageAssigneesOpen"
      :event-id="eventId"
      :assignees="assignees"
      :disabled="mutationsDisabled"
      @changed="handleAssigneesChanged"
    />

    <UModal
      v-model:open="isRemoveModalOpen"
      title="Delete task?"
      :dismissible="!isRemoveSubmitting"
      :ui="{ content: 'border-none ring-transparent max-w-md' }"
    >
      <template #body>
        <p class="mb-4 text-sm text-muted">
          Permanently delete
          <span class="font-medium text-highlighted">{{ taskForRemove?.title }}</span>
          ? Any subtasks will become main tasks. Attached photos for this task will be deleted.
          This cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Back"
            color="neutral"
            variant="outline"
            :disabled="isRemoveSubmitting"
            @click="closeRemoveModal"
          />
          <UButton
            label="Delete permanently"
            color="error"
            :loading="isRemoveSubmitting"
            @click="confirmRemoveTask"
          />
        </div>
      </template>
    </UModal>
  </UPageCard>
</template>
