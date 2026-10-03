import type { CreateIssuePayload, CreateIssueResponse } from '~/types/issue'
import { actorRole, tracked } from '~/utils/analytics'

export function useIssues() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()

  async function createIssue(payload: CreateIssuePayload): Promise<CreateIssueResponse> {
    if (isUiOnlyMode.value) {
      return {
        success: true,
        status: 201,
        message: 'Your report has been submitted. We will look into it shortly.',
      }
    }

    const title = payload.title.trim()
    const description = payload.description.trim()

    if (payload.supplementaryFile) {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('supplementaryFile', payload.supplementaryFile, payload.supplementaryFile.name)

      return tracked(actorRole(), () => apiUpload<CreateIssueResponse>('/user/issues', formData), {
        event: 'issue_report_submitted',
      })
    }

    return tracked(actorRole(), () => apiRequest<CreateIssueResponse>('/user/issues', {
      method: 'POST',
      body: { title, description },
    }), { event: 'issue_report_submitted' })
  }

  return {
    createIssue,
  }
}
