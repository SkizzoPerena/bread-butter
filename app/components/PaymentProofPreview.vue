<script lang="ts" setup>
const props = defineProps<{
  url?: string | null
  label?: string
}>()

const isOpen = ref(false)

const proofUrl = computed(() => props.url?.trim() ?? '')
const hasProof = computed(() => proofUrl.value.length > 0)

const modalTitle = computed(() =>
  props.label?.trim()
    ? `Payment proof — ${props.label.trim()}`
    : 'Payment proof'
)

function openPreview() {
  if (hasProof.value) {
    isOpen.value = true
  }
}
</script>

<template>
  <div v-if="hasProof" class="mt-3">
    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
      Proof of payment
    </p>
    <button
      type="button"
      class="group block w-full max-w-[12rem] overflow-hidden rounded-lg border border-default bg-muted/20 text-left transition hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      @click="openPreview"
    >
      <img
        :src="proofUrl"
        alt="Payment proof preview"
        class="aspect-[4/3] w-full object-cover transition group-hover:opacity-90"
      >
      <span class="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted">
        <UIcon name="i-lucide-maximize-2" class="size-3.5" />
        View full image
      </span>
    </button>

    <UModal
      v-model:open="isOpen"
      :title="modalTitle"
      :ui="{ content: 'border-none ring-transparent max-w-3xl' }"
    >
      <template #body>
        <div class="flex flex-col items-center gap-4">
          <img
            :src="proofUrl"
            alt="Payment proof"
            class="w-full max-h-[70vh] rounded-lg bg-muted/20 object-contain"
          >
          <UButton
            label="Close"
            color="neutral"
            variant="outline"
            @click="isOpen = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
