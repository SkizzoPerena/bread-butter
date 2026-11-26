<script lang="ts" setup>
import type { UserAccount } from '~/types/auth'

/**
 * Tells a partner their account is waiting for approval, or was not approved. Shows nothing
 * once they're approved, so approved partners see their pages exactly as before.
 */
const { fetchAccount } = usePartnerAccount()
const account = ref<UserAccount | null>(null)

const status = computed(() => account.value?.approvalStatus ?? 'APPROVED')

onMounted(async () => {
  try {
    account.value = await fetchAccount()
  } catch {
    // Without the account we can't tell, so show nothing rather than a wrong notice.
    account.value = null
  }
})
</script>

<template>
  <UAlert
    v-if="status === 'PENDING'"
    color="warning"
    variant="subtle"
    icon="i-lucide-clock"
    title="Your account is being reviewed"
    description="You can already create vouchers. Clients can use them once our team approves your account, and we'll email you when that happens."
  />
  <UAlert
    v-else-if="status === 'REJECTED'"
    color="error"
    variant="subtle"
    icon="i-lucide-circle-x"
    title="Your account was not approved"
    :description="`${account?.approvalRejectionReason ? `Reason: ${account.approvalRejectionReason}. ` : ''}Your vouchers can't be used. Reach us through the Contact Us page if you think this is a mistake.`"
  />
</template>
