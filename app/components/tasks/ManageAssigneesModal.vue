<script lang="ts" setup>
import type { AssigneeRecord } from '~/types/assignee'
import { reportApiError } from '~/types/auth'

const props = defineProps<{
  eventId: string
  assignees: AssigneeRecord[]
  disabled?: boolean
}>()

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  changed: []
}>()

const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { createAssignee, updateAssignee, deleteAssignee } = useAssignees()

const newName = ref('')
const editingId = ref<string | null>(null)
const editingName = ref('')
const deletingId = ref<string | null>(null)
const isSubmitting = ref(false)

function resetForm() {
  newName.value = ''
  editingId.value = null
  editingName.value = ''
  deletingId.value = null
}

watch(open, (isOpen) => {
  if (!isOpen) {
    resetForm()
  }
})

function startEdit(assignee: AssigneeRecord) {
  editingId.value = assignee._id
  editingName.value = assignee.name
  deletingId.value = null
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
}

async function handleCreate() {
  const name = newName.value.trim()
  if (!name || props.disabled) {
    return
  }

  isSubmitting.value = true
  try {
    await createAssignee(props.eventId || (isUiOnlyMode.value ? 'mock-event-id' : ''), { name })
    newName.value = ''
    toast.add({ title: 'Assignee added', color: 'success' })
    emit('changed')
  } catch (error) {
    reportApiError(toast, { title: 'Could not add assignee', error })
  } finally {
    isSubmitting.value = false
  }
}

async function handleSaveEdit() {
  if (!editingId.value || props.disabled) {
    return
  }

  const name = editingName.value.trim()
  if (!name) {
    return
  }

  isSubmitting.value = true
  try {
    await updateAssignee(editingId.value, { name })
    cancelEdit()
    toast.add({ title: 'Assignee updated', color: 'success' })
    emit('changed')
  } catch (error) {
    reportApiError(toast, { title: 'Could not update assignee', error })
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDelete() {
  if (!deletingId.value || props.disabled) {
    return
  }

  isSubmitting.value = true
  try {
    const response = await deleteAssignee(deletingId.value)
    const note =
      response.tasksUpdated > 0
        ? ` ${response.tasksUpdated} task(s) were set to Me.`
        : ''
    toast.add({
      title: 'Assignee removed',
      description: `${response.message}${note}`,
      color: 'success',
    })
    deletingId.value = null
    emit('changed')
  } catch (error) {
    reportApiError(toast, { title: 'Could not remove assignee', error })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Manage Assignees"
    :dismissible="!isSubmitting"
    :ui="{
      header: 'bg-toast-400 border-none',
      title: 'text-white font-serif text-xl',
      content: 'border-none ring-transparent w-full max-w-md',
      overlay: 'bg-toast-900/30',
    }"
    :close="{ variant: 'link', class: 'rounded-full text-white' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Assignees appear in task cards and forms. Tasks without an assignee show as Me.
        </p>

        <div class="flex gap-2">
          <UInput
            v-model="newName"
            class="flex-1"
            placeholder="New assignee name"
            :disabled="disabled || isSubmitting"
            @keydown.enter.prevent="handleCreate"
          />
          <UButton
            icon="i-lucide-plus"
            :disabled="disabled || isSubmitting || !newName.trim()"
            :loading="isSubmitting && !editingId && !deletingId"
            @click="handleCreate"
          >
            Add
          </UButton>
        </div>

        <div
          v-if="assignees.length === 0"
          class="rounded-md border border-dashed border-default px-4 py-6 text-center text-sm text-muted"
        >
          No assignees yet.
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="assignee in assignees"
            :key="assignee._id"
            class="rounded-md border border-default px-3 py-2"
          >
            <div
              v-if="editingId === assignee._id"
              class="flex items-center gap-2"
            >
              <UInput
                v-model="editingName"
                class="flex-1"
                :disabled="disabled || isSubmitting"
                @keydown.enter.prevent="handleSaveEdit"
              />
              <UButton
                size="sm"
                :loading="isSubmitting"
                :disabled="disabled || !editingName.trim()"
                @click="handleSaveEdit"
              >
                Save
              </UButton>
              <UButton
                size="sm"
                variant="ghost"
                :disabled="isSubmitting"
                @click="cancelEdit"
              >
                Cancel
              </UButton>
            </div>

            <div
              v-else-if="deletingId === assignee._id"
              class="space-y-2"
            >
              <p class="text-sm">
                Remove <span class="font-medium">{{ assignee.name }}</span>?
                Tasks assigned to them will show as Me.
              </p>
              <div class="flex justify-end gap-2">
                <UButton
                  size="sm"
                  variant="outline"
                  :disabled="isSubmitting"
                  @click="deletingId = null"
                >
                  Back
                </UButton>
                <UButton
                  size="sm"
                  color="error"
                  :loading="isSubmitting"
                  @click="confirmDelete"
                >
                  Remove
                </UButton>
              </div>
            </div>

            <div
              v-else
              class="flex items-center justify-between gap-2"
            >
              <span class="text-sm font-medium">{{ assignee.name }}</span>
              <div class="flex items-center gap-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  aria-label="Edit assignee"
                  :disabled="disabled"
                  @click="startEdit(assignee)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  aria-label="Remove assignee"
                  :disabled="disabled"
                  @click="deletingId = assignee._id"
                />
              </div>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </UModal>
</template>
