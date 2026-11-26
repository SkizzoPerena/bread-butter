<script lang="ts" setup>
import type { EventRecord } from '~/types/event'
import type {
  CollaboratorRole,
  EventCollaboratorPerson,
  EventCollaboratorsResponse,
  EventInvite
} from '~/types/collaboration'
import { reportApiError } from '~/types/auth'
import { useApiRole } from '~/composables/useApiRole'
import { resolveEventTierCode } from '~/utils/eventTierFeatures'

/**
 * Who is helping plan an event: the host, collaborators, and coordinators (partners).
 * The host can invite people, cancel invites and remove anyone. Everyone else can leave.
 */
const props = defineProps<{
  eventId: string
  event: EventRecord | null
}>()

const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { role } = useApiRole()
const { user: viewer } = useAuth(role.value === 'partner' ? 'partner' : 'user')
const {
  listEventCollaborators,
  listEventInvites,
  inviteCollaborator,
  cancelEventInvite,
  removeCollaborator
} = useCollaborations()

// Collaboration is part of the Bread + Butter plan, the same rule the API applies.
const isUnlocked = computed(() => {
  const features = props.event?.allowedFeatures
  if (Array.isArray(features) && features.some(feature => String(feature).toLowerCase() === 'collaboration')) {
    return true
  }
  return resolveEventTierCode(props.event) === 'BREAD_BUTTER'
})

const isLoading = ref(false)
const roster = ref<EventCollaboratorsResponse | null>(null)
const invites = ref<EventInvite[]>([])

const sameEmail = (a?: string | null, b?: string | null) =>
  Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase())

const isOwner = computed(() => {
  if (isUiOnlyMode.value) return true
  if (role.value === 'partner') return false
  return sameEmail(roster.value?.owner?.email, viewer.value?.email)
})

const fullName = (person?: { firstName?: string, lastName?: string } | null) =>
  `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim()

interface Member {
  id: string
  name: string
  email: string
  kind: 'owner' | 'collaborator' | 'coordinator'
  joinedViaVoucher: boolean
  isSelf: boolean
}

const members = computed<Member[]>(() => {
  const data = roster.value
  if (!data) return []
  const list: Member[] = []
  if (data.owner) {
    list.push({
      id: data.owner._id,
      name: fullName(data.owner) || data.owner.email,
      email: data.owner.email,
      kind: 'owner',
      joinedViaVoucher: false,
      isSelf: sameEmail(data.owner.email, viewer.value?.email)
    })
  }
  for (const person of data.collaborators) {
    list.push({
      id: person._id,
      name: fullName(person) || person.email,
      email: person.email,
      kind: 'collaborator',
      joinedViaVoucher: false,
      isSelf: role.value !== 'partner' && sameEmail(person.email, viewer.value?.email)
    })
  }
  for (const partner of data.partnerCollaborators) {
    list.push({
      id: partner._id,
      name: fullName(partner) || partner.email,
      email: partner.email,
      kind: 'coordinator',
      joinedViaVoucher: partner.joinedVia === 'VOUCHER',
      isSelf: role.value === 'partner' && sameEmail(partner.email, viewer.value?.email)
    })
  }
  return list
})

async function load() {
  if (!props.eventId && !isUiOnlyMode.value) return
  if (!isUnlocked.value && !isUiOnlyMode.value) return
  isLoading.value = true
  try {
    roster.value = await listEventCollaborators(props.eventId)
    // Only the host manages invites, and partners have no access to that list.
    invites.value = isOwner.value ? (await listEventInvites(props.eventId)).invites ?? [] : []
  } catch (error) {
    reportApiError(toast, { title: 'Could not load collaborators', error })
  } finally {
    isLoading.value = false
  }
}

// Invite form
const inviteEmail = ref('')
const inviteRole = ref<CollaboratorRole>('USER')
const isInviting = ref(false)
const roleItems = [
  { label: 'Collaborator', value: 'USER', description: 'Family or friends helping you plan.' },
  { label: 'Coordinator', value: 'PARTNER', description: 'A wedding or event coordinator with a Dough Makers account.' }
]

async function submitInvite() {
  const email = inviteEmail.value.trim()
  if (!email) return
  isInviting.value = true
  try {
    const response = await inviteCollaborator(props.eventId, email, inviteRole.value)
    toast.add({ title: 'Invite sent', description: response.message })
    inviteEmail.value = ''
    await load()
  } catch (error) {
    reportApiError(toast, { title: 'Could not send invite', error })
  } finally {
    isInviting.value = false
  }
}

// Cancel an invite
const cancelingInviteId = ref<string | null>(null)

async function cancelInvite(invite: EventInvite) {
  cancelingInviteId.value = invite._id
  try {
    const response = await cancelEventInvite(props.eventId, invite._id)
    toast.add({ title: 'Invite canceled', description: response.message })
    await load()
  } catch (error) {
    reportApiError(toast, { title: 'Could not cancel invite', error })
  } finally {
    cancelingInviteId.value = null
  }
}

// Remove someone, or leave
const memberToRemove = ref<Member | null>(null)
const isRemoving = ref(false)
const isRemoveModalOpen = computed({
  get: () => memberToRemove.value !== null,
  set: (open) => {
    if (!open && !isRemoving.value) memberToRemove.value = null
  }
})

async function confirmRemove() {
  const member = memberToRemove.value
  if (!member) return
  isRemoving.value = true
  try {
    const response = await removeCollaborator(props.eventId, member.id)
    toast.add({ title: member.isSelf ? 'You left the event' : 'Collaborator removed', description: response.message })
    memberToRemove.value = null
    if (member.isSelf) {
      await navigateTo(role.value === 'partner' ? '/partners/events' : '/')
      return
    }
    await load()
  } catch (error) {
    reportApiError(toast, { title: member.isSelf ? 'Could not leave the event' : 'Could not remove collaborator', error })
  } finally {
    isRemoving.value = false
  }
}

function inviteeLabel(invite: EventInvite): string {
  const person = invite.invitee ?? invite.inviteePartner
  const name = fullName(person)
  return name ? `${name} (${invite.inviteeEmail})` : invite.inviteeEmail
}

const upgradeLink = computed(() => ({ path: '/event/upgrade', query: { eventId: props.eventId } }))

watch(() => [props.eventId, isUnlocked.value] as const, load, { immediate: true })
</script>

<template>
  <UPageCard class="white-bread-container">
    <div class="mb-4 text-xl font-semibold font-serif text-muted">
      Collaborators
    </div>

    <div v-if="!isUnlocked" class="space-y-3 text-sm">
      <p class="text-toast-800">
        Plan together with family, friends or your coordinator. Collaborators come with the Bread + Butter package.
      </p>
      <UButton v-if="role !== 'partner'" :to="upgradeLink" icon="i-lucide-lock-open" color="primary" variant="soft" size="sm">
        See upgrade options
      </UButton>
    </div>

    <div v-else-if="isLoading && !roster" class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      Loading collaborators...
    </div>

    <div v-else class="space-y-5">
      <ul class="space-y-3">
        <li v-for="member in members" :key="`${member.kind}-${member.id}`"
          class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 text-sm font-medium text-toast-900">
              <span class="truncate">{{ member.name }}</span>
              <UBadge v-if="member.kind === 'owner'" color="neutral" variant="subtle" size="sm">Host</UBadge>
              <UBadge v-if="member.kind === 'coordinator'" color="primary" variant="subtle" size="sm">
                Coordinator
              </UBadge>
              <UBadge v-if="member.joinedViaVoucher" color="neutral" variant="outline" size="sm">
                Joined via voucher
              </UBadge>
            </div>
            <div class="text-xs text-muted truncate">
              {{ member.email }}
            </div>
          </div>
          <UButton v-if="member.kind !== 'owner' && (isOwner || member.isSelf)" size="xs" color="error"
            variant="ghost" :icon="member.isSelf ? 'i-lucide-log-out' : 'i-lucide-user-minus'"
            class="shrink-0 cursor-pointer" @click="memberToRemove = member">
            {{ member.isSelf ? 'Leave' : 'Remove' }}
          </UButton>
        </li>
      </ul>

      <div v-if="isOwner && invites.length > 0" class="space-y-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-muted">
          Waiting for a reply
        </div>
        <ul class="space-y-2">
          <li v-for="invite in invites" :key="invite._id" class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm text-toast-900 truncate">
                {{ inviteeLabel(invite) }}
              </div>
              <div class="text-xs text-muted">
                {{ invite.inviteeType === 'PARTNER' ? 'Coordinator' : 'Collaborator' }}
                <span v-if="invite.awaitingSignup"> · hasn't signed up yet</span>
              </div>
            </div>
            <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" class="shrink-0 cursor-pointer"
              :loading="cancelingInviteId === invite._id" :disabled="cancelingInviteId !== null"
              @click="cancelInvite(invite)">
              Cancel
            </UButton>
          </li>
        </ul>
      </div>

      <UForm v-if="isOwner" class="space-y-3 border-t border-bread-200/70 pt-4" @submit.prevent="submitInvite">
        <UFormField label="Invite by email" name="inviteEmail">
          <UInput v-model="inviteEmail" type="email" class="w-full" placeholder="name@example.com" />
        </UFormField>
        <UFormField label="Invite as" name="inviteRole">
          <URadioGroup v-model="inviteRole" :items="roleItems" />
        </UFormField>
        <UButton type="submit" icon="i-lucide-send" color="slate" size="sm" :loading="isInviting"
          :disabled="!inviteEmail.trim()">
          Send invite
        </UButton>
      </UForm>
    </div>

    <UModal v-model:open="isRemoveModalOpen" :title="memberToRemove?.isSelf ? 'Leave this event?' : 'Remove collaborator?'"
      :ui="{ content: 'w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden' }">
      <template #body>
        <p class="text-sm text-toast-800">
          <template v-if="memberToRemove?.isSelf">
            You'll lose access to this event. The host can invite you again later.
          </template>
          <template v-else>
            {{ memberToRemove?.name }} will lose access to this event.
            <span v-if="memberToRemove?.joinedViaVoucher">
              Their voucher discount and earnings on this booking stay as they are.
            </span>
          </template>
        </p>
        <div class="mt-4 grid grid-cols-2 gap-2.5">
          <UButton color="neutral" variant="outline" block class="cursor-pointer justify-center" :disabled="isRemoving"
            @click="memberToRemove = null">
            Cancel
          </UButton>
          <UButton color="error" block class="cursor-pointer justify-center" :loading="isRemoving" @click="confirmRemove">
            {{ memberToRemove?.isSelf ? 'Leave event' : 'Remove' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UPageCard>
</template>
