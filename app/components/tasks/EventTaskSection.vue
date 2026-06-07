<script lang="ts" setup>
import type { EventRecord, TasksSummary } from '~/types/event'

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
  assigneeSelectItems,
  isLoading,
  updatingTaskId,
  searchQuery,
  priorityFilter,
  sortBy,
  collapsedGroups,
  isFormOpen,
  editingTask,
  isDetailsOpen,
  selectedTask,
  isRemoveModalOpen,
  taskForRemove,
  isRemoveSubmitting,
  mutationsDisabled,
  filteredTasks,
  openCreateModal,
  openDetailsModal,
  openEditModal,
  openRemoveModal,
  closeRemoveModal,
  handleStatusChange,
  handleMoveToTodo,
  handlePriorityChange,
  handleFormSaved,
  confirmRemoveTask,
  toggleGroup,
} = useEventTasksManager({
  eventId: eventIdRef,
  isEventCancelled: isEventCancelledRef,
  tasksSummary: tasksSummaryRef,
  onSummarySync: (value) => emit('update:tasksSummary', value),
})
</script>

<template>
  <UPageCard class="white-bread-container space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
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
      description="Tasks cannot be added or edited while this event is cancelled."
    />

    <TaskToolbar
      v-model:search-query="searchQuery"
      v-model:priority-filter="priorityFilter"
      v-model:sort-by="sortBy"
    />

    <div v-if="isLoading" class="flex items-center justify-center py-12 text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading tasks...</span>
    </div>

    <TaskListView
      v-else
      :tasks="filteredTasks"
      :disabled="mutationsDisabled"
      :selected-task-id="selectedTask?._id"
      :collapsed-groups="collapsedGroups"
      :updating-task-id="updatingTaskId"
      @toggle-group="toggleGroup"
      @status-change="handleStatusChange"
      @priority-change="handlePriorityChange"
      @select="openDetailsModal"
      @edit="openEditModal"
      @remove="openRemoveModal"
      @move-to-todo="handleMoveToTodo"
      @add-task="openCreateModal"
    />

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
