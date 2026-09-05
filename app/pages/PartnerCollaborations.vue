<script lang="ts" setup>
import { reportApiError } from '~/types/auth'
import type { CollaborationInvite } from '~/types/collaboration'

definePageMeta({
  layout: 'partner-navbar'
})

const toast = useToast()
const { listIncomingCollaborations, acceptCollaboration, denyCollaboration } = useCollaborations()

const collaborations = ref<CollaborationInvite[]>([])
const isLoading = ref(true)
const activeInviteId = ref<string | null>(null)

async function loadCollaborations() {
  isLoading.value = true
  try {
    const response = await listIncomingCollaborations()
    collaborations.value = response.collaborations
  } catch (error) {
    reportApiError(toast, { title: 'Could not load collaboration invites', error })
  } finally {
    isLoading.value = false
  }
}

async function handleAccept(invite: CollaborationInvite) {
  activeInviteId.value = invite._id
  try {
    const response = await acceptCollaboration(invite._id)
    toast.add({
      title: 'Invite accepted',
      description: response.message
    })
    await loadCollaborations()
  } catch (error) {
    reportApiError(toast, { title: 'Could not accept invite', error })
  } finally {
    activeInviteId.value = null
  }
}

async function handleDeny(invite: CollaborationInvite) {
  activeInviteId.value = invite._id
  try {
    const response = await denyCollaboration(invite._id)
    toast.add({
      title: 'Invite denied',
      description: response.message
    })
    await loadCollaborations()
  } catch (error) {
    reportApiError(toast, { title: 'Could not deny invite', error })
  } finally {
    activeInviteId.value = null
  }
}

onMounted(loadCollaborations)
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <UPageHeader
      title="Collaborations"
      description="Review incoming event invites from clients and planners."
    />

    <div v-if="isLoading" class="py-12 text-center text-muted">
      Loading invites...
    </div>
    <div v-else-if="collaborations.length === 0" class="py-12 text-center text-muted">
      No pending collaboration invites.
    </div>
    <div v-else class="space-y-4">
      <UPageCard
        v-for="invite in collaborations"
        :key="invite._id"
        class="white-bread-container"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0 space-y-2">
            <div class="text-lg font-semibold">
              {{ invite.event?.eventName || 'Untitled event' }}
            </div>
            <div class="text-sm text-muted">
              Invited by:
              {{ invite.invitedBy ? `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`.trim() : 'Unknown sender' }}
            </div>
            <div class="text-sm text-muted">
              {{ invite.invitedBy?.email || 'No contact email available' }}
            </div>
            <div class="text-sm text-muted">
              {{ invite.event?.venue || 'Venue TBD' }}
              <span v-if="invite.event?.eventDate">
                • {{ new Date(invite.event.eventDate).toLocaleString() }}
              </span>
            </div>
            <UBadge
              v-if="invite.event?.status"
              :label="invite.event.status"
              color="neutral"
              variant="soft"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              color="success"
              icon="i-lucide-check"
              :loading="activeInviteId === invite._id"
              @click="handleAccept(invite)"
            >
              Accept
            </UButton>
            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-x"
              :loading="activeInviteId === invite._id"
              @click="handleDeny(invite)"
            >
              Deny
            </UButton>
          </div>
        </div>
      </UPageCard>
    </div>
  </UContainer>
</template>

<style></style>
