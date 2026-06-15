<script lang="ts" setup>
import type { TaskRecord, TaskStatus } from '~/types/task'
import { groupTasksByStatus } from '~/utils/taskListUpdates'
import { groupTasksByDeadlineMonth } from '~/utils/taskDeadlineGroups'
import { TASK_PRIORITY_OPTIONS } from '~/utils/taskPriority'
import { formatTaskDate } from '~/utils/taskFormat'

const props = defineProps<{
  tasks: TaskRecord[]
  disabled?: boolean
  selectedTaskId?: string | null
  collapsedGroups: Partial<Record<TaskStatus, boolean>>
  updatingTaskId?: string | null
}>()

const emit = defineEmits<{
  'toggle-group': [status: TaskStatus]
  select: [task: TaskRecord]
  edit: [task: TaskRecord]
  remove: [task: TaskRecord]
  'move-to-todo': [task: TaskRecord]
  'status-change': [payload: { taskId: string; status: TaskStatus }]
  'priority-change': [payload: { taskId: string; priority: number }]
  'add-task': []
}>()

const statusSections: { status: TaskStatus; label: string; dotClass: string }[] = [
  { status: 'TODO', label: 'To Do', dotClass: 'bg-error' },
  { status: 'ONGOING', label: 'Ongoing', dotClass: 'bg-primary' },
  { status: 'COMPLETED', label: 'Completed', dotClass: 'bg-success' },
]

const statusOptions = [
  { label: 'To Do', value: 'TODO' },
  { label: 'Ongoing', value: 'ONGOING' },
  { label: 'Completed', value: 'COMPLETED' },
]

function canDeleteTask(task: TaskRecord): boolean {
  return !props.disabled && task.status === 'TODO'
}

function canMoveToTodo(task: TaskRecord): boolean {
  return !props.disabled && (task.status === 'ONGOING' || task.status === 'COMPLETED')
}

const grouped = computed(() => groupTasksByStatus(props.tasks))

const isEmpty = computed(() => props.tasks.length === 0)

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
  <div
    v-if="isEmpty"
    class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 px-6 py-14 text-center"
  >
    <UIcon name="i-lucide-list-todo" class="size-10 text-muted" />
    <p class="mt-4 text-base font-medium">No tasks yet</p>
    <p class="mt-1 max-w-sm text-sm text-muted">
      Add a task to start tracking work for this event.
    </p>
    <UButton
      v-if="!disabled"
      icon="i-lucide-list-plus"
      class="mt-6"
      @click="emit('add-task')"
    >
      Add New Task
    </UButton>
  </div>

  <div
    v-else
    class="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-default bg-white shadow-sm [-webkit-overflow-scrolling:touch]"
  >
    <table class="w-full min-w-[44rem] text-left text-sm lg:min-w-full">
      <thead>
        <tr class="border-b border-default bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <th class="min-w-[16rem] px-4 py-2 lg:min-w-[18rem]">Work</th>
          <th class="min-w-[7rem] whitespace-nowrap px-4 py-2">Priority</th>
          <th class="min-w-[8rem] whitespace-nowrap px-4 py-2">Status</th>
          <th class="min-w-[7rem] whitespace-nowrap px-4 py-2">Deadline</th>
          <th class="min-w-[6rem] whitespace-nowrap px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="section in statusSections" :key="section.status">
          <tr class="border-y border-default bg-muted/40">
            <td colspan="5" class="px-4 py-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-default hover:text-highlighted"
                @click="emit('toggle-group', section.status)"
              >
                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-3.5 text-muted transition-transform"
                  :class="isGroupCollapsed(section.status) ? '-rotate-90' : ''"
                />
                <span
                  class="inline-block size-2 rounded-full"
                  :class="section.dotClass"
                />
                <span>{{ section.label }}</span>
                <span class="font-normal text-muted">({{ grouped[section.status].length }})</span>
              </button>
            </td>
          </tr>

          <template v-if="!isGroupCollapsed(section.status)">
            <template
              v-for="deadlineGroup in groupTasksByDeadlineMonth(grouped[section.status])"
              :key="`${section.status}-${deadlineGroup.key}`"
            >
              <tr class="border-b border-default/30 bg-muted/20">
                <td colspan="5" class="px-4 py-1.5">
                  <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
                    {{ deadlineGroup.label }}
                    <span class="font-normal normal-case">({{ deadlineGroup.tasks.length }})</span>
                  </h3>
                </td>
              </tr>

              <tr
                v-for="task in deadlineGroup.tasks"
                :key="task._id"
                class="cursor-pointer border-b border-default/40 transition-colors duration-100 hover:bg-primary/10 hover:shadow-[inset_3px_0_0_0_var(--ui-primary)]"
                :class="[
                  updatingTaskId === task._id ? 'opacity-60' : '',
                  selectedTaskId === task._id ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : '',
                ]"
                @click="onRowClick(task, $event)"
              >
                <td class="max-w-[20rem] px-4 py-2 align-middle sm:max-w-none">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      data-row-action
                      class="shrink-0 text-[11px] font-medium text-primary hover:underline"
                      @click.stop="emit('edit', task)"
                    >
                      {{ task._id.slice(-6) }}
                    </button>
                    <button
                      type="button"
                      data-row-action
                      class="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-primary"
                      @click.stop="emit('edit', task)"
                    >
                      {{ task.title }}
                    </button>
                  </div>
                  <p
                    v-if="task.details"
                    class="mt-0.5 truncate text-[11px] text-muted"
                  >
                    {{ task.details }}
                  </p>
                </td>
                <td class="whitespace-nowrap px-4 py-2 align-middle">
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
                <td class="whitespace-nowrap px-4 py-2 align-middle">
                  <USelect
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
                <td class="whitespace-nowrap px-4 py-2 align-middle text-muted">
                  {{ formatTaskDate(task.deadline) ?? '—' }}
                </td>
                <td class="px-4 py-2 align-middle" data-row-action>
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
                      v-if="canMoveToTodo(task)"
                      size="xs"
                      variant="ghost"
                      icon="i-lucide-list-todo"
                      aria-label="Move to To Do"
                      @click.stop="emit('move-to-todo', task)"
                    />
                    <UButton
                      v-if="canDeleteTask(task)"
                      size="xs"
                      variant="ghost"
                      color="error"
                      icon="i-lucide-trash-2"
                      aria-label="Delete task"
                      @click.stop="emit('remove', task)"
                    />
                  </div>
                </td>
              </tr>
            </template>

            <tr v-if="grouped[section.status].length === 0">
              <td colspan="5" class="px-4 py-2 text-xs italic text-muted">
                No tasks
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>
