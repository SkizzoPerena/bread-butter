<script lang="ts" setup>
import type { PriorityFilterValue } from '~/utils/taskPriority'
import { PRIORITY_FILTER_OPTIONS } from '~/utils/taskPriority'

type SortBy = 'deadline' | 'priority'

const searchQuery = defineModel<string>('searchQuery', { required: true })
const priorityFilter = defineModel<PriorityFilterValue>('priorityFilter', { required: true })
const sortBy = defineModel<SortBy>('sortBy', { required: true })

const showFilters = ref(false)

const hasActiveFilters = computed(() => priorityFilter.value !== 'all')

const sortOptions = [
  { label: 'Deadline', value: 'deadline' },
  { label: 'Priority', value: 'priority' },
]

</script>

<template>
  <div class="rounded-lg border border-default bg-white px-2.5 py-2 sm:px-3 shadow-sm">
    <div class="flex items-center gap-2">
      <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto md:overflow-visible">
        <UInput
          v-model="searchQuery"
          type="search"
          placeholder="Search tasks..."
          icon="i-lucide-search"
          class="w-44 shrink-0 sm:w-52 md:w-64 lg:w-72"
          size="sm"
        />

        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-filter"
          :class="showFilters ? 'ring-1 ring-primary/40' : ''"
          @click="showFilters = !showFilters"
        >
          Filter
          <span
            v-if="hasActiveFilters"
            class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary"
            aria-hidden
          />
          <UIcon
            name="i-lucide-chevron-down"
            class="size-3.5 transition-transform"
            :class="showFilters ? 'rotate-180' : ''"
          />
        </UButton>
      </div>
    </div>

    <div
      class="grid transition-[grid-template-rows] duration-200 ease-in-out"
      :class="showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <div
          v-show="showFilters"
          class="mt-2 flex flex-wrap items-center gap-2 border-t border-default pt-2"
        >
          <USelect
            v-model="priorityFilter"
            :items="PRIORITY_FILTER_OPTIONS"
            value-key="value"
            label-key="label"
            size="sm"
            class="min-w-[10rem]"
          />
          <USelect
            v-model="sortBy"
            :items="sortOptions"
            value-key="value"
            label-key="label"
            size="sm"
            class="min-w-[9rem]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
