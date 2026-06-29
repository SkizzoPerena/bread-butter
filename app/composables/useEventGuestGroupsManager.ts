import type { Ref, ComputedRef } from 'vue'
import type { GuestGroupRecord } from '~/types/guest_group'
import type { GuestRoleRecord } from '~/types/guest_role'
import type { GuestTableRow } from '~/composables/useEventGuestsManager'
import { reportApiError } from '~/types/auth'
import { formatTableLabel } from '~/utils/tableCode'
import { guestRowMatchesDirectSearch, mapGuestTableRowToSearchable } from '~/utils/guestSearch'

export type EnrichedGuestTableRow = GuestTableRow

export interface GroupSection {
  groupId: string | null
  groupName: string
  guests: EnrichedGuestTableRow[]
}

function applyGroupSectionSearch(sections: GroupSection[], query: string): GroupSection[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return sections
  }

  return sections
    .map((section) => {
      if (section.groupName.toLowerCase().includes(trimmed)) {
        return section
      }
      const filteredGuests = section.guests.filter((row) =>
        guestRowMatchesDirectSearch(mapGuestTableRowToSearchable(row), trimmed)
      )
      return { ...section, guests: filteredGuests }
    })
    .filter((section) => section.guests.length > 0)
}

export interface UseEventGuestGroupsManagerOptions {
  eventId: Ref<string>
  tableRows: ComputedRef<GuestTableRow[]>
  mutationsDisabled: ComputedRef<boolean>
  isUiOnlyMode: ComputedRef<boolean>
  guestRoles?: Ref<GuestRoleRecord[]>
}

function buildGuestIdToGroup(groups: GuestGroupRecord[]): Map<string, GuestGroupRecord> {
  const map = new Map<string, GuestGroupRecord>()
  for (const group of groups) {
    for (const guest of group.guests ?? []) {
      map.set(guest._id, group)
    }
  }
  return map
}

function enrichRow(row: GuestTableRow, guestIdToGroup: Map<string, GuestGroupRecord>): EnrichedGuestTableRow {
  const group = guestIdToGroup.get(row.guestId)
  if (!group) {
    return {
      ...row,
      groupId: null,
      groupName: null,
      groupSize: null,
    }
  }

  const groupSize = group.guests?.length ?? 0
  const groupName = group.name?.trim() || 'Unnamed group'

  return {
    ...row,
    groupId: group._id,
    groupName,
    groupSize,
    guests: groupSize > 0 ? groupSize : row.guests,
  }
}

function applySearchFilter(
  rows: EnrichedGuestTableRow[],
  query: string,
  guestIdToGroup: Map<string, GuestGroupRecord>,
  guestGroups: GuestGroupRecord[],
  guestRoles: GuestRoleRecord[] = []
): EnrichedGuestTableRow[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return rows
  }

  const visibleIds = new Set<string>()

  for (const group of guestGroups) {
    const displayName = group.name?.trim() || 'Unnamed group'
    if (displayName.toLowerCase().includes(trimmed)) {
      for (const guest of group.guests ?? []) {
        visibleIds.add(guest._id)
      }
    }
  }

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

  const matches = rows.filter((row) =>
    guestRowMatchesDirectSearch(mapGuestTableRowToSearchable(row), trimmed)
  )

  for (const match of matches) {
    const group = guestIdToGroup.get(match.guestId)
    if (group?.guests?.length) {
      for (const guest of group.guests) {
        visibleIds.add(guest._id)
      }
    } else {
      visibleIds.add(match.guestId)
    }
  }

  if (visibleIds.size === 0) {
    return []
  }

  return rows.filter((row) => visibleIds.has(row.guestId))
}

export type SelectionContext =
  | 'single_ungrouped'
  | 'single_grouped'
  | 'same_group'
  | 'mixed'

export type GroupAssignmentMode = 'new' | 'existing'

function analyzeSelection(
  selectedIds: string[],
  guestIdToGroup: Map<string, GuestGroupRecord>
): { context: SelectionContext; sharedGroupId: string | null } {
  if (selectedIds.length === 0) {
    return { context: 'single_ungrouped', sharedGroupId: null }
  }

  if (selectedIds.length === 1) {
    const group = guestIdToGroup.get(selectedIds[0]!)
    return {
      context: group ? 'single_grouped' : 'single_ungrouped',
      sharedGroupId: group?._id ?? null,
    }
  }

  const groupIds = new Set<string | null>()
  for (const id of selectedIds) {
    groupIds.add(guestIdToGroup.get(id)?._id ?? null)
  }

  if (groupIds.size === 1 && !groupIds.has(null)) {
    return {
      context: 'same_group',
      sharedGroupId: [...groupIds][0] as string,
    }
  }

  return { context: 'mixed', sharedGroupId: null }
}

export function useEventGuestGroupsManager(options: UseEventGuestGroupsManagerOptions) {
  const toast = useToast()
  const {
    fetchGuestGroupsByEvent,
    createGuestGroup,
    addGuestsToGroup,
    updateGuestGroup,
    deleteGuestGroup,
    removeGuestFromGroup,
  } = useGuestGroups()

  const guestGroups = ref<GuestGroupRecord[]>([])
  const isLoadingGroups = ref(false)
  const isGroupActionLoading = ref(false)
  const selectedGuestIds = ref<Set<string>>(new Set())
  const searchQuery = ref('')

  const isGroupAssignmentModalOpen = ref(false)
  const isAddToExistingModalOpen = ref(false)
  const isRenameGroupModalOpen = ref(false)
  const groupAssignmentMode = ref<GroupAssignmentMode>('new')
  const createGroupName = ref('')
  const renameGroupName = ref('')
  const targetGroupId = ref<string | undefined>(undefined)
  const pendingAssignGuestIds = ref<string[] | null>(null)

  const guestIdToGroup = computed(() => buildGuestIdToGroup(guestGroups.value))

  const groupOptions = computed(() =>
    guestGroups.value.map((group) => ({
      label: group.name?.trim() || 'Unnamed group',
      value: group._id,
    }))
  )

  const enrichedRows = computed(() =>
    options.tableRows.value.map((row) => enrichRow(row, guestIdToGroup.value))
  )

  const displayRows = computed(() =>
    applySearchFilter(
      enrichedRows.value,
      searchQuery.value,
      guestIdToGroup.value,
      guestGroups.value,
      options.guestRoles?.value ?? []
    )
  )

  const isSearchActive = computed(() => searchQuery.value.trim().length > 0)

  const isSearchEmpty = computed(
    () => isSearchActive.value && displayRows.value.length === 0 && !isLoadingGroups.value
  )

  const groupsBySection = computed<GroupSection[]>(() => {
    const guestIdToRow = new Map(
      options.tableRows.value.map((row) => [row.guestId, row] as const)
    )

    const sections: GroupSection[] = guestGroups.value
      .map((group) => {
        const guests = (group.guests ?? [])
          .map((guest) => {
            const row = guestIdToRow.get(guest._id)
            if (!row) return null
            return enrichRow(row, guestIdToGroup.value)
          })
          .filter((row): row is EnrichedGuestTableRow => row != null)

        return {
          groupId: group._id,
          groupName: group.name?.trim() || 'Unnamed group',
          guests,
        }
      })
      .filter((section) => section.guests.length > 0)
      .sort((a, b) => a.groupName.localeCompare(b.groupName))

    const groupedIds = new Set(guestIdToGroup.value.keys())
    const ungrouped = enrichedRows.value.filter((row) => !groupedIds.has(row.guestId))
    if (ungrouped.length > 0) {
      sections.push({
        groupId: null,
        groupName: 'Ungrouped',
        guests: ungrouped,
      })
    }

    return applyGroupSectionSearch(sections, searchQuery.value)
  })

  const isGroupsTabEmpty = computed(
    () => groupsBySection.value.length === 0 && !isLoadingGroups.value
  )

  const selectedCount = computed(() => selectedGuestIds.value.size)

  const showActionBar = computed(() => selectedCount.value > 0)

  const selectedGuestIdList = computed(() => [...selectedGuestIds.value])

  const selectionAnalysis = computed(() =>
    analyzeSelection(selectedGuestIdList.value, guestIdToGroup.value)
  )

  const selectionContext = computed(() => selectionAnalysis.value.context)

  const sharedSelectedGroup = computed(() => {
    const groupId = selectionAnalysis.value.sharedGroupId
    if (!groupId) return null
    return guestGroups.value.find((group) => group._id === groupId) ?? null
  })

  const hasGroupedSelection = computed(() =>
    selectedGuestIdList.value.some((id) => guestIdToGroup.value.has(id))
  )

  const canGroupGuests = computed(
    () => selectedCount.value >= 2 && !options.mutationsDisabled.value
  )

  const showCreateGroupHint = computed(
    () => selectionContext.value === 'single_ungrouped' && !options.mutationsDisabled.value
  )

  const canRenameGroup = computed(
    () =>
      selectionContext.value === 'same_group' &&
      Boolean(sharedSelectedGroup.value) &&
      !options.mutationsDisabled.value
  )

  const canUngroupAll = computed(
    () => hasGroupedSelection.value && !options.mutationsDisabled.value
  )

  const canAddToExistingGroup = computed(() => {
    if (options.mutationsDisabled.value || groupOptions.value.length === 0) {
      return false
    }
    if (selectedCount.value === 0) {
      return false
    }
    return selectedGuestIdList.value.every((id) => !guestIdToGroup.value.has(id))
  })

  const assignModalGuestCount = computed(
    () => pendingAssignGuestIds.value?.length ?? selectedCount.value
  )

  const ungroupedGuests = computed(() => {
    const section = groupsBySection.value.find((item) => item.groupId === null)
    return section?.guests ?? []
  })

  const hasUngroupedGuests = computed(() => ungroupedGuests.value.length > 0)

  const allUngroupedVisibleSelected = computed(() => {
    const visible = ungroupedGuests.value
    if (visible.length === 0) return false
    return visible.every((row) => selectedGuestIds.value.has(row.guestId))
  })

  const someUngroupedVisibleSelected = computed(() => {
    const visible = ungroupedGuests.value
    if (visible.length === 0) return false
    const selected = visible.filter((row) => selectedGuestIds.value.has(row.guestId))
    return selected.length > 0 && selected.length < visible.length
  })

  const assignableGroupOptions = computed(() => {
    const excludeId = selectionAnalysis.value.sharedGroupId
    return groupOptions.value.filter((option) => option.value !== excludeId)
  })

  const canAssignToExistingInModal = computed(
    () => assignableGroupOptions.value.length > 0
  )

  const canUngroupSingle = computed(
    () => selectionContext.value === 'single_grouped' && !options.mutationsDisabled.value
  )

  const singleSelectedGuestId = computed(() => {
    if (selectedCount.value !== 1) return null
    return selectedGuestIdList.value[0] ?? null
  })

  const singleSelectedGroup = computed(() => {
    const guestId = singleSelectedGuestId.value
    if (!guestId) return null
    return guestIdToGroup.value.get(guestId) ?? null
  })

  const allVisibleSelected = computed(() => {
    const visible = displayRows.value
    if (visible.length === 0) return false
    return visible.every((row) => selectedGuestIds.value.has(row.guestId))
  })

  const someVisibleSelected = computed(() => {
    const visible = displayRows.value
    if (visible.length === 0) return false
    const selected = visible.filter((row) => selectedGuestIds.value.has(row.guestId))
    return selected.length > 0 && selected.length < visible.length
  })

  async function loadGuestGroups(targetEventId?: string) {
    const id = targetEventId ?? options.eventId.value
    if (!id && !options.isUiOnlyMode.value) {
      guestGroups.value = []
      return
    }

    if (options.isUiOnlyMode.value) {
      guestGroups.value = []
      return
    }

    isLoadingGroups.value = true
    try {
      guestGroups.value = await fetchGuestGroupsByEvent(id)
    } catch (error) {
      reportApiError(toast, { title: 'Could not load guest groups', error })
      guestGroups.value = []
    } finally {
      isLoadingGroups.value = false
    }
  }

  function clearSelection() {
    selectedGuestIds.value = new Set()
  }

  function toggleSelection(guestId: string, selected: boolean) {
    const next = new Set(selectedGuestIds.value)
    if (selected) {
      next.add(guestId)
    } else {
      next.delete(guestId)
    }
    selectedGuestIds.value = next
  }

  function toggleSelectAllVisible(selected: boolean) {
    const next = new Set(selectedGuestIds.value)
    for (const row of displayRows.value) {
      if (selected) {
        next.add(row.guestId)
      } else {
        next.delete(row.guestId)
      }
    }
    selectedGuestIds.value = next
  }

  function resolveDefaultGroupAssignmentMode(): GroupAssignmentMode {
    return 'new'
  }

  function openGroupAssignmentModal() {
    if (!canGroupGuests.value) return

    createGroupName.value = ''
    groupAssignmentMode.value = resolveDefaultGroupAssignmentMode()
    targetGroupId.value = assignableGroupOptions.value[0]?.value
    isGroupAssignmentModalOpen.value = true
  }

  function openAddToExistingModal() {
    pendingAssignGuestIds.value = null
    targetGroupId.value = groupOptions.value[0]?.value
    isAddToExistingModalOpen.value = true
  }

  function openAssignGuestsToGroupModal(guestIds: string[]) {
    const ungroupedIds = guestIds.filter((id) => !guestIdToGroup.value.has(id))
    if (ungroupedIds.length === 0 || groupOptions.value.length === 0) {
      return
    }
    pendingAssignGuestIds.value = ungroupedIds
    targetGroupId.value = groupOptions.value[0]?.value
    isAddToExistingModalOpen.value = true
  }

  function closeAddToExistingModal() {
    isAddToExistingModalOpen.value = false
    pendingAssignGuestIds.value = null
  }

  function toggleSelectAllUngrouped(selected: boolean) {
    const next = new Set(selectedGuestIds.value)
    for (const row of ungroupedGuests.value) {
      if (selected) {
        next.add(row.guestId)
      } else {
        next.delete(row.guestId)
      }
    }
    selectedGuestIds.value = next
  }

  function openRenameGroupModal() {
    const group = sharedSelectedGroup.value
    renameGroupName.value = group?.name?.trim() ?? ''
    isRenameGroupModalOpen.value = true
  }

  async function assignGuestsToExistingGroup(guestIds: string[]) {
    if (!targetGroupId.value || guestIds.length === 0) return

    const targetGroup = guestGroups.value.find((group) => group._id === targetGroupId.value)
    const anyGrouped = guestIds.some((id) => guestIdToGroup.value.has(id))

    let response
    if (anyGrouped || guestIds.length > 1) {
      const existingIds = targetGroup?.guests.map((guest) => guest._id) ?? []
      const mergedIds = [...new Set([...existingIds, ...guestIds])]
      if (mergedIds.length < 2) {
        toast.add({
          title: 'Cannot add to group',
          description: 'A group must have at least 2 guests.',
          color: 'error',
        })
        return
      }
      response = await updateGuestGroup(targetGroupId.value, { guestIds: mergedIds })
    } else {
      response = await addGuestsToGroup(targetGroupId.value, guestIds)
    }

    await loadGuestGroups()
    clearSelection()
    targetGroupId.value = undefined

    toast.add({
      title: 'Added to group',
      description: response.message,
    })
  }

  async function handleGroupAssignment() {
    if (!canGroupGuests.value) return

    const guestIds = selectedGuestIdList.value
    if (guestIds.length === 0) return

    if (groupAssignmentMode.value === 'existing') {
      if (!targetGroupId.value) return
    }

    isGroupActionLoading.value = true
    try {
      if (groupAssignmentMode.value === 'new') {
        const targetEventId = options.eventId.value || 'mock-event-id'
        const response = await createGuestGroup(targetEventId, {
          name: createGroupName.value.trim() || undefined,
          guestIds,
        })

        await loadGuestGroups(targetEventId)
        clearSelection()
        isGroupAssignmentModalOpen.value = false
        createGroupName.value = ''

        toast.add({
          title: 'Group created',
          description: response.message,
        })
      } else {
        await assignGuestsToExistingGroup(guestIds)
        isGroupAssignmentModalOpen.value = false
      }
    } catch (error) {
      const title =
        groupAssignmentMode.value === 'new' ? 'Could not create group' : 'Could not add to group'
      reportApiError(toast, { title, error })
    } finally {
      isGroupActionLoading.value = false
    }
  }

  async function handleAddToExistingGroup() {
    const guestIds = pendingAssignGuestIds.value ?? selectedGuestIdList.value
    if (guestIds.length === 0 || !targetGroupId.value) return

    const allUngrouped = guestIds.every((id) => !guestIdToGroup.value.has(id))
    if (!allUngrouped) {
      toast.add({
        title: 'Cannot add to group',
        description: 'Only ungrouped guests can be added to an existing group.',
        color: 'error',
      })
      return
    }

    isGroupActionLoading.value = true
    try {
      await assignGuestsToExistingGroup(guestIds)
      closeAddToExistingModal()
    } catch (error) {
      reportApiError(toast, { title: 'Could not add to group', error })
    } finally {
      isGroupActionLoading.value = false
    }
  }

  async function handleRenameGroup() {
    const group = sharedSelectedGroup.value
    if (!canRenameGroup.value || !group) return

    isGroupActionLoading.value = true
    try {
      const name = renameGroupName.value.trim()
      const response = await updateGuestGroup(group._id, {
        name: name || null,
      })

      await loadGuestGroups()
      clearSelection()
      isRenameGroupModalOpen.value = false
      renameGroupName.value = ''

      toast.add({
        title: 'Group renamed',
        description: response.message,
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not rename group', error })
    } finally {
      isGroupActionLoading.value = false
    }
  }

  async function handleRemoveGuestFromGroup(groupId: string, guestId: string) {
    if (options.mutationsDisabled.value || !groupId || !guestId) return

    isGroupActionLoading.value = true
    try {
      const response = await removeGuestFromGroup(groupId, guestId)
      await loadGuestGroups()
      toast.add({
        title: response.dissolved ? 'Group dissolved' : 'Guest ungrouped',
        description: response.message,
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not ungroup guest', error })
    } finally {
      isGroupActionLoading.value = false
    }
  }

  function openRenameGroupModalForGroup(groupId: string) {
    const group = guestGroups.value.find((item) => item._id === groupId)
    if (!group) return
    renameGroupName.value = group.name?.trim() ?? ''
    selectedGuestIds.value = new Set((group.guests ?? []).map((guest) => guest._id))
    isRenameGroupModalOpen.value = true
  }

  async function handleUngroupSingle() {
    const group = singleSelectedGroup.value
    const guestId = singleSelectedGuestId.value
    if (!canUngroupSingle.value || !group || !guestId) return

    isGroupActionLoading.value = true
    try {
      const response = await removeGuestFromGroup(group._id, guestId)

      await loadGuestGroups()
      clearSelection()

      toast.add({
        title: response.dissolved ? 'Group dissolved' : 'Guest ungrouped',
        description: response.message,
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not ungroup guest', error })
    } finally {
      isGroupActionLoading.value = false
    }
  }

  async function handleUngroupAll() {
    if (!canUngroupAll.value) return

    const selected = new Set(selectedGuestIdList.value)
    const groupedByGroupId = new Map<string, string[]>()

    for (const guestId of selected) {
      const group = guestIdToGroup.value.get(guestId)
      if (!group) continue
      const list = groupedByGroupId.get(group._id) ?? []
      list.push(guestId)
      groupedByGroupId.set(group._id, list)
    }

    isGroupActionLoading.value = true
    try {
      for (const [groupId, guestIds] of groupedByGroupId) {
        const group = guestGroups.value.find((item) => item._id === groupId)
        if (!group) continue

        const allMembersSelected = group.guests.every((guest) => selected.has(guest._id))
        if (allMembersSelected) {
          await deleteGuestGroup(groupId)
        } else {
          for (const guestId of guestIds) {
            await removeGuestFromGroup(groupId, guestId)
            await loadGuestGroups()
          }
        }
      }

      await loadGuestGroups()
      clearSelection()

      toast.add({
        title: 'Guests ungrouped',
        description: 'Selected guests were removed from their groups.',
      })
    } catch (error) {
      reportApiError(toast, { title: 'Could not ungroup guests', error })
    } finally {
      isGroupActionLoading.value = false
    }
  }

  watch(options.eventId, () => {
    clearSelection()
    searchQuery.value = ''
  })

  return {
    guestGroups,
    isLoadingGroups,
    isGroupActionLoading,
    selectedGuestIds,
    searchQuery,
    isGroupAssignmentModalOpen,
    isAddToExistingModalOpen,
    isRenameGroupModalOpen,
    groupAssignmentMode,
    createGroupName,
    renameGroupName,
    targetGroupId,
    groupOptions,
    assignableGroupOptions,
    displayRows,
    groupsBySection,
    isGroupsTabEmpty,
    isSearchActive,
    isSearchEmpty,
    showActionBar,
    selectedCount,
    selectionContext,
    canGroupGuests,
    showCreateGroupHint,
    canRenameGroup,
    canUngroupAll,
    canAddToExistingGroup,
    assignModalGuestCount,
    ungroupedGuests,
    hasUngroupedGuests,
    allUngroupedVisibleSelected,
    someUngroupedVisibleSelected,
    canAssignToExistingInModal,
    canUngroupSingle,
    allVisibleSelected,
    someVisibleSelected,
    loadGuestGroups,
    clearSelection,
    toggleSelection,
    toggleSelectAllVisible,
    openGroupAssignmentModal,
    openAddToExistingModal,
    openAssignGuestsToGroupModal,
    closeAddToExistingModal,
    toggleSelectAllUngrouped,
    openRenameGroupModal,
    handleGroupAssignment,
    handleAddToExistingGroup,
    handleRenameGroup,
    handleRemoveGuestFromGroup,
    openRenameGroupModalForGroup,
    handleUngroupSingle,
    handleUngroupAll,
  }
}
