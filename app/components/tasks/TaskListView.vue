<script lang="ts" setup>
import type { TaskRecord, TaskStatus } from '~/types/task'
import { groupTasksByStatus } from '~/utils/taskListUpdates'
import { TASK_PRIORITY_OPTIONS } from '~/utils/taskPriority'
import { formatTaskBudget, formatTaskDate } from '~/utils/taskFormat'

const props = defineProps<{
  tasks: TaskRecord[]
  disabled?: boolean
  isEventCancelled?: boolean
  selectedTaskId?: string | null
  collapsedGroups: Partial<Record<TaskStatus, boolean>>
  updatingTaskId?: string | null
}>()

const emit = defineEmits<{
  'toggle-group': [status: TaskStatus]
  select: [task: TaskRecord]
  edit: [task: TaskRecord]
  cancel: [task: TaskRecord]
  restore: [task: TaskRecord]
  remove: [task: TaskRecord]
  'status-change': [payload: { taskId: string; status: TaskStatus }]
  'priority-change': [payload: { taskId: string; priority: number }]
}>()

const statusSections: { status: TaskStatus; label: string }[] = [
  { status: 'ONGOING', label: 'Ongoing' },
  { status: 'COMPLETED', label: 'Completed' },
  { status: 'CANCELLED', label: 'Cancelled' },
]

const statusOptions = [
  { label: 'Ongoing', value: 'ONGOING' },
  { label: 'Completed', value: 'COMPLETED' },
]

function canCancelTask(task: TaskRecord): boolean {
  return !props.isEventCancelled && !props.disabled && task.status !== 'CANCELLED'
}

function canRemoveTask(): boolean {
  return Boolean(props.isEventCancelled)
}

function canRestoreTask(task: TaskRecord): boolean {
  return !props.isEventCancelled && !props.disabled && task.status === 'CANCELLED'
}

const grouped = computed(() => groupTasksByStatus(props.tasks))

function isGroupCollapsed(status: TaskStatus): boolean {
  return Boolean(props.collapsedGroups[status])
}

function onRowClick(task: TaskRecord, event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('select, button, [data-row-action]')) {
    return
  }
  emit('select', task)
}
</script>

<template>
  <div class="w-full overflow-x-auto rounded-lg border border-default bg-white shadow-sm">
    <table class="w-full min-w-[48rem] text-left text-sm">
      <thead>
        <tr class="border-b border-default bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <th class="min-w-[16rem] px-4 py-2">Work</th>
          <th class="min-w-[7rem] whitespace-nowrap px-4 py-2">Priority</th>
          <th class="min-w-[8rem] whitespace-nowrap px-4 py-2">Status</th>
          <th class="min-w-[7rem] whitespace-nowrap px-4 py-2">Budget</th>
          <th class="min-w-[7rem] whitespace-nowrap px-4 py-2">Deadline</th>
          <th class="min-w-[6rem] whitespace-nowrap px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="section in statusSections" :key="section.status">
          <tr class="border-b border-default bg-muted/20">
            <td colspan="6" class="px-2 py-1.5">
              <button
                type="button"
                class="flex w-full items-center gap-2 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted hover:text-default"
                @click="emit('toggle-group', section.status)"
              >
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 transition-transform"
                  :class="!isGroupCollapsed(section.status) ? 'rotate-90' : ''"
                />
                <span>{{ section.label }}</span>
                <UBadge variant="subtle" color="neutral" size="sm">
                  {{ grouped[section.status].length }}
                </UBadge>
              </button>
            </td>
          </tr>

          <template v-if="!isGroupCollapsed(section.status)">
            <tr
              v-for="task in grouped[section.status]"
              :key="task._id"
              class="cursor-pointer border-b border-default/60 transition hover:bg-muted/20"
              :class="[
                updatingTaskId === task._id ? 'opacity-60' : '',
                selectedTaskId === task._id ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : '',
              ]"
              @click="onRowClick(task, $event)"
            >
              <td class="px-4 py-3 align-top">
                <div class="font-medium">{{ task.title }}</div>
                <p class="mt-0.5 line-clamp-2 text-xs text-muted">
                  {{ task.details }}
                </p>
              </td>
              <td class="px-4 py-3 align-top">
                <USelect
                  :model-value="task.priority"
                  :items="TASK_PRIORITY_OPTIONS"
                  value-key="value"
                  label-key="label"
                  size="sm"
                  class="min-w-[8.5rem]"
                  :disabled="disabled || updatingTaskId === task._id"
                  @update:model-value="emit('priority-change', { taskId: task._id, priority: Number($event) })"
                  @click.stop
                />
              </td>
              <td class="px-4 py-3 align-top">
                <UBadge
                  v-if="task.status === 'CANCELLED'"
                  variant="subtle"
                  color="neutral"
                >
                  Cancelled
                </UBadge>
                <USelect
                  v-else
                  :model-value="task.status"
                  :items="statusOptions"
                  value-key="value"
                  label-key="label"
                  size="sm"
                  class="min-w-[8.5rem]"
                  :disabled="disabled || updatingTaskId === task._id"
                  @update:model-value="emit('status-change', { taskId: task._id, status: $event as TaskStatus })"
                  @click.stop
                />
              </td>
              <td class="whitespace-nowrap px-4 py-3 align-top text-muted">
                {{ formatTaskBudget(task.budget) }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 align-top text-muted">
                {{ formatTaskDate(task.deadline) ?? '—' }}
              </td>
              <td class="px-4 py-3 align-top" data-row-action>
                <div class="flex items-center gap-1">
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    aria-label="Edit task"
                    :disabled="disabled"
                    @click.stop="emit('edit', task)"
                  />
                  <UButton
                    v-if="canRestoreTask(task)"
                    size="xs"
                    variant="ghost"
                    color="primary"
                    icon="i-lucide-undo-2"
                    aria-label="Restore task"
                    @click.stop="emit('restore', task)"
                  />
                  <UButton
                    v-if="canCancelTask(task)"
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
              </td>
            </tr>
            <tr v-if="grouped[section.status].length === 0">
              <td colspan="6" class="px-4 py-6 text-center text-sm text-muted">
                No {{ section.label.toLowerCase() }} tasks
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>
