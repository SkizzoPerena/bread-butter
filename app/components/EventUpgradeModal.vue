<script setup lang="ts">
import type { EventRecord } from '~/types/event'
import { formatEventPriceTier } from '~/types/event'
import { isEventFullyPaid, isTierUpgradePending, getPendingUpgradeTargetName } from '~/types/payment'

export interface LockedDashboardItem {
  label: string
  icon?: string
  action?: string
  description?: string
  bgClass?: string
}

const props = withDefaults(
  defineProps<{
    item?: LockedDashboardItem | null
    event?: EventRecord | null
    eventId?: string
  }>(),
  {
    item: null,
    event: null,
    eventId: '',
  }
)

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const { isUiOnlyMode } = useApiMode()

const resolvedEventId = computed(() => {
  return props.eventId || props.event?._id || ''
})

const isUpgradePending = computed(() => isTierUpgradePending(props.event))
const pendingUpgradeTargetName = computed(() => getPendingUpgradeTargetName(props.event))
const isFullyPaid = computed(() => (props.event ? isEventFullyPaid(props.event) : true))

const currentPlanName = computed(() => {
  if (props.event) return formatEventPriceTier(props.event)
  return 'Bread'
})

const featureTitle = computed(() => props.item?.label || 'Premium Feature')
const featureIcon = computed(() => props.item?.icon || 'i-lucide-lock')
const featureDescription = computed(() => {
  if (props.item?.description) return props.item.description
  return 'This tool is exclusively available on higher event plans.'
})

function handleUpgradeClick() {
  open.value = false
  const id = resolvedEventId.value || (isUiOnlyMode.value ? 'mock-event-id' : '')

  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    return
  }

  if (!isUiOnlyMode.value && props.event && !isFullyPaid.value) {
    navigateTo({ path: '/event/payment-review', query: { eventId: id } })
    return
  }

  if (!isUiOnlyMode.value && isUpgradePending.value) {
    toast.add({
      title: 'Upgrade pending review',
      description: pendingUpgradeTargetName.value
        ? `Your upgrade to ${pendingUpgradeTargetName.value} is being verified.`
        : 'Your upgrade payment is being verified.',
      color: 'warning',
    })
  }

  navigateTo({ path: '/event/upgrade', query: { eventId: id } })
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl' }">
    <template #content>
      <div class="relative p-5 sm:p-6 space-y-5 bg-linear-to-b from-amber-50/60 to-white">
        <!-- Close button -->
        <button type="button"
          class="absolute top-4 right-4 text-toast-400 hover:text-toast-700 transition-colors p-1 rounded-lg hover:bg-toast-100/50 cursor-pointer"
          aria-label="Close" @click="open = false">
          <UIcon name="i-lucide-x" class="size-5" />
        </button>

        <!-- Header -->
        <div class="flex items-start gap-3.5 pr-6">
          <div
            class="size-12 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
            <UIcon name="i-lucide-sparkles" class="size-6 text-white" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-serif font-bold text-toast-900">
                Unlock {{ featureTitle }}
              </h3>
            </div>
            <p class="text-xs sm:text-sm text-toast-700/80 mt-0.5">
              Available on the <span class="font-semibold text-toast-900">Butter</span> and <span
                class="font-semibold text-toast-900">Bread + Butter</span> packages.
            </p>
          </div>
        </div>

        <!-- Locked Feature Spotlight Card -->
        <div class="bg-toast-50/80 border border-toast-200/80 rounded-xl p-3.5 flex items-center gap-3.5">
          <div class="size-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            :class="item?.bgClass || 'bg-amber-500 text-white'">
            <UIcon :name="featureIcon" class="size-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm text-toast-900 truncate">{{ featureTitle }}</span>
              <UBadge color="warning" variant="subtle" size="xs" class="text-[10px] font-medium shrink-0">
                Locked
              </UBadge>
            </div>
            <p class="text-xs text-toast-700/85 mt-0.5 leading-snug line-clamp-2">
              {{ featureDescription }}
            </p>
          </div>
        </div>

        <!-- Package Benefits Grid -->
        <div class="space-y-2.5">
          <div class="text-xs font-semibold uppercase tracking-wider text-toast-600">
            What you get with higher plans
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-toast-800">
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white border border-toast-100 shadow-2xs">
              <UIcon name="i-lucide-check-circle" class="size-4 text-emerald-600 shrink-0" />
              <span>Tasks Checklist & Assignees</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white border border-toast-100 shadow-2xs">
              <UIcon name="i-lucide-check-circle" class="size-4 text-emerald-600 shrink-0" />
              <span>Day-of Schedules & Itinerary</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white border border-toast-100 shadow-2xs">
              <UIcon name="i-lucide-check-circle" class="size-4 text-emerald-600 shrink-0" />
              <span>Suppliers & Vendor Contacts</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white border border-toast-100 shadow-2xs">
              <UIcon name="i-lucide-check-circle" class="size-4 text-emerald-600 shrink-0" />
              <span>Canonical Church Requirements</span>
            </div>
          </div>
        </div>

        <!-- Current Plan vs Upgrade Callout -->
        <div
          class="flex items-center justify-between p-3 rounded-xl bg-amber-100/60 border border-amber-200/60 text-xs text-toast-900">
          <div>
            <span class="text-muted">Current Plan:</span>
            <span class="font-bold ml-1">{{ currentPlanName }}</span>
          </div>
          <div class="font-medium text-amber-900">
            Upgrade starts at <span class="font-bold">Php 2,500</span>
          </div>
        </div>

        <!-- Pending upgrade alert if active -->
        <UAlert v-if="isUpgradePending" color="warning" variant="subtle" icon="i-lucide-clock"
          title="Upgrade Pending Verification"
          :description="pendingUpgradeTargetName ? `Your upgrade to ${pendingUpgradeTargetName} is being verified.` : 'Your upgrade is pending approval.'" />

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2.5 pt-1">
          <UButton color="neutral" variant="ghost" size="sm" @click="open = false">
            Maybe Later
          </UButton>
          <UButton color="warning" variant="solid" size="sm" icon="i-lucide-sparkles"
            class="font-semibold shadow-sm text-black" @click="handleUpgradeClick">
            {{ isUpgradePending ? 'View Pending Upgrade' : 'Upgrade Plan' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
