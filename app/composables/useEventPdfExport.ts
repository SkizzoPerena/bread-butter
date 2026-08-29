import { reportApiError } from '~/types/auth'

export type EventPdfExportType = 'guests' | 'rsvps' | 'suppliers' | 'church-requirements'

async function toReportableError(error: unknown): Promise<unknown> {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return error
  }

  const data = (error as { data?: unknown }).data
  if (!(data instanceof Blob)) {
    return error
  }

  try {
    const parsed = JSON.parse(await data.text())
    return { data: parsed }
  } catch {
    return error
  }
}

export function useEventPdfExport() {
  const toast = useToast()
  const { apiRequest, isUiOnlyMode } = useApiMode()
  const isExporting = ref(false)

  async function exportEventPdf(eventId: string, exportType: EventPdfExportType) {
    if (isUiOnlyMode.value) {
      toast.add({
        title: 'Export unavailable',
        description: 'Enable the real API to export PDFs.',
        color: 'warning',
      })
      return
    }

    if (!eventId) {
      toast.add({
        title: 'Missing event',
        description: 'Open an event before exporting a PDF.',
        color: 'error',
      })
      return
    }

    if (isExporting.value) {
      return
    }

    isExporting.value = true
    const tab = import.meta.client ? window.open('about:blank', '_blank') : null

    try {
      const blob = await apiRequest<Blob>(
        `/user/events/${eventId}/export/${exportType}/pdf`,
        { responseType: 'blob' },
      )

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('The export did not return a PDF.')
      }

      if (blob.type.includes('application/json')) {
        const parsed = JSON.parse(await blob.text())
        throw { data: parsed }
      }

      const url = URL.createObjectURL(blob)
      if (tab && !tab.closed) {
        tab.location.href = url
      } else if (import.meta.client) {
        window.open(url, '_blank')
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      if (tab && !tab.closed) {
        tab.close()
      }
      reportApiError(toast, {
        title: 'Could not export PDF',
        error: await toReportableError(error),
      })
    } finally {
      isExporting.value = false
    }
  }

  return {
    isExporting,
    exportEventPdf,
  }
}
