<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reportApiError } from '~/types/auth'
import type { VoucherRecord } from '~/types/voucher'

definePageMeta({
  layout: 'partner-navbar'
})

const toast = useToast()
const { listVouchers, createVoucher, updateVoucher, deactivateVoucher, reactivateVoucher, deleteVoucher } = useVouchers()

const schema = z.object({
  code: z.string().min(1, 'Enter a voucher code'),
  discountAmountPhp: z.coerce.number().int().positive('Discount must be greater than zero').max(1000, 'Discount cannot exceed 1000'),
  maxUses: z.union([z.coerce.number().int().positive('Max uses must be greater than zero'), z.literal(''), z.null()]).optional(),
  expiresAt: z.string().optional()
})

type VoucherFormSchema = z.output<typeof schema>

const vouchers = ref<VoucherRecord[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const editingId = ref<string | null>(null)

const state = reactive<VoucherFormSchema>({
  code: '',
  discountAmountPhp: 0,
  maxUses: '',
  expiresAt: ''
})

const isEditing = computed(() => Boolean(editingId.value))

function resetForm() {
  editingId.value = null
  state.code = ''
  state.discountAmountPhp = 0
  state.maxUses = ''
  state.expiresAt = ''
}

function applyVoucherToForm(voucher: VoucherRecord) {
  editingId.value = voucher._id
  state.code = voucher.code
  state.discountAmountPhp = voucher.discountAmountPhp
  state.maxUses = voucher.maxUses ?? ''
  state.expiresAt = voucher.expiresAt ? voucher.expiresAt.slice(0, 10) : ''
}

function normalizePayload() {
  return {
    code: state.code.trim().toUpperCase(),
    discountAmountPhp: Number(state.discountAmountPhp),
    maxUses: state.maxUses === '' || state.maxUses == null ? null : Number(state.maxUses),
    expiresAt: state.expiresAt?.trim() ? state.expiresAt : null
  }
}

async function loadVouchers() {
  isLoading.value = true
  try {
    const response = await listVouchers()
    vouchers.value = response.vouchers
  } catch (error) {
    reportApiError(toast, { title: 'Could not load vouchers', error })
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<VoucherFormSchema>) {
  if (isSaving.value) {
    return
  }

  isSaving.value = true
  try {
    state.code = event.data.code.trim().toUpperCase()
    const payload = normalizePayload()
    const response = editingId.value
      ? await updateVoucher(editingId.value, payload)
      : await createVoucher(payload)

    toast.add({
      title: editingId.value ? 'Voucher updated' : 'Voucher created',
      description: response.message
    })

    resetForm()
    await loadVouchers()
  } catch (error) {
    reportApiError(toast, { title: 'Could not save voucher', error })
  } finally {
    isSaving.value = false
  }
}

async function toggleVoucher(voucher: VoucherRecord) {
  try {
    const response = voucher.isActive
      ? await deactivateVoucher(voucher._id)
      : await reactivateVoucher(voucher._id)
    toast.add({
      title: voucher.isActive ? 'Voucher deactivated' : 'Voucher reactivated',
      description: response.message
    })
    await loadVouchers()
  } catch (error) {
    reportApiError(toast, { title: 'Could not update voucher status', error })
  }
}

async function removeVoucher(voucher: VoucherRecord) {
  try {
    const response = await deleteVoucher(voucher._id)
    toast.add({ title: 'Voucher deleted', description: response.message })
    if (editingId.value === voucher._id) {
      resetForm()
    }
    await loadVouchers()
  } catch (error) {
    reportApiError(toast, { title: 'Could not delete voucher', error })
  }
}

onMounted(loadVouchers)
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <UPageHeader
      title="Partner Vouchers"
      description="Create promo codes for clients and manage voucher availability."
    />

    <UPageGrid class="items-start">
      <UPageCard class="white-bread-container">
        <template #header>
          <div>
            <h2 class="font-semibold text-lg">{{ isEditing ? 'Edit voucher' : 'Create voucher' }}</h2>
            <p class="text-sm text-muted">Discounts are applied during Bread + Butter checkout.</p>
          </div>
        </template>

        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="Voucher code" name="code" required>
            <UInput v-model="state.code" class="w-full uppercase" placeholder="e.g. BLINK5" />
          </UFormField>
          <UFormField label="Discount amount (PHP)" name="discountAmountPhp" required>
            <UInput v-model="state.discountAmountPhp" type="number" class="w-full" min="1" max="1000" />
          </UFormField>
          <UFormField label="Max uses" name="maxUses" hint="Optional">
            <UInput v-model="state.maxUses" type="number" class="w-full" min="1" />
          </UFormField>
          <UFormField label="Expiration date" name="expiresAt" hint="Optional">
            <UInput v-model="state.expiresAt" type="date" class="w-full" />
          </UFormField>

          <div class="flex flex-wrap justify-end gap-2">
            <UButton v-if="isEditing" type="button" color="neutral" variant="ghost" @click="resetForm">
              Cancel
            </UButton>
            <UButton type="submit" :loading="isSaving">
              {{ isEditing ? 'Save changes' : 'Create voucher' }}
            </UButton>
          </div>
        </UForm>
      </UPageCard>

      <UPageCard class="white-bread-container col-span-2">
        <template #header>
          <div>
            <h2 class="font-semibold text-lg">Your vouchers</h2>
            <p class="text-sm text-muted">Track code usage and switch vouchers on or off as needed.</p>
          </div>
        </template>

        <div v-if="isLoading" class="py-12 text-center text-muted">
          Loading vouchers...
        </div>
        <div v-else-if="vouchers.length === 0" class="py-12 text-center text-muted">
          No vouchers yet.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="voucher in vouchers"
            :key="voucher._id"
            class="flex flex-col gap-4 rounded-xl border border-bread-300/60 p-4 md:flex-row md:items-start md:justify-between"
          >
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-lg font-semibold">{{ voucher.code }}</div>
                <UBadge :label="voucher.isActive ? 'Active' : 'Inactive'" :color="voucher.isActive ? 'success' : 'neutral'" variant="soft" />
              </div>
              <div class="text-sm text-muted">
                Discount: <span class="font-medium text-default">Php {{ voucher.discountAmountPhp.toLocaleString() }}</span>
              </div>
              <div class="text-sm text-muted">
                Uses: {{ voucher.useCount ?? 0 }}<span v-if="voucher.maxUses"> / {{ voucher.maxUses }}</span>
              </div>
              <div class="text-sm text-muted">
                Expires: {{ voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString() : 'No expiration' }}
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton color="neutral" variant="outline" icon="i-lucide-pencil" @click="applyVoucherToForm(voucher)">
                Edit
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                :icon="voucher.isActive ? 'i-lucide-pause-circle' : 'i-lucide-play-circle'"
                @click="toggleVoucher(voucher)"
              >
                {{ voucher.isActive ? 'Deactivate' : 'Reactivate' }}
              </UButton>
              <UButton color="error" variant="soft" icon="i-lucide-trash-2" @click="removeVoucher(voucher)">
                Delete
              </UButton>
            </div>
          </div>
        </div>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>

<style></style>
