<script lang="ts" setup>
import type { TaskRecord } from '~/types/task'
import { getAssigneeLabel } from '~/utils/taskAssignee'
import { mapTaskPriority } from '~/utils/taskPriority'
import { formatTaskDate } from '~/utils/taskFormat'

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
  if (props.task.status === 'TODO') {
    return 'To Do'
  }
  if (props.task.status === 'ONGOING') {
    return 'Ongoing'
  }
  if (props.task.status === 'COMPLETED') {
    return 'Completed'
  }
  return props.task.status
})

const statusColor = computed(() => {
  if (props.task?.status === 'TODO') return 'slate' as const
  if (props.task?.status === 'ONGOING') return 'purple' as const
  if (props.task?.status === 'COMPLETED') return 'success' as const
  return 'neutral' as const
})

const assigneeLabel = computed(() => (props.task ? getAssigneeLabel(props.task) : '—'))

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
      title: 'text-white font-sans font-semibold text-xl',
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
            <div class="mt-1">
              <UBadge :color="statusColor" variant="subtle">
                {{ statusLabel }}
              </UBadge>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Priority</p>
            <div class="mt-1 flex items-center gap-2">
              <UBadge :color="priorityMeta.color" variant="subtle">
                {{ priorityMeta.label }}
              </UBadge>
              <UBadge v-if="task.isImportant" color="warning" variant="subtle" size="xs" class="font-medium inline-flex items-center gap-1">
                <svg class="size-2.5 fill-amber-500 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Important
              </UBadge>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Assigned to</p>
            <p class="mt-1 text-sm">{{ assigneeLabel }}</p>
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
