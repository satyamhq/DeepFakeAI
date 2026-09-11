// Put utility functions for dealing with date/time related things here

export function searchParamToDate(timestamp: string) {
  const date = new Date(parseInt(timestamp))
  return isNaN(date.getTime()) ? undefined : date
}
