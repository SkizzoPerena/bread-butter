<script lang="ts" setup>
import type { TaskRecord, TaskStatus } from '~/types/task'
import { mapTaskPriority } from '~/utils/taskPriority'
import { formatTaskBudget, formatTaskDate } from '~/utils/taskFormat'

const props = defineProps<{
  task: TaskRecord
  disabled?: boolean
  isEventCancelled?: boolean
  updatingTaskId?: string | null
}>()

const emit = defineEmits<{
  edit: [task: TaskRecord]
  cancel: [task: TaskRecord]
  restore: [task: TaskRecord]
  remove: [task: TaskRecord]
  'status-change': [payload: { taskId: string; status: TaskStatus }]
  select: [task: TaskRecord]
}>()

const priorityMeta = computed(() => mapTaskPriority(props.task.priority))

const dateLabel = computed(() => {
  const formatted = formatTaskDate(props.task.deadline)
  if (!formatted) {
    return null
  }
  if (props.task.status === 'COMPLETED') {
    return `Completed: ${formatted}`
  }
  return `Due: ${formatted}`
})

const isUpdating = computed(() => props.updatingTaskId === props.task._id)

function canCancelTask(): boolean {
  return !props.isEventCancelled && !props.disabled && props.task.status !== 'CANCELLED'
}

function canRestoreTask(): boolean {
  return !props.isEventCancelled && !props.disabled && props.task.status === 'CANCELLED'
}

function canRemoveTask(): boolean {
  return Boolean(props.isEventCancelled)
}

function onCardClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button, [data-card-action]')) {
    return
  }
  emit('select', props.task)
}

function onPrimaryAction() {
  if (props.task.status === 'ONGOING') {
    emit('status-change', { taskId: props.task._id, status: 'COMPLETED' })
    return
  }
  if (props.task.status === 'COMPLETED') {
    emit('status-change', { taskId: props.task._id, status: 'ONGOING' })
    return
  }
  emit('restore', props.task)
}
</script>

<template>
  <UPageCard
    class="white-bread-container cursor-pointer"
    @click="onCardClick"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="font-semibold">{{ task.title }}</div>
      <UBadge
        :color="priorityMeta.color"
        variant="subtle"
      >
        {{ priorityMeta.label }}
      </UBadge>
    </div>

    <p
      v-if="task.details"
      class="mt-1 text-sm text-muted"
    >
      {{ task.details }}
    </p>

    <div
      v-if="dateLabel || task.budget"
      class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
    >
      <div
        v-if="dateLabel"
        class="flex items-center gap-1.5 text-muted"
      >
        <UIcon name="i-lucide-calendar-clock" />
        <span>{{ dateLabel }}</span>
      </div>
      <div
        v-if="task.budget"
        class="flex items-center gap-1.5 text-muted"
      >
        <UIcon name="i-lucide-wallet" />
        <span>Budget: {{ formatTaskBudget(task.budget) }}</span>
      </div>
    </div>

    <div
      v-if="!isEventCancelled"
      class="mt-4 space-y-2"
      data-card-action
    >
      <UButton
        v-if="task.status === 'ONGOING'"
        block
        :loading="isUpdating"
        :disabled="disabled"
        @click.stop="onPrimaryAction"
      >
        Mark as Complete
      </UButton>
      <UButton
        v-else-if="task.status === 'COMPLETED'"
        block
        variant="outline"
        :loading="isUpdating"
        :disabled="disabled"
        @click.stop="onPrimaryAction"
      >
        Mark as Ongoing
      </UButton>
      <UButton
        v-else-if="canRestoreTask()"
        block
        variant="outline"
        :loading="isUpdating"
        @click.stop="onPrimaryAction"
      >
        Restore task
      </UButton>
    </div>

    <div
      class="mt-3 flex items-center justify-end gap-1"
      data-card-action
    >
      <UButton
        size="xs"
        variant="ghost"
        icon="i-lucide-pencil"
        aria-label="Edit task"
        :disabled="disabled"
        @click.stop="emit('edit', task)"
      />
      <UButton
        v-if="canRestoreTask()"
        size="xs"
        variant="ghost"
        color="primary"
        icon="i-lucide-undo-2"
        aria-label="Restore task"
        @click.stop="emit('restore', task)"
      />
      <UButton
        v-if="canCancelTask()"
        size="xs"
        variant="ghost"
        color="error"
        icon="i-lucide-ban"
        aria-label="Cancel task"
        @click.stop="emit('cancel', task)"
      />
      <UButton
        v-if="canRemoveTask()"
        size="xs"
        variant="ghost"
        color="error"
        icon="i-lucide-trash-2"
        aria-label="Permanently remove task"
        @click.stop="emit('remove', task)"
      />
    </div>
  </UPageCard>
</template>
