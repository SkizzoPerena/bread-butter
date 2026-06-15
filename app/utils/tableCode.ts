const TABLE_CODE_REGEX = /^[A-Z]+$/

function tableCodeToNumber(code: string): number {
  const upper = code.toUpperCase()
  if (!TABLE_CODE_REGEX.test(upper)) return NaN
  let result = 0
  for (let i = 0; i < upper.length; i += 1) {
    result = result * 26 + (upper.charCodeAt(i) - 64)
  }
  return result
}

export function isValidTableCode(code: string | null | undefined): code is string {
  if (code == null || typeof code !== 'string') return false
  return TABLE_CODE_REGEX.test(code.toUpperCase())
}

export function formatTableLabel(code: string | null | undefined): string | null {
  if (!isValidTableCode(code)) return null
  return `Table ${code.toUpperCase()}`
}

export function compareTableCodes(a: string, b: string): number {
  return tableCodeToNumber(a) - tableCodeToNumber(b)
}

export function sortTableCodes(codes: string[]): string[] {
  return [...codes].filter(isValidTableCode).sort(compareTableCodes)
}

export const NEW_TABLE_CODE_SENTINEL = '__new__'

export type TableAssignmentValue = string | null | typeof NEW_TABLE_CODE_SENTINEL
