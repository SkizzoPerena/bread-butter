<script lang="ts" setup>
import type { TaskRecord } from '~/types/task'
import { mapTaskPriority } from '~/utils/taskPriority'
import { formatTaskDate } from '~/utils/taskFormat'

const props = defineProps<{
  task: TaskRecord
  disabled?: boolean
  showDelete?: boolean
}>()

const emit = defineEmits<{
  edit: [task: TaskRecord]
  delete: [task: TaskRecord]
}>()

const priorityMeta = computed(() => mapTaskPriority(props.task.priority))
const subtaskCount = computed(() => props.task.subtasks?.length ?? 0)

let dragStarted = false

function onDragStart(event: DragEvent) {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  dragStarted = true
  event.dataTransfer?.setData('text/task-id', props.task._id)
  event.dataTransfer!.effectAllowed = 'move'
}

function onDragEnd() {
  window.setTimeout(() => {
    dragStarted = false
  }, 0)
}

function onClick() {
  if (dragStarted) {
    return
  }
  emit('edit', props.task)
}

function onDeleteClick(event: MouseEvent) {
  event.stopPropagation()
  emit('delete', props.task)
}
</script>

<template>
  <UPageCard
    class="white-bread-container cursor-pointer ring-1 ring-inset ring-primary/15 transition hover:ring-primary/30"
    :draggable="!disabled"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onClick"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1 font-semibold">{{ task.title }}</div>
      <div class="flex shrink-0 items-center gap-1">
        <UBadge
          v-if="subtaskCount > 0"
          variant="subtle"
          color="neutral"
          size="sm"
        >
          {{ subtaskCount }} subtask{{ subtaskCount === 1 ? '' : 's' }}
        </UBadge>
        <UBadge
          :color="priorityMeta.color"
          variant="subtle"
        >
          {{ priorityMeta.label }}
        </UBadge>
        <UButton
          v-if="showDelete && !disabled"
          icon="i-lucide-trash-2"
          size="xs"
          color="error"
          variant="ghost"
          aria-label="Remove task"
          @click="onDeleteClick"
        />
      </div>
    </div>

    <p class="mt-1 line-clamp-3 text-sm text-muted">
      {{ task.details }}
    </p>

    <div
      v-if="formatTaskDate(task.deadline)"
      class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
    >
      <div class="flex items-center gap-1.5 text-muted">
        <UIcon name="i-lucide-calendar-clock" />
        <span>Due: {{ formatTaskDate(task.deadline) }}</span>
      </div>
    </div>
  </UPageCard>
</template>
