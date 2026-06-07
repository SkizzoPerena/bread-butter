<script lang="ts" setup>
import { shallowRef } from 'vue'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { EventRecord } from '~/types/event'
import { reportApiError } from '~/types/auth'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Tasks',
  bgClass: 'bg-rose-50'
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { setActiveEvent } = useActiveEvent()

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const eventRecord = ref<EventRecord | null>(null)
const isLoadingEvent = ref(false)

const isEventCancelled = computed(() => eventRecord.value?.status === 'CANCELLED')

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

// Using standard Nuxt UI UTable columns format
const columns = [
  { accessorKey: 'title', header: 'Task' },
  { accessorKey: 'priority', header: 'Priority' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'budget', header: 'Budget' },
  { accessorKey: 'deadline', header: 'Deadline' },
  { accessorKey: 'actions', header: '' }
]

const taskPriorities = ['Urgent', 'Medium', 'Low']
const taskStatuses = [
  { label: 'To Do', value: 'TODO'},
  { label: 'Ongoing', value: 'ONGOING'},
  { label: 'Completed', value: 'COMPLETED'}
]

const tasks = ref([
  {
    id: 'mock-task-0',
    title: 'Book a live band',
    details: 'Find and book a live band for the reception.',
    budget: 50000,
    status: 'TODO',
    priority: 'Medium',
    deadline: '2026-08-15T00:00:00.000Z',
  },
  {
    id: 'mock-task-1',
    title: 'Book a photo booth',
    details: 'Find and book a photo booth service for the reception.',
    budget: 20000,
    status: 'ONGOING',
    priority: 'Urgent',
    deadline: '2026-06-15T00:00:00.000Z',
  },
  {
    id: 'mock-task-2',
    title: 'Finalize catering menu',
    details: 'Confirm final menu choices with the caterer.',
    budget: 15000,
    status: 'ONGOING',
    priority: 'Low',
    deadline: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'mock-task-3',
    title: 'Send wedding invitations',
    details: 'Design, print, and mail invitations.',
    budget: 10000,
    status: 'COMPLETED',
    priority: 'Medium',
    deadline: '2026-05-01T00:00:00.000Z',
  },
])

function getPriorityTheme(priority: string) {
  if (priority === 'Urgent') return 'bg-error-50 text-error-600 ring-1 ring-inset ring-error-500/20 focus:ring-2 focus:ring-error-500'
  if (priority === 'Medium') return 'bg-secondary-50 text-secondary-600 ring-1 ring-inset ring-secondary-500/20 focus:ring-2 focus:ring-secondary-500'
  return 'bg-success-50 text-success-600 ring-1 ring-inset ring-success-500/20 focus:ring-2 focus:ring-success-500'
}

function getStatusTheme(status: string) {
  if (status === 'TODO') return 'bg-error-100 text-error-600 ring-1 ring-inset ring-error-500/20 focus:ring-2 focus:ring-error-500'
  if (status === 'ONGOING') return 'bg-warning-50 text-warning-600 ring-1 ring-inset ring-warning-500/20 focus:ring-2 focus:ring-warning-500'
  if (status === 'COMPLETED') return 'bg-success-50 text-success-600 ring-1 ring-inset ring-success-500/20 focus:ring-2 focus:ring-success-500 '
  return 'bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-500/20 focus:ring-2 focus:ring-neutral-500'
}

function getStatusLabel(status: string) {
  if (status === 'TODO') return 'To Do'
  if (status === 'ONGOING') return 'Ongoing'
  if (status === 'COMPLETED') return 'Completed'
  return status
}

const selectedTab = ref(0)

const tabItems = computed(() => {
  const todoCount = tasks.value.filter(t => t.status === 'TODO').length
  const ongoingCount = tasks.value.filter(t => t.status === 'ONGOING').length
  const completedCount = tasks.value.filter(t => t.status === 'COMPLETED').length
  return [
    { label: `To Do (${todoCount})`, value: 0 },
    { label: `Ongoing (${ongoingCount})`, value: 1 },
    { label: `Completed (${completedCount})`, value: 2 }
  ]
})

const filteredTasks = computed(() => {
  const statuses = ['TODO', 'ONGOING', 'COMPLETED']
  return tasks.value.filter(t => t.status === statuses[selectedTab.value])
})

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const modelValue = shallowRef<CalendarDate | undefined>(undefined)

const newTask = ref({
  title: '',
  details: '',
  priority: 'Medium',
  budget: 0,
  status: 'TODO'
})

const editingTask = ref<any>(null)

function openAddModal() {
  newTask.value = { title: '', details: '', priority: 'Medium', budget: 0, status: 'TODO' }
  modelValue.value = undefined
  isAddModalOpen.value = true
}

function submitNewTask() {
  tasks.value.push({
    id: `task-${Date.now()}`,
    title: newTask.value.title,
    details: newTask.value.details,
    priority: newTask.value.priority,
    budget: newTask.value.budget,
    status: newTask.value.status,
    deadline: modelValue.value ? modelValue.value.toDate(getLocalTimeZone()).toISOString() : ''
  })
  isAddModalOpen.value = false
}

function editTask(task: any) {
  editingTask.value = { ...task }
  if (task.deadline) {
    const d = new Date(task.deadline)
    modelValue.value = new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  } else {
    modelValue.value = undefined
  }
  isEditModalOpen.value = true
}

function submitEditTask() {
  const index = tasks.value.findIndex(t => t.id === editingTask.value.id)
  if (index !== -1) {
    tasks.value[index] = {
      ...editingTask.value,
      deadline: modelValue.value ? modelValue.value.toDate(getLocalTimeZone()).toISOString() : ''
    }
  }
  isEditModalOpen.value = false
}

function removeTask(task: any) {
  tasks.value = tasks.value.filter(t => t.id !== task.id)
}


async function loadEventData() {
  if (!eventId.value && !isUiOnlyMode.value) {
    eventRecord.value = null
    return
  }

  const targetEventId = eventId.value || 'mock-event-id'
  isLoadingEvent.value = true

  try {
    const detail = await loadPageData({
      fetch: async () => fetchEvent(targetEventId),
      mock: () => ({
        event: {
          _id: targetEventId,
          eventType: 'WEDDING',
          eventName: "Jane & John's Wedding",
          description: 'Mock event',
          venue: 'Manila Cathedral',
          eventDate: '2026-05-18T00:00:00.000Z',
          status: 'ONGOING',
        } satisfies EventRecord,
      }),
    })
    eventRecord.value = detail.event
    setActiveEvent(detail.event)
  } catch (error) {
    reportApiError(toast, { title: 'Could not load event', error })
  } finally {
    isLoadingEvent.value = false
  }
}

onMounted(() => {
  if (!eventId.value && !isUiOnlyMode.value) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    navigateTo('/UserDashboard')
    return
  }
  loadEventData()
})

watch(eventId, () => {
  loadEventData()
})
</script>

<template>
  <UContainer class="space-y-6 py-8 pb-12">

    <ClientOnly>
      <Teleport to="#navbar-actions">
        <UButton icon="i-lucide-plus" color="rose" @click="openAddModal" :disabled="isEventCancelled">
          Add Task
        </UButton>
      </Teleport>
    </ClientOnly>

    <div
      v-if="isLoadingEvent"
      class="flex items-center justify-center py-16 text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading event...</span>
    </div>

    <UPageCard
      v-else
      class="white-bread-container"
    >

      <div class="pt-2">
        <UTabs v-model="selectedTab" :items="tabItems" color="rose" :ui="{ list:'bg-rose-100 dark:bg-rose-800', content: 'hidden' }" />
      </div>

      <UTable :data="filteredTasks" :columns="columns" class="w-full">
        <!-- Work Column -->
        <template #title-cell="{ row }">
          <div class="font-medium text-toast-700">{{ row.original.title }}</div>
          <div class="text-sm text-muted truncate max-w-xs">{{ row.original.details }}</div>
        </template>

        <!-- Priority Column -->
        <template #priority-cell="{ row }">
          <USelect
          size="sm"  v-model="row.original.priority"
            :items="taskPriorities"
            variant="none"
            :disabled="isEventCancelled"
            :class="['font-medium rounded-full transition-colors', getPriorityTheme(row.original.priority)]"
          />
        </template>

        <!-- Status Column -->
        <template #status-cell="{ row }">
          <USelect
          size="sm"
            v-model="row.original.status"
            :items="taskStatuses"
            variant="none"
            :disabled="isEventCancelled"
            :class="['font-medium rounded-full transition-colors', getStatusTheme(row.original.status)]"
          />
        </template>

        <!-- Budget Column -->
        <template #budget-cell="{ row }">
          <div class="whitespace-nowrap">
            Php {{ row.original.budget ? row.original.budget.toLocaleString() : '0' }}
          </div>
        </template>

        <!-- Deadline Column -->
        <template #deadline-cell="{ row }">
          <div v-if="row.original.deadline" class="whitespace-nowrap text-sm">
            {{ df.format(new Date(row.original.deadline)) }}
          </div>
          <span v-else class="">-</span>
        </template>

        <!-- Actions Column -->
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-2">
            <UButton color="warning" variant="ghost" icon="i-lucide-pencil" size="sm" @click="editTask(row.original)" :disabled="isEventCancelled" aria-label="Edit task" />
            <UButton color="error" variant="ghost" icon="i-lucide-trash" size="sm" @click="removeTask(row.original)" :disabled="isEventCancelled" aria-label="Remove task" />
          </div>
        </template>
      </UTable>

      <!-- Unified Form Modal Template for Add / Edit -->
      <UModal v-model:open="isAddModalOpen" title="Add New Task" :ui="{ header: 'bg-rose-500 border-none', title: 'text-white font-serif text-xl', content: 'border-none ring-transparent max-w-md w-full' }" :close="{ variant: 'link', class: 'rounded-full text-white' }">
        <template #body>
          <UForm :state="newTask" class="space-y-4" @submit.prevent="submitNewTask">
            <UFormField label="Task name" name="title" required><UInput v-model="newTask.title" class="w-full" placeholder="e.g. Set an appointment" /></UFormField>
            <UFormField label="Description" name="details"><UTextarea v-model="newTask.details" class="w-full" placeholder="Drop your notes here" /></UFormField>
            <div class="flex gap-4">
              <UFormField label="Priority" name="priority" required class="flex-1">
                <USelect v-model="newTask.priority" :items="taskPriorities" variant="none" :class="['w-full font-medium rounded-md transition-colors', getPriorityTheme(newTask.priority)]" />
              </UFormField>
              <UFormField label="Status" name="status" required class="flex-1">
                <USelect v-model="newTask.status" :items="taskStatuses" variant="none" :class="['w-full font-medium rounded-md transition-colors', getStatusTheme(newTask.status)]" />
              </UFormField>
            </div>
            <div class="flex gap-4">
              <UFormField label="Budget" name="budget" class="flex-1"><UInputNumber v-model="newTask.budget" :increment="false" :decrement="false" class="w-full" placeholder="Php" /></UFormField>
              <UFormField label="Deadline" name="date" class="flex-1"><UPopover><UButton color="neutral" variant="outline" class="w-full justify-between" icon="i-lucide-calendar">{{ modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Select date' }}</UButton><template #content="{ close }"><UCalendar v-model="modelValue" class="p-2" @update:model-value="close" /></template></UPopover></UFormField>
            </div>
            <UButton type="submit" color="rose" size="lg" block class="mt-4">Add Task</UButton>
          </UForm>
        </template>
      </UModal>

      <UModal v-model:open="isEditModalOpen" title="Edit Task" :ui="{ header: 'bg-rose-500 border-none', title: 'text-white font-serif text-xl', content: 'border-none ring-transparent max-w-md w-full' }" :close="{ variant: 'link', class: 'rounded-full text-white' }">
        <template #body>
          <UForm v-if="editingTask" :state="editingTask" class="space-y-4" @submit.prevent="submitEditTask">
            <UFormField label="Task name" name="title" required><UInput v-model="editingTask.title" class="w-full" /></UFormField>
            <UFormField label="Description" name="details"><UTextarea v-model="editingTask.details" class="w-full" /></UFormField>
            <div class="flex gap-4">
              <UFormField label="Priority" name="priority" required class="flex-1">
                <USelect v-model="editingTask.priority" :items="taskPriorities" variant="none" :class="['w-full font-medium rounded-md transition-colors', getPriorityTheme(editingTask.priority)]" />
              </UFormField>
              <UFormField label="Status" name="status" required class="flex-1">
                <USelect v-model="editingTask.status" :items="taskStatuses" variant="none" :class="['w-full font-medium rounded-md transition-colors', getStatusTheme(editingTask.status)]" />
              </UFormField>
            </div>
            <div class="flex gap-4">
              <UFormField label="Budget" name="budget" class="flex-1"><UInputNumber v-model="editingTask.budget" :increment="false" :decrement="false" class="w-full" /></UFormField>
              <UFormField label="Deadline" name="date" class="flex-1"><UPopover><UButton color="neutral" variant="outline" class="w-full justify-between" icon="i-lucide-calendar">{{ modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Select date' }}</UButton><template #content="{ close }"><UCalendar v-model="modelValue" class="p-2" @update:model-value="close" /></template></UPopover></UFormField>
            </div>
            <div class="flex justify-end pt-4 gap-3"><UButton type="button" color="neutral" variant="ghost" @click="isEditModalOpen = false">Cancel</UButton><UButton type="submit" color="rose" size="lg">Save Changes</UButton></div>
          </UForm>
        </template>
      </UModal>
    </UPageCard>
  </UContainer>
</template>
