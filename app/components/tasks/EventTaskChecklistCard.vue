<script lang="ts" setup>
import type { TaskRecord, TaskStatus } from '~/types/task'
import { getAssigneeLabel } from '~/utils/taskAssignee'
import { mapTaskPriority } from '~/utils/taskPriority'
import { formatTaskDate } from '~/utils/taskFormat'

const props = defineProps<{
  task: TaskRecord
  disabled?: boolean
  updatingTaskId?: string | null
}>()

const emit = defineEmits<{
  edit: [task: TaskRecord]
  remove: [task: TaskRecord]
  'move-to-todo': [task: TaskRecord]
  'status-change': [payload: { taskId: string; status: TaskStatus }]
  select: [task: TaskRecord]
}>()

const priorityMeta = computed(() => mapTaskPriority(props.task.priority))
const assigneeLabel = computed(() => getAssigneeLabel(props.task))

const imageUrls = computed(() =>
  (props.task.attachedFileURLs ?? []).map((file) => file.fileURL).filter(Boolean)
)

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

function canDeleteTask(): boolean {
  return !props.disabled && props.task.status === 'TODO'
}

function canMoveToTodo(): boolean {
  return (
    !props.disabled &&
    (props.task.status === 'ONGOING' || props.task.status === 'COMPLETED')
  )
}

function onCardClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button, [data-card-action]')) {
    return
  }
  emit('select', props.task)
}

function onPrimaryAction() {
  if (props.task.status === 'TODO') {
    emit('status-change', { taskId: props.task._id, status: 'ONGOING' })
    return
  }
  if (props.task.status === 'ONGOING') {
    emit('status-change', { taskId: props.task._id, status: 'COMPLETED' })
    return
  }
  if (props.task.status === 'COMPLETED') {
    emit('status-change', { taskId: props.task._id, status: 'ONGOING' })
  }
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

    <div class="mt-2 flex flex-wrap items-center gap-2">
      <UBadge color="neutral" variant="outline" size="sm">
        <UIcon name="i-lucide-user" class="mr-1 size-3" />
        {{ assigneeLabel }}
      </UBadge>
    </div>

    <p
      v-if="task.details"
      class="mt-1 text-sm text-muted"
    >
      {{ task.details }}
    </p>

    <div
      v-if="imageUrls.length > 0"
      class="mt-3 flex flex-wrap gap-2"
    >
      <img
        v-for="url in imageUrls"
        :key="url"
        :src="url"
        alt=""
        class="h-14 w-14 rounded object-cover ring ring-default"
      >
    </div>

    <div
      v-if="dateLabel"
      class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
    >
      <div class="flex items-center gap-1.5 text-muted">
        <UIcon name="i-lucide-calendar-clock" />
        <span>{{ dateLabel }}</span>
      </div>
    </div>

    <div
      v-if="!disabled"
      class="mt-4 space-y-2"
      data-card-action
    >
      <UButton
        v-if="task.status === 'TODO'"
        block
        :loading="isUpdating"
        @click.stop="onPrimaryAction"
      >
        Mark as Ongoing
      </UButton>
      <UButton
        v-else-if="task.status === 'ONGOING'"
        block
        :loading="isUpdating"
        @click.stop="onPrimaryAction"
      >
        Mark as Complete
      </UButton>
      <UButton
        v-else-if="task.status === 'COMPLETED'"
        block
        variant="outline"
        :loading="isUpdating"
        @click.stop="onPrimaryAction"
      >
        Mark as Ongoing
      </UButton>
      <UButton
        v-if="canMoveToTodo()"
        block
        variant="outline"
        :loading="isUpdating"
        @click.stop="emit('move-to-todo', task)"
      >
        Mark as To Do
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
        v-if="canDeleteTask()"
        size="xs"
        variant="ghost"
        color="error"
        icon="i-lucide-trash-2"
        aria-label="Delete task"
        @click.stop="emit('remove', task)"
      />
    </div>
  </UPageCard>
</template>
