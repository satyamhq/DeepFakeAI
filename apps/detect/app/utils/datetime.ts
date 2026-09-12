// Put utility functions for dealing with date/time related things here

export function searchParamToDate(timestamp: string | null | undefined): Date | undefined {
  if (!timestamp) return undefined
  const trimmed = String(timestamp).trim()
  const num = parseInt(trimmed, 10)
  if (!isNaN(num) && String(num) === trimmed) {
    const date = new Date(num)
    return isNaN(date.getTime()) ? undefined : date
  }
  const date = new Date(trimmed)
  return isNaN(date.getTime()) ? undefined : date
}
