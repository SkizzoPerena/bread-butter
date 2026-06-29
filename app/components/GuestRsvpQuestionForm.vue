<script lang="ts" setup>
import type { EventQuestion } from '~/types/event'
import type { GuestAnswerMap, GuestNotesMap } from '~/utils/guestRsvpValidation'
import { questionAnswerKey, questionNotesKey } from '~/utils/guestRsvpValidation'

defineProps<{
  questions: EventQuestion[]
  disabled?: boolean
}>()

const attendanceStatus = defineModel<'GOING' | 'NOT_GOING' | null>('attendanceStatus', {
  required: true,
})
const answerMap = defineModel<GuestAnswerMap>('answerMap', { required: true })
const notesMap = defineModel<GuestNotesMap>('notesMap', { required: true })

const attendanceOptions = [
  { label: 'Yes, I will attend', value: 'GOING' as const },
  { label: 'No, I cannot attend', value: 'NOT_GOING' as const },
]

function questionType(question: EventQuestion): string {
  return question.type.trim().toUpperCase()
}

function updateAnswer(question: EventQuestion, value: string | boolean | null) {
  const key = questionAnswerKey(question)
  answerMap.value = {
    ...answerMap.value,
    [key]: value,
  }
}

function updateNotes(question: EventQuestion, value: string | null | undefined) {
  const key = questionNotesKey(question)
  notesMap.value = {
    ...notesMap.value,
    [key]: typeof value === 'string' ? value : '',
  }
}

function textAnswer(question: EventQuestion): string {
  const value = answerMap.value[questionAnswerKey(question)]
  return typeof value === 'string' ? value : ''
}

function yesNoAnswer(question: EventQuestion): string | null {
  const value = answerMap.value[questionAnswerKey(question)]
  if (value === true) {
    return 'yes'
  }
  if (value === false) {
    return 'no'
  }
  return null
}

function optionsAnswer(question: EventQuestion): string | null {
  const value = answerMap.value[questionAnswerKey(question)]
  return typeof value === 'string' && value.trim() ? value : null
}

function notesAnswer(question: EventQuestion): string {
  return notesMap.value[questionNotesKey(question)] ?? ''
}

function notesPlaceholder(question: EventQuestion): string {
  return question.notes?.trim() || 'Notes (optional)'
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard class="space-y-4">
      <p class="text-lg font-semibold text-highlighted">Will you attend?</p>
      <URadioGroup
        :model-value="attendanceStatus ?? undefined"
        :items="attendanceOptions"
        :disabled="disabled"
        @update:model-value="
          attendanceStatus = (($event as 'GOING' | 'NOT_GOING' | undefined) ?? null)
        "
      />
    </UPageCard>

    <UPageCard
      v-for="(question, index) in questions"
      :key="`${question.question}-${index}`"
      class="space-y-4"
    >
      <p class="text-sm font-semibold">
        {{ index + 1 }}. {{ question.question }}
      </p>

      <UTextarea
        v-if="questionType(question) === 'TEXT'"
        :model-value="textAnswer(question)"
        class="w-full"
        placeholder="Your answer"
        :disabled="disabled"
        @update:model-value="updateAnswer(question, $event)"
      />

      <template v-else-if="questionType(question) === 'OPTIONS'">
        <URadioGroup
          :model-value="optionsAnswer(question) ?? undefined"
          :items="(question.options ?? []).map((option) => ({ label: option, value: option }))"
          :disabled="disabled"
          @update:model-value="updateAnswer(question, ($event as string) ?? '')"
        />
        <UTextarea
          :model-value="notesAnswer(question)"
          class="w-full"
          :placeholder="notesPlaceholder(question)"
          :disabled="disabled"
          maxlength="500"
          @update:model-value="updateNotes(question, $event)"
        />
      </template>

      <template v-else-if="questionType(question) === 'YES/NO'">
        <URadioGroup
          :model-value="yesNoAnswer(question) ?? undefined"
          :items="[
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]"
          :disabled="disabled"
          @update:model-value="
            updateAnswer(question, $event === 'yes' ? true : $event === 'no' ? false : null)
          "
        />
        <UTextarea
          :model-value="notesAnswer(question)"
          class="w-full"
          :placeholder="notesPlaceholder(question)"
          :disabled="disabled"
          maxlength="500"
          @update:model-value="updateNotes(question, $event)"
        />
      </template>
    </UPageCard>
  </div>
</template>
