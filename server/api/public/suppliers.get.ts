import { SUPPLIERS_DIRECTORY_DATA } from '~/data/suppliersDirectory'

export default defineEventHandler(() => {
  return {
    success: true,
    categories: SUPPLIERS_DIRECTORY_DATA
  }
})

