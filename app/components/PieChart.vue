<script setup lang="ts">
import {
  ArcElement,
  Chart,
  Legend,
  PieController,
  Tooltip
} from 'chart.js'
import type { ChartSlice } from '~/types/event'

Chart.register(ArcElement, PieController, Tooltip, Legend)

const props = withDefaults(defineProps<{
  title: string
  data: ChartSlice[]
  colors?: string[]
  size?: 'default' | 'compact'
}>(), {
  colors: () => [
    '#9c3500',
    '#c38566',
    '#d7ae99',
    '#af5d32',
    '#7c2a00',
    '#ebd6cc'
  ],
  size: 'default',
})

const isCompact = computed(() => props.size === 'compact')

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function buildChart() {
  if (!canvasRef.value) {
    return
  }

  chart?.destroy()

  if (!props.data.length) {
    return
  }

  chart = new Chart(canvasRef.value, {
    type: 'pie',
    data: {
      labels: props.data.map(item => item.label),
      datasets: [{
        data: props.data.map(item => item.value),
        backgroundColor: props.data.map((_, index) => props.colors[index % props.colors.length]),
        borderWidth: 1,
        borderColor: '#fefbf7'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: isCompact.value ? 10 : 12,
            padding: isCompact.value ? 8 : 12,
            font: {
              size: isCompact.value ? 11 : 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = Number(context.parsed)
              const total = props.data.reduce((sum, item) => sum + item.value, 0)
              const percent = total > 0 ? Math.round((value / total) * 100) : 0
              return `${context.label}: ${value.toLocaleString()} (${percent}%)`
            }
          }
        }
      }
    }
  })
}

watch(() => [props.data, props.size], buildChart, { deep: true })

onMounted(buildChart)
onBeforeUnmount(() => {
  chart?.destroy()
})
</script>

<template>
  <div :class="isCompact ? 'space-y-2' : 'space-y-3'">
    <div
      :class="isCompact
        ? 'text-sm font-medium text-highlighted'
        : 'font-serif text-base text-toast-700'"
    >
      {{ title }}
    </div>
    <div
      v-if="!data.length"
      class="flex items-center justify-center rounded-lg border border-dashed border-bread-300 text-muted"
      :class="isCompact
        ? 'px-3 py-2 text-xs'
        : 'px-4 py-5 text-sm'"
    >
      No data yet
    </div>
    <div
      v-else
      :class="isCompact ? 'h-32' : 'h-40'"
    >
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>
