<script lang="ts" setup>
import type { EventQuestion } from '~/types/event'
import { reportApiError } from '~/types/auth'

type DraftQuestion = {
  id: number
  question: string
  type: string
  options: string[]
}

const QUESTION_TYPES = [
  { label: 'Text (open-ended)', value: 'TEXT' },
  { label: 'Multiple choice', value: 'OPTIONS' },
  { label: 'Yes / No', value: 'YES/NO' },
]

const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u

const props = defineProps<{
  eventId: string
  initialQuestions: EventQuestion[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()
const { updateEventQuestions } = useEventQuestions()

const mode = ref<'edit' | 'preview'>('edit')
const isSubmitting = ref(false)
const questions = ref<DraftQuestion[]>([])

function makeBlankQuestion(): DraftQuestion {
  return { id: Date.now() + Math.random(), question: '', type: '', options: ['', ''] }
}

function seedFromProps() {
  if (props.initialQuestions.length) {
    questions.value = props.initialQuestions.map((q, i) => ({
      id: Date.now() + i,
      question: q.question,
      type: q.type,
      options: q.type === 'OPTIONS' && q.options?.length ? [...q.options] : ['', ''],
    }))
  } else {
    questions.value = [makeBlankQuestion()]
  }
  mode.value = 'edit'
}

watch(open, (isOpen) => {
  if (isOpen) seedFromProps()
})

function addQuestion() {
  questions.value.push(makeBlankQuestion())
}

function removeQuestion(id: number) {
  if (questions.value.length > 1) {
    questions.value = questions.value.filter((q) => q.id !== id)
  }
}

function addOption(q: DraftQuestion) {
  q.options.push('')
}

function removeOption(q: DraftQuestion, index: number) {
  if (q.options.length > 2) {
    q.options.splice(index, 1)
  }
}

function validate(): string | null {
  if (!questions.value.length) return 'Add at least one question.'
  for (const [i, q] of questions.value.entries()) {
    const n = i + 1
    if (!q.question.trim()) return `Question ${n}: question text is required.`
    if (EMOJI_RE.test(q.question)) return `Question ${n}: question text must not contain emojis.`
    if (!q.type) return `Question ${n}: question type is required.`
    if (q.type === 'OPTIONS') {
      const filled = q.options.filter((o) => o.trim().length > 0)
      if (filled.length < 2) return `Question ${n}: at least two non-empty options are required.`
      for (const o of q.options) {
        if (o.trim() && EMOJI_RE.test(o)) return `Question ${n}: option text must not contain emojis.`
      }
    }
  }
  return null
}

function buildPayload(): EventQuestion[] {
  return questions.value.map((q) => ({
    question: q.question.trim(),
    type: q.type,
    ...(q.type === 'OPTIONS'
      ? { options: q.options.map((o) => o.trim()).filter(Boolean) }
      : {}),
  }))
}

async function handleSave() {
  if (mode.value === 'preview') {
    mode.value = 'edit'
    return
  }
  const error = validate()
  if (error) {
    toast.add({ title: 'Validation error', description: error, color: 'error' })
    return
  }
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await updateEventQuestions(props.eventId, buildPayload())
    toast.add({ title: 'Questions saved', description: 'RSVP questions have been updated.', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err) {
    reportApiError(toast, { title: 'Could not save questions', error: err })
  } finally {
    isSubmitting.value = false
  }
}

const previewQuestions = computed(() =>
  questions.value.filter((q) => q.question.trim() && q.type)
)
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
    fullscreen
    :ui="{
      header: 'bg-toast-400 border-none',
      title: 'text-white font-serif text-xl',
      content: 'border-none ring-transparent',
    }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full gap-4">
        <h3 class="text-white font-serif text-xl font-semibold truncate">
          RSVP Questions
        </h3>
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            :icon="mode === 'edit' ? 'i-lucide-eye' : 'i-lucide-pencil'"
            :label="mode === 'edit' ? 'Preview' : 'Back to Edit'"
            size="sm"
            color="neutral"
            variant="outline"
            class="text-white border-white/40 hover:bg-white/10"
            :disabled="isSubmitting"
            @click="mode = mode === 'edit' ? 'preview' : 'edit'"
          />
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            class="text-white hover:bg-white/10"
            :disabled="isSubmitting"
            @click="open = false"
          />
        </div>
      </div>
    </template>

    <template #body>
      <!-- Edit mode -->
      <div v-if="mode === 'edit'" class="max-w-5xl mx-auto py-6 px-4">
        <div class="grid gap-6 lg:grid-cols-3">
          <!-- Instructions -->
          <div class="space-y-4">
            <UPageCard>
              <h4 class="font-semibold text-base mb-1">Building your RSVP form</h4>
              <USeparator class="my-3" />
              <ul class="text-sm text-muted space-y-2 list-disc list-inside">
                <li>Add questions guests will answer when they respond to your invitation.</li>
                <li>Choose <strong>Text</strong> for open-ended answers.</li>
                <li>Choose <strong>Multiple choice</strong> and provide at least two options.</li>
                <li>Choose <strong>Yes / No</strong> for simple confirmations.</li>
                <li>No emojis are allowed in any field.</li>
              </ul>
              <p class="text-xs text-muted mt-4">
                Saving will replace all existing questions for this event.
              </p>
            </UPageCard>
          </div>

          <!-- Questions -->
          <div class="lg:col-span-2 space-y-4">
            <UPageCard
              v-for="(q, index) in questions"
              :key="q.id"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="font-semibold text-sm">Question {{ index + 1 }}</span>
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="error"
                  :disabled="questions.length <= 1"
                  @click="removeQuestion(q.id)"
                />
              </div>

              <div class="space-y-3">
                <UFormField label="Question text" :name="`q_${index}_text`" required>
                  <UInput
                    v-model="q.question"
                    class="w-full"
                    placeholder="e.g. Do you have any dietary restrictions?"
                  />
                </UFormField>

                <UFormField label="Answer type" :name="`q_${index}_type`" required>
                  <USelect
                    v-model="q.type"
                    :items="QUESTION_TYPES"
                    value-key="value"
                    label-key="label"
                    class="w-full"
                    placeholder="Select a type"
                  />
                </UFormField>

                <!-- Options (only for OPTIONS type) -->
                <div v-if="q.type === 'OPTIONS'" class="pt-1">
                  <p class="text-sm font-medium mb-2">
                    Options
                    <span class="text-muted font-normal">(at least two required)</span>
                  </p>
                  <div
                    v-for="(_, optIndex) in q.options"
                    :key="optIndex"
                    class="flex items-center gap-2 mb-2"
                  >
                    <span class="text-muted text-sm w-5 shrink-0 text-right">{{ optIndex + 1 }}.</span>
                    <UInput
                      v-model="q.options[optIndex]"
                      class="flex-1"
                      :placeholder="`Option ${optIndex + 1}`"
                    />
                    <UButton
                      icon="i-lucide-trash-2"
                      size="xs"
                      variant="ghost"
                      color="error"
                      :disabled="q.options.length <= 2"
                      @click="removeOption(q, optIndex)"
                    />
                  </div>
                  <UButton
                    size="sm"
                    variant="outline"
                    icon="i-lucide-plus"
                    block
                    class="mt-1"
                    @click="addOption(q)"
                  >
                    Add option
                  </UButton>
                </div>

                <!-- YES/NO helper -->
                <div v-else-if="q.type === 'YES/NO'" class="pt-1">
                  <p class="text-sm text-muted">
                    Guests will choose between <strong>Yes</strong> and <strong>No</strong>.
                  </p>
                </div>

                <!-- TEXT helper -->
                <div v-else-if="q.type === 'TEXT'" class="pt-1">
                  <p class="text-sm text-muted">
                    Guests will type a free-text answer.
                  </p>
                </div>
              </div>
            </UPageCard>

            <UButton
              variant="subtle"
              icon="i-lucide-square-plus"
              block
              @click="addQuestion"
            >
              Add new question
            </UButton>
          </div>
        </div>
      </div>

      <!-- Preview mode -->
      <div v-else class="max-w-2xl mx-auto py-6 px-4">
        <p class="text-sm text-muted mb-6 text-center">
          This is how your RSVP questions will appear to guests. Fields are disabled for preview.
        </p>

        <div v-if="previewQuestions.length" class="space-y-6">
          <UPageCard
            v-for="(q, index) in previewQuestions"
            :key="q.id"
          >
            <p class="text-sm font-semibold mb-3">
              {{ index + 1 }}. {{ q.question }}
            </p>

            <!-- TEXT preview -->
            <UTextarea
              v-if="q.type === 'TEXT'"
              disabled
              placeholder="Guest's answer…"
              class="w-full opacity-60"
            />

            <!-- OPTIONS preview -->
            <div v-else-if="q.type === 'OPTIONS'" class="space-y-2">
              <label
                v-for="(opt, oi) in q.options.filter(o => o.trim())"
                :key="oi"
                class="flex items-center gap-3 cursor-not-allowed opacity-70"
              >
                <span class="w-4 h-4 rounded-full border-2 border-muted shrink-0 flex items-center justify-center">
                  <span class="w-2 h-2 rounded-full bg-transparent" />
                </span>
                <span class="text-sm">{{ opt }}</span>
              </label>
              <p v-if="!q.options.filter(o => o.trim()).length" class="text-xs text-muted italic">
                No options added yet.
              </p>
            </div>

            <!-- YES/NO preview -->
            <div v-else-if="q.type === 'YES/NO'" class="flex gap-6">
              <label class="flex items-center gap-2 cursor-not-allowed opacity-70">
                <span class="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
                <span class="text-sm">Yes</span>
              </label>
              <label class="flex items-center gap-2 cursor-not-allowed opacity-70">
                <span class="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
                <span class="text-sm">No</span>
              </label>
            </div>
          </UPageCard>
        </div>

        <UPageCard v-else class="text-center text-muted text-sm py-10">
          No valid questions to preview. Go back to edit and fill in at least one question.
        </UPageCard>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          color="neutral"
          :disabled="isSubmitting"
          @click="open = false"
        >
          Cancel
        </UButton>
        <UButton
          v-if="mode === 'edit'"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="handleSave"
        >
          Save Questions
        </UButton>
        <UButton
          v-else
          variant="outline"
          @click="mode = 'edit'"
        >
          Back to Edit
        </UButton>
      </div>
    </template>
  </UModal>
</template>
