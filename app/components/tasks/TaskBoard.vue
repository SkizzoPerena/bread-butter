<script lang="ts" setup>
import type { TaskRecord, TaskStatus } from '~/types/task'
import { groupTasksByStatus } from '~/utils/taskListUpdates'

const props = defineProps<{
  tasks: TaskRecord[]
  disabled?: boolean
  showDelete?: boolean
  updatingTaskId?: string | null
}>()

const emit = defineEmits<{
  'status-change': [payload: { taskId: string; status: TaskStatus }]
  edit: [task: TaskRecord]
  delete: [task: TaskRecord]
}>()

const columns: { status: TaskStatus; label: string }[] = [
  { status: 'ONGOING', label: 'Ongoing' },
  { status: 'COMPLETED', label: 'Completed' },
  { status: 'CANCELLED', label: 'Cancelled' },
]

const grouped = computed(() => groupTasksByStatus(props.tasks))

const dragOverColumn = ref<TaskStatus | null>(null)

function onDragOver(event: DragEvent, status: TaskStatus) {
  if (props.disabled) {
    return
  }
  event.preventDefault()
  dragOverColumn.value = status
}

function onDragLeave() {
  dragOverColumn.value = null
}

function onDrop(event: DragEvent, status: TaskStatus) {
  event.preventDefault()
  dragOverColumn.value = null
  if (props.disabled) {
    return
  }
  const taskId = event.dataTransfer?.getData('text/task-id')
  if (!taskId) {
    return
  }
  const task = props.tasks.find((entry) => entry._id === taskId)
  if (!task || task.status === status) {
    return
  }
  emit('status-change', { taskId, status })
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <div
      v-for="column in columns"
      :key="column.status"
      class="min-h-[12rem] rounded-lg border border-default bg-muted/20 p-3 transition"
      :class="dragOverColumn === column.status ? 'border-primary bg-primary/5' : ''"
      @dragover="onDragOver($event, column.status)"
      @dragleave="onDragLeave"
      @drop="onDrop($event, column.status)"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">
          {{ column.label }}
        </h3>
        <UBadge variant="subtle" color="neutral">
          {{ grouped[column.status].length }}
        </UBadge>
      </div>

      <div
        v-if="grouped[column.status].length === 0"
        class="rounded-md border border-dashed border-default px-3 py-8 text-center text-sm text-muted"
      >
        No tasks
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="task in grouped[column.status]"
          :key="task._id"
          :class="updatingTaskId === task._id ? 'opacity-60 pointer-events-none' : ''"
        >
          <TaskCard
            :task="task"
            :disabled="disabled"
            :show-delete="showDelete"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
