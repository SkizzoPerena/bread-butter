import type { Ref, ComputedRef } from 'vue'
import type { GuestRecord } from '~/types/event'
import type { GuestRoleRecord } from '~/types/guest_role'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { reportApiError } from '~/types/auth'
import {
  formatTableLabel,
  NEW_TABLE_CODE_SENTINEL,
  sortTableCodes,
  type TableAssignmentValue,
} from '~/utils/tableCode'

export type RoleAssignmentMode = 'existing' | 'new'

export interface TableSection {
  tableCode: string | null
  label: string
  guests: GuestTableRow[]
}

export interface RoleSection {
  roleId: string
  roleName: string
  guests: GuestTableRow[]
}

export interface UseEventGuestRolesAndTablesManagerOptions {
  eventId: Ref<string>
  guestList: Ref<GuestRecord[]>
  guestRoles: Ref<GuestRoleRecord[]>
  tableRows: ComputedRef<GuestTableRow[]>
  selectedGuestIds: Ref<Set<string>>
  mutationsDisabled: ComputedRef<boolean>
  isUiOnlyMode: ComputedRef<boolean>
  searchQuery: Ref<string>
  onGuestListMutated?: () => void | Promise<void>
  clearSelection: () => void
}

function mapGuestRecordToTableRow(guest: GuestRecord): GuestTableRow {
  const roleNames = (guest.roles ?? []).map((role) => role.name)
  return {
    guestId: guest._id,
    name: guest.name,
    email: guest.email,
    guests: guest.rsvp?.status === 'GOING' ? 1 : 0,
    rsvpStatus:
      guest.rsvp?.status === 'GOING'
        ? 'Attending'
        : guest.rsvp?.status === 'NOT_GOING'
          ? 'Not Attending'
          : 'Pending',
    invitationSent: Boolean(guest.rsvp?.invitedAt),
    roleNames,
    tableCode: guest.tableCode ?? null,
    tableLabel: formatTableLabel(guest.tableCode),
  }
}

function applyRowSearchFilter(
  rows: GuestTableRow[],
  query: string,
  guestRoles: GuestRoleRecord[]
): GuestTableRow[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return rows

  const visibleIds = new Set<string>()

  for (const role of guestRoles) {
    if (role.name.toLowerCase().includes(trimmed)) {
      for (const guest of role.guests ?? []) {
        visibleIds.add(guest._id)
      }
    }
  }

  const tableCodesSeen = new Set<string>()
  for (const row of rows) {
    if (!row.tableCode) continue
    if (tableCodesSeen.has(row.tableCode)) continue
    tableCodesSeen.add(row.tableCode)
    const label = (row.tableLabel ?? formatTableLabel(row.tableCode) ?? '').toLowerCase()
    const code = row.tableCode.toLowerCase()
    if (label.includes(trimmed) || code === trimmed || `table ${code}` === trimmed) {
      for (const match of rows.filter((item) => item.tableCode === row.tableCode)) {
        visibleIds.add(match.guestId)
      }
    }
  }

  const matches = rows.filter(
    (row) =>
      row.name.toLowerCase().includes(trimmed) ||
      row.email.toLowerCase().includes(trimmed) ||
      (row.roleNames ?? []).some((roleName) => roleName.toLowerCase().includes(trimmed))
  )

  for (const match of matches) {
    visibleIds.add(match.guestId)
  }

  if (visibleIds.size === 0) return []
  return rows.filter((row) => visibleIds.has(row.guestId))
}

export function useEventGuestRolesAndTablesManager(
  options: UseEventGuestRolesAndTablesManagerOptions
) {
  const toast = useToast()
  const {
    fetchGuestRolesByEvent,
    createGuestRole,
    addGuestsToRole,
    removeGuestFromRole,
  } = useGuestRoles()
  const { fetchEventTables, assignGuestsTableBulk } = useGuests()

  const eventTableCodes = ref<string[]>([])
  const isLoadingRoles = ref(false)
  const isRoleTableActionLoading = ref(false)

  const isRoleAssignmentModalOpen = ref(false)
  const isRoleUnassignmentModalOpen = ref(false)
  const isTableAssignmentModalOpen = ref(false)
  const roleAssignmentMode = ref<RoleAssignmentMode>('existing')
  const targetRoleId = ref<string | undefined>(undefined)
  const targetUnassignRoleId = ref<string | undefined>(undefined)
  const createRoleName = ref('')
  const targetTableValue = ref<TableAssignmentValue | undefined>(undefined)
  const pendingTableGuestIds = ref<string[] | null>(null)

  const selectedGuestIdList = computed(() => [...options.selectedGuestIds.value])

  const roleOptions = computed(() =>
    options.guestRoles.value.map((role) => ({
      label: role.name,
      value: role._id,
    }))
  )

  const tableOptions = computed(() => {
    const selectedIds = new Set(selectedGuestIdList.value)
    const selectedTableCodes = options.guestList.value
      .filter((guest) => selectedIds.has(guest._id) && guest.tableCode)
      .map((guest) => guest.tableCode as string)
    const codes = sortTableCodes([
      ...new Set([...eventTableCodes.value, ...selectedTableCodes]),
    ])
    const items = codes.map((code) => ({
      label: formatTableLabel(code) ?? code,
      value: code as TableAssignmentValue,
    }))
    items.push({ label: 'New table', value: NEW_TABLE_CODE_SENTINEL })
    items.push({ label: 'Unassigned', value: null })
    return items
  })

  function resolveDefaultTableValue(): TableAssignmentValue {
    const selectedIds = new Set(selectedGuestIdList.value)
    const selectedGuests = options.guestList.value.filter((guest) =>
      selectedIds.has(guest._id)
    )

    if (selectedGuests.length === 0) {
      return eventTableCodes.value[0] ?? NEW_TABLE_CODE_SENTINEL
    }

    const firstCode = selectedGuests[0]!.tableCode ?? null
    const allShareSameTable = selectedGuests.every(
      (guest) => (guest.tableCode ?? null) === firstCode
    )

    if (allShareSameTable && firstCode != null) {
      return firstCode
    }

    return eventTableCodes.value[0] ?? NEW_TABLE_CODE_SENTINEL
  }

  const unassignRoleOptions = computed(() => {
    const selectedIds = new Set(selectedGuestIdList.value)
    const roleMap = new Map<string, string>()
    for (const guest of options.guestList.value) {
      if (!selectedIds.has(guest._id)) continue
      for (const role of guest.roles ?? []) {
        roleMap.set(role._id, role.name)
      }
    }
    return [...roleMap.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  const canUnassignRole = computed(
    () => !options.mutationsDisabled.value && unassignRoleOptions.value.length > 0
  )

  const canAssignRole = computed(
    () => selectedGuestIdList.value.length > 0 && !options.mutationsDisabled.value
  )

  const canAssignTable = computed(
    () => selectedGuestIdList.value.length > 0 && !options.mutationsDisabled.value
  )

  const tableAssignmentModalTitle = computed(() =>
    pendingTableGuestIds.value?.length === 1 ? 'Move to table' : 'Assign table'
  )

  const tableAssignmentGuestCount = computed(
    () => pendingTableGuestIds.value?.length ?? selectedGuestIdList.value.length
  )

  const tableAssignmentSubmitLabel = computed(() =>
    pendingTableGuestIds.value?.length === 1 ? 'Move guest' : 'Assign table'
  )

  const rolesBySection = computed<RoleSection[]>(() => {
    const query = options.searchQuery.value
    return options.guestRoles.value
      .map((role) => {
        const guests = (role.guests ?? []).map(mapGuestRecordToTableRow)
        return {
          roleId: role._id,
          roleName: role.name,
          guests: applyRowSearchFilter(guests, query, options.guestRoles.value),
        }
      })
      .filter((section) => section.guests.length > 0)
      .sort((a, b) => a.roleName.localeCompare(b.roleName))
  })

  const tablesBySection = computed<TableSection[]>(() => {
    const query = options.searchQuery.value
    const byCode = new Map<string | null, GuestTableRow[]>()

    for (const row of options.tableRows.value) {
      const code = row.tableCode ?? null
      const list = byCode.get(code) ?? []
      list.push(row)
      byCode.set(code, list)
    }

    const codes = sortTableCodes(
      [...byCode.keys()].filter((code): code is string => code != null)
    )

    const sections: TableSection[] = codes
      .map((tableCode) => ({
        tableCode,
        label: formatTableLabel(tableCode) ?? tableCode,
        guests: applyRowSearchFilter(byCode.get(tableCode) ?? [], query, options.guestRoles.value),
      }))
      .filter((section) => section.guests.length > 0)

    const unassigned = applyRowSearchFilter(
      byCode.get(null) ?? [],
      query,
      options.guestRoles.value
    )
    if (unassigned.length > 0) {
      sections.push({
        tableCode: null,
        label: 'Unassigned',
        guests: unassigned,
      })
    }

    return sections
  })

  async function loadGuestRoles(targetEventId?: string) {
    const id = targetEventId ?? options.eventId.value
    if (!id && !options.isUiOnlyMode.value) {
      options.guestRoles.value = []
      return
    }

    if (options.isUiOnlyMode.value) {
      options.guestRoles.value = []
      return
    }

    isLoadingRoles.value = true
    try {
      options.guestRoles.value = await fetchGuestRolesByEvent(id)
    } catch (error) {
      reportApiError(toast, { title: 'Could not load guest roles', error })
      options.guestRoles.value = []
    } finally {
      isLoadingRoles.value = false
    }
  }

  async function loadEventTables(targetEventId?: string) {
    const id = targetEventId ?? options.eventId.value
    if (!id && !options.isUiOnlyMode.value) {
      eventTableCodes.value = []
      return
    }

    if (options.isUiOnlyMode.value) {
      eventTableCodes.value = ['A', 'B']
      return
    }

    try {
      eventTableCodes.value = await fetchEventTables(id)
    } catch (error) {
      reportApiError(toast, { title: 'Could not load tables', error })
      eventTableCodes.value = []
    }
  }

  async function reloadAll(targetEventId?: string) {
    await Promise.all([loadGuestRoles(targetEventId), loadEventTables(targetEventId)])
  }

  function applyGuestUpdates(updatedGuests: GuestRecord[]) {
    const byId = new Map(updatedGuests.map((guest) => [guest._id, guest]))
    options.guestList.value = options.guestList.value.map(
      (guest) => byId.get(guest._id) ?? guest
    )
  }

  function resolveDefaultUnassignRoleId(): string | undefined {
    const roleOpts = unassignRoleOptions.value
    if (roleOpts.length === 0) return undefined

    const selectedIds = new Set(selectedGuestIdList.value)
    const selectedGuests = options.guestList.value.filter((guest) =>
      selectedIds.has(guest._id)
    )

    if (selectedGuests.length === 1) {
      return selectedGuests[0]!.roles?.[0]?._id ?? roleOpts[0]?.value
    }

    const firstRoleId = selectedGuests[0]!.roles?.[0]?._id
    const allShareSingleRole =
      firstRoleId != null &&
      selectedGuests.every((guest) => {
        const roles = guest.roles ?? []
        return roles.length === 1 && roles[0]!._id === firstRoleId
      })
    if (allShareSingleRole) {
      return firstRoleId
    }

    return roleOpts[0]?.value
  }

  function openRoleAssignmentModal() {
    if (!canAssignRole.value) return
    roleAssignmentMode.value = roleOptions.value.length > 0 ? 'existing' : 'new'
    targetRoleId.value = roleOptions.value[0]?.value
    createRoleName.value = ''
    isRoleAssignmentModalOpen.value = true
  }

  function openRoleUnassignmentModal() {
    if (!canUnassignRole.value) return
    targetUnassignRoleId.value = resolveDefaultUnassignRoleId()
    isRoleUnassignmentModalOpen.value = true
  }

  function openTableAssignmentModal() {
    if (!canAssignTable.value) return
    pendingTableGuestIds.value = null
    targetTableValue.value = resolveDefaultTableValue()
    isTableAssignmentModalOpen.value = true
  }

  function openGuestTableTransferModal(guestId: string) {
    if (options.mutationsDisabled.value) return
    const guest = options.guestList.value.find((item) => item._id === guestId)
    pendingTableGuestIds.value = [guestId]
    targetTableValue.value =
      guest?.tableCode ?? eventTableCodes.value[0] ?? NEW_TABLE_CODE_SENTINEL
    isTableAssignmentModalOpen.value = true
  }

  function closeTableAssignmentModal() {
    isTableAssignmentModalOpen.value = false
    pendingTableGuestIds.value = null
  }

  async function handleRoleAssignment() {
    const guestIds = selectedGuestIdList.value
    if (guestIds.length === 0) return

    isRoleTableActionLoading.value = true
    try {
      let roleId = targetRoleId.value

      if (roleAssignmentMode.value === 'new') {
        const name = createRoleName.value.trim()
        if (!name) {
          toast.add({
            title: 'Role name required',
            description: 'Enter a name for the new role.',
            color: 'error',
          })
          return
        }
        const created = await createGuestRole(options.eventId.value, { name })
        roleId = created.guestRole._id
      }

      if (!roleId) return

      await addGuestsToRole(roleId, guestIds)
      await options.onGuestListMutated?.()
      options.clearSelection()
      isRoleAssignmentModalOpen.value = false
      createRoleName.value = ''

      toast.add({
        title: 'Role assigned',
        description: 'Selected guests were assigned to the role.',
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not assign role', error })
    } finally {
      isRoleTableActionLoading.value = false
    }
  }

  async function handleRoleUnassignment() {
    const roleId = targetUnassignRoleId.value
    if (!roleId) return

    const selectedIds = new Set(selectedGuestIdList.value)
    const guestIdsToUpdate = options.guestList.value
      .filter(
        (guest) =>
          selectedIds.has(guest._id) &&
          (guest.roles ?? []).some((role) => role._id === roleId)
      )
      .map((guest) => guest._id)

    if (guestIdsToUpdate.length === 0) return

    isRoleTableActionLoading.value = true
    try {
      for (const guestId of guestIdsToUpdate) {
        await removeGuestFromRole(roleId, guestId)
      }
      await options.onGuestListMutated?.()
      options.clearSelection()
      isRoleUnassignmentModalOpen.value = false
      targetUnassignRoleId.value = undefined

      toast.add({
        title: 'Role removed',
        description: 'Selected guests were removed from the role.',
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not remove role', error })
    } finally {
      isRoleTableActionLoading.value = false
    }
  }

  async function handleRemoveGuestFromRole(roleId: string, guestId: string) {
    if (options.mutationsDisabled.value) return

    isRoleTableActionLoading.value = true
    try {
      await removeGuestFromRole(roleId, guestId)
      await options.onGuestListMutated?.()

      toast.add({
        title: 'Role removed',
        description: 'Guest was removed from the role.',
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not remove role', error })
    } finally {
      isRoleTableActionLoading.value = false
    }
  }

  async function handleUnassignGuestFromTable(guestId: string) {
    if (options.mutationsDisabled.value) return

    isRoleTableActionLoading.value = true
    try {
      const response = await assignGuestsTableBulk(
        options.eventId.value,
        [guestId],
        null
      )

      if (response.guests?.length) {
        applyGuestUpdates(response.guests)
      }

      await loadEventTables()
      await options.onGuestListMutated?.()

      toast.add({
        title: 'Table cleared',
        description: 'Guest was removed from their table.',
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not unassign table', error })
    } finally {
      isRoleTableActionLoading.value = false
    }
  }

  async function handleTableAssignment() {
    const guestIds = pendingTableGuestIds.value ?? selectedGuestIdList.value
    if (guestIds.length === 0) return
    if (targetTableValue.value === undefined) return

    const usedPendingGuests = pendingTableGuestIds.value != null

    isRoleTableActionLoading.value = true
    try {
      const response = await assignGuestsTableBulk(
        options.eventId.value,
        guestIds,
        targetTableValue.value
      )

      if (response.guests?.length) {
        applyGuestUpdates(response.guests)
      }

      await loadEventTables()
      await options.onGuestListMutated?.()
      if (!usedPendingGuests) {
        options.clearSelection()
      }
      closeTableAssignmentModal()

      toast.add({
        title: response.tableCode == null ? 'Table cleared' : 'Table assigned',
        description: response.message,
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not assign table', error })
    } finally {
      isRoleTableActionLoading.value = false
    }
  }

  return {
    eventTableCodes,
    isLoadingRoles,
    isRoleTableActionLoading,
    isRoleAssignmentModalOpen,
    isRoleUnassignmentModalOpen,
    isTableAssignmentModalOpen,
    roleAssignmentMode,
    targetRoleId,
    targetUnassignRoleId,
    createRoleName,
    targetTableValue,
    roleOptions,
    unassignRoleOptions,
    tableOptions,
    tableAssignmentModalTitle,
    tableAssignmentGuestCount,
    tableAssignmentSubmitLabel,
    canAssignRole,
    canUnassignRole,
    canAssignTable,
    rolesBySection,
    tablesBySection,
    loadGuestRoles,
    loadEventTables,
    reloadAll,
    openRoleAssignmentModal,
    openRoleUnassignmentModal,
    openTableAssignmentModal,
    openGuestTableTransferModal,
    closeTableAssignmentModal,
    handleRoleAssignment,
    handleRoleUnassignment,
    handleRemoveGuestFromRole,
    handleUnassignGuestFromTable,
    handleTableAssignment,
  }
}
