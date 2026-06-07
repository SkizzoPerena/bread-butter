<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import type { TaskRecord } from '~/types/task'
import { reportApiError } from '~/types/auth'
import { TASK_PRIORITY_OPTIONS } from '~/utils/taskPriority'
import { formatTaskDate } from '~/utils/taskFormat'
import type { AssigneeSelectItem } from '~/utils/taskAssignee'
import {
  calendarDateFromDateValue,
  calendarDateToUtcIso,
  parseIsoToCalendarDate,
} from '~/utils/taskFormat'

const props = defineProps<{
  eventId: string
  eventRecord: EventRecord | null
  task?: TaskRecord | null
  assigneeSelectItems?: AssigneeSelectItem[]
  disabled?: boolean
}>()

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  saved: []
}>()

const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { createTask, updateTaskDetails, updateTaskBudget, updateTaskPriority, updateTaskAssignee } = useTasks()

const isEditMode = computed(() => Boolean(props.task))
const isSubmitting = ref(false)

const df = new DateFormatter('en-US', { dateStyle: 'medium' })
const minDeadline = today(getLocalTimeZone())

const taskSchema = z.object({
  title: z.string().min(1, 'Task name is required'),
  details: z.string().min(1, 'Description is required'),
  budget: z.coerce.number().min(0, 'Budget must be zero or greater'),
  priority: z.coerce.number().int().min(1).max(5),
})

type TaskSchema = z.output<typeof taskSchema>

const formState = reactive<TaskSchema>({
  title: '',
  details: '',
  budget: 0,
  priority: 3,
})

const deadlineDate = shallowRef<CalendarDate | null>(null)
const imageFiles = ref<File[]>([])
const keptImageUrls = ref<string[]>([])
const assigneeId = ref<string | null>(null)

const modalTitle = computed(() => (isEditMode.value ? 'Edit Task' : 'Add New Task'))

function resetForm() {
  formState.title = ''
  formState.details = ''
  formState.budget = 0
  formState.priority = 3
  deadlineDate.value = null
  imageFiles.value = []
  keptImageUrls.value = []
  assigneeId.value = null
}

function loadTask(task: TaskRecord) {
  formState.title = task.title
  formState.details = task.details
  formState.budget = task.budget
  formState.priority = task.priority
  deadlineDate.value = parseIsoToCalendarDate(task.deadline)
  keptImageUrls.value = (task.attachedFileURLs ?? [])
    .map((file) => file.fileURL)
    .filter(Boolean)
  imageFiles.value = []
  assigneeId.value = task.assignee?._id ?? null
}

watch(
  open,
  (isOpen) => {
    if (!isOpen) {
      return
    }
    if (props.task) {
      loadTask(props.task)
    } else {
      resetForm()
    }
  }
)

function validateDeadline(): string | null {
  if (!deadlineDate.value) {
    return 'Deadline is required'
  }
  const deadlineIso = calendarDateToUtcIso(deadlineDate.value)
  const eventDate = props.eventRecord?.eventDate
  if (eventDate) {
    const eventDay = new Date(eventDate)
    const deadlineDay = new Date(deadlineIso)
    if (!Number.isNaN(eventDay.getTime()) && !Number.isNaN(deadlineDay.getTime())) {
      const eventUtc = Date.UTC(eventDay.getUTCFullYear(), eventDay.getUTCMonth(), eventDay.getUTCDate())
      const deadlineUtc = Date.UTC(
        deadlineDay.getUTCFullYear(),
        deadlineDay.getUTCMonth(),
        deadlineDay.getUTCDate()
      )
      if (deadlineUtc >= eventUtc) {
        return 'Deadline must be before the event date'
      }
    }
  }
  return null
}

async function handleSubmit(event: FormSubmitEvent<TaskSchema>) {
  if (props.disabled) {
    return
  }

  let deadlineIso: string | undefined
  if (!isEditMode.value) {
    const deadlineError = validateDeadline()
    if (deadlineError) {
      toast.add({ title: 'Invalid deadline', description: deadlineError, color: 'error' })
      return
    }
    deadlineIso = calendarDateToUtcIso(deadlineDate.value!)
  }

  isSubmitting.value = true

  try {
    if (isEditMode.value && props.task) {
      await updateTaskDetails(
        props.task._id,
        {
          title: event.data.title,
          details: event.data.details,
          keepImageURLs: keptImageUrls.value,
        },
        imageFiles.value
      )

      if (props.task.budget !== event.data.budget) {
        await updateTaskBudget(props.task._id, event.data.budget)
      }
      if (props.task.priority !== event.data.priority) {
        await updateTaskPriority(props.task._id, event.data.priority)
      }
      const previousAssigneeId = props.task.assignee?._id ?? null
      if (previousAssigneeId !== assigneeId.value) {
        await updateTaskAssignee(props.task._id, assigneeId.value)
      }
    } else {
      await createTask(
        {
          eventId: props.eventId || (isUiOnlyMode.value ? 'mock-event-id' : ''),
          title: event.data.title,
          details: event.data.details,
          budget: event.data.budget,
          priority: event.data.priority,
          deadline: deadlineIso!,
          assigneeId: assigneeId.value,
        },
        imageFiles.value
      )
    }

    toast.add({
      title: isEditMode.value ? 'Task updated' : 'Task created',
      color: 'success',
    })
    open.value = false
    emit('saved')
  } catch (error) {
    reportApiError(toast, {
      title: isEditMode.value ? 'Could not update task' : 'Could not create task',
      error,
    })
  } finally {
    isSubmitting.value = false
  }
}

function removeKeptImage(url: string) {
  keptImageUrls.value = keptImageUrls.value.filter((entry) => entry !== url)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :ui="{
      header: 'bg-toast-400 border-none',
      title: 'text-white font-serif text-xl',
      content: 'border-none ring-transparent w-full max-w-lg',
      overlay: 'bg-toast-900/30',
    }"
    :close="{ variant: 'link', class: 'rounded-full text-white' }"
    :dismissible="!isSubmitting"
  >
    <template #body>
      <UForm
        :schema="taskSchema"
        :state="formState"
        class="space-y-4"
        @submit="handleSubmit"
      >
        <UFormField label="Task name" name="title" required>
          <UInput v-model="formState.title" class="w-full" placeholder="Set an appointment" :disabled="disabled" />
        </UFormField>

        <UFormField label="Description" name="details" required>
          <UTextarea
            v-model="formState.details"
            class="w-full"
            placeholder="Drop your notes here"
            :disabled="disabled"
          />
        </UFormField>

        <div class="grid gap-2 sm:grid-cols-3">
          <UFormField label="Priority" name="priority" required>
            <USelect
              v-model="formState.priority"
              :items="TASK_PRIORITY_OPTIONS"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="disabled"
            />
          </UFormField>
          <UFormField label="Budget (PHP)" name="budget" required>
            <UInputNumber
              v-model="formState.budget"
              :increment="false"
              :decrement="false"
              class="w-full"
              :disabled="disabled"
            />
          </UFormField>
          <UFormField label="Deadline" :required="!isEditMode">
            <template v-if="isEditMode">
              <p class="text-sm text-muted py-2">
                {{ formatTaskDate(task?.deadline) ?? 'No deadline' }}
              </p>
            </template>
            <UPopover v-else>
              <UButton
                color="neutral"
                variant="outline"
                class="w-full"
                :disabled="disabled"
              >
                {{
                  deadlineDate
                    ? df.format(deadlineDate.toDate(getLocalTimeZone()))
                    : 'Select a date'
                }}
              </UButton>
              <template #content="{ close }">
                <UCalendar
                  :model-value="deadlineDate"
                  :min-value="minDeadline"
                  class="p-2"
                  @update:model-value="(value) => { deadlineDate = calendarDateFromDateValue(value as import('@internationalized/date').DateValue | null); close() }"
                />
              </template>
            </UPopover>
          </UFormField>
        </div>

        <UFormField label="Assigned to" name="assignee">
          <USelect
            v-model="assigneeId"
            :items="assigneeSelectItems ?? [{ label: 'Me', value: null }]"
            value-key="value"
            label-key="label"
            class="w-full"
            :disabled="disabled"
          />
        </UFormField>

        <UFormField label="Supplementary File / Photo" class="w-full">
          <UFileUpload
            v-model="imageFiles"
            multiple
            accept="image/*"
            size="xl"
            variant="area"
            label="Drop images here"
            description="PNG, JPG or GIF"
            :disabled="disabled"
          />
        </UFormField>

        <div v-if="keptImageUrls.length > 0" class="flex flex-wrap gap-2">
          <div
            v-for="url in keptImageUrls"
            :key="url"
            class="relative"
          >
            <img :src="url" alt="" class="h-16 w-16 rounded object-cover ring ring-default">
            <UButton
              icon="i-lucide-x"
              size="xs"
              color="error"
              variant="solid"
              class="absolute -right-1 -top-1"
              :disabled="disabled"
              @click="removeKeptImage(url)"
            />
          </div>
        </div>

        <UButton
          type="submit"
          block
          class="mt-2"
          :loading="isSubmitting"
          :disabled="disabled"
        >
          {{ isEditMode ? 'Save changes' : 'Add task' }}
        </UButton>
      </UForm>
    </template>
  </UModal>
</template>
