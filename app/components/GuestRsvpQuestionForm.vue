<script lang="ts" setup>
import type { EventQuestion } from '~/types/event'
import type { GuestAnswerMap } from '~/utils/guestRsvpValidation'
import { questionAnswerKey } from '~/utils/guestRsvpValidation'

const props = defineProps<{
  questions: EventQuestion[]
  attendanceStatus: 'GOING' | 'NOT_GOING' | null
  answerMap: GuestAnswerMap
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:attendanceStatus': [value: 'GOING' | 'NOT_GOING' | null]
  'update:answerMap': [value: GuestAnswerMap]
}>()

const attendanceOptions = [
  { label: 'Yes, I will attend', value: 'GOING' as const },
  { label: 'No, I cannot attend', value: 'NOT_GOING' as const },
]

function updateAnswer(question: EventQuestion, value: string | boolean | null) {
  const key = questionAnswerKey(question)
  emit('update:answerMap', {
    ...props.answerMap,
    [key]: value,
  })
}

function textAnswer(question: EventQuestion): string {
  const value = props.answerMap[questionAnswerKey(question)]
  return typeof value === 'string' ? value : ''
}

function yesNoAnswer(question: EventQuestion): string | null {
  const value = props.answerMap[questionAnswerKey(question)]
  if (value === true) {
    return 'yes'
  }
  if (value === false) {
    return 'no'
  }
  return null
}

function optionsAnswer(question: EventQuestion): string | null {
  const value = props.answerMap[questionAnswerKey(question)]
  return typeof value === 'string' && value.trim() ? value : null
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
          emit('update:attendanceStatus', ($event as 'GOING' | 'NOT_GOING' | undefined) ?? null)
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
        v-if="question.type === 'TEXT'"
        :model-value="textAnswer(question)"
        class="w-full"
        placeholder="Your answer"
        :disabled="disabled"
        @update:model-value="updateAnswer(question, $event)"
      />

      <URadioGroup
        v-else-if="question.type === 'OPTIONS'"
        :model-value="optionsAnswer(question) ?? undefined"
        :items="(question.options ?? []).map((option) => ({ label: option, value: option }))"
        :disabled="disabled"
        @update:model-value="updateAnswer(question, ($event as string) ?? '')"
      />

      <URadioGroup
        v-else-if="question.type === 'YES/NO'"
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
    </UPageCard>
  </div>
</template>
