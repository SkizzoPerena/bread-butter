<script lang="ts" setup>
import type { TaskRecord } from '~/types/task'
import { mapTaskPriority } from '~/utils/taskPriority'
import { formatTaskBudget, formatTaskDate } from '~/utils/taskFormat'

const props = defineProps<{
  task: TaskRecord | null
}>()

const open = defineModel<boolean>('open', { required: true })

const priorityMeta = computed(() =>
  props.task ? mapTaskPriority(props.task.priority) : { label: '—', color: 'neutral' as const }
)

const statusLabel = computed(() => {
  if (!props.task) {
    return '—'
  }
  if (props.task.status === 'ONGOING') {
    return 'Ongoing'
  }
  if (props.task.status === 'COMPLETED') {
    return 'Completed'
  }
  return 'Cancelled'
})

const imageUrls = computed(() => {
  if (!props.task?.attachedFileURLs?.length) {
    return []
  }
  return props.task.attachedFileURLs.map((file) => file.fileURL).filter(Boolean)
})

const subtasks = computed(() => props.task?.subtasks ?? [])
</script>

<template>
  <UModal
    v-model:open="open"
    :title="task?.title ?? 'Task details'"
    :ui="{
      header: 'bg-toast-400 border-none',
      title: 'text-white font-serif text-xl',
      content: 'border-none ring-transparent w-full max-w-lg',
      overlay: 'bg-toast-900/30',
    }"
    :close="{ variant: 'link', class: 'rounded-full text-white' }"
  >
    <template #body>
      <div v-if="task" class="space-y-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Description</p>
          <p class="mt-1 whitespace-pre-wrap text-sm">{{ task.details }}</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
            <p class="mt-1 text-sm">{{ statusLabel }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Priority</p>
            <UBadge :color="priorityMeta.color" variant="subtle" class="mt-1">
              {{ priorityMeta.label }}
            </UBadge>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Budget</p>
            <p class="mt-1 text-sm">{{ formatTaskBudget(task.budget) }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Deadline</p>
            <p class="mt-1 text-sm">{{ formatTaskDate(task.deadline) ?? '—' }}</p>
          </div>
        </div>

        <div v-if="imageUrls.length > 0">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Photos</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <a
              v-for="url in imageUrls"
              :key="url"
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
              class="block overflow-hidden rounded-md ring ring-default"
            >
              <img :src="url" alt="" class="h-24 w-24 object-cover">
            </a>
          </div>
        </div>

        <div v-if="subtasks.length > 0">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">
            Subtasks ({{ subtasks.length }})
          </p>
          <ul class="mt-2 space-y-2">
            <li
              v-for="subtask in subtasks"
              :key="subtask._id"
              class="rounded-md border border-default px-3 py-2 text-sm"
            >
              <div class="font-medium">{{ subtask.title }}</div>
              <p class="mt-0.5 line-clamp-2 text-xs text-muted">{{ subtask.details }}</p>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </UModal>
</template>
