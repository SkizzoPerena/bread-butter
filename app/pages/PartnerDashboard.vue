<script lang="ts" setup>
import { pageColumns } from '#build/ui'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'partner-navbar'
})

const partnerName = 'BlinkPunch' // Mock partner name

const financialStats = ref([
  {
    label: 'Total Earnings',
    value: '₱125,500',
    icon: 'i-lucide-wallet',
  },
  {
    label: 'Pending Payout',
    value: '₱15,000',
    icon: 'i-lucide-timer',
  },
  {
    label: 'Total Referrals',
    value: '25',
    icon: 'i-lucide-users-round',
  },
])

interface Referral {
  clientName: string
  event: string
  status: string
  date: string

}

const referralColumns: TableColumn<Referral>[] = [
  { accessorKey: 'clientName', header: 'Client Name' },
  { accessorKey: 'event', header: 'Event' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'commission', header: 'Commission' },
  { accessorKey: 'date', header: 'Date' },
]

const data = ref<Referral[]>([
  {
    clientName: 'John & Jane Doe',
    event: 'Wedding',
    status: 'Completed',
        date: '2024-05-15',
  },
  {
    clientName: 'Alice Smith',
    event: 'Debut',
    status: 'Booked',
    date: '2024-06-20',
  },
  {
    clientName: 'Bob Johnson',
    event: 'Anniversary',
    status: 'Booked',
    date: '2024-07-01',
  },
  {
    clientName: 'Charlie Brown',
    event: 'Birthday',
    status: 'Pending',
    date: '2024-07-10',
  },
])
</script>

<template><div class="h-screen flex align-center justify-center bg-toast-500">
  <UContainer class="space-y-8 text-whit">
    <UPageHeader
      :title="`Welcome, ${partnerName}!`"
      description="Here's a summary of your activity and earnings."
      :ui="{ title: 'font-serif text-white', description: 'text-bread-400' }"
      class="border-0"
    />

    <UPageGrid>
      <UPageCard
        v-for="(stat, index) in financialStats"
        :key="index"
        :title="stat.label"
        :icon="stat.icon"
        class="bread-container bg-toast-700"
        :ui="{title: 'text-white', leadingIcon: 'text-toast-300'}"
      >
        <template #description>
          <span class="text-3xl font-bold font-serif  text-bread-400">{{ stat.value }}</span>
        </template>
      </UPageCard>
    </UPageGrid>

    <UPageCard class="bread-container bg-toast-700">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="font-semibold text-xl text-white font-serif">
            Your Referrals
          </h2>
          <UButton icon="i-lucide-download" class="ml-3">
            Export
          </UButton>
        </div>
      </template>

      <UTable :rows="data" :columns="referralColumns" :ui="{th:'text-white', separator:'bg-toast-900', empty:'text-bread-400'}"/>
    </UPageCard>
  </UContainer>
  </div>
</template>

<style scoped></style>