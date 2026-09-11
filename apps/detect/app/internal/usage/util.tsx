export function dateSince(daysAgo: string) {
  const dayDelta = parseInt(daysAgo || "0")
  const since = new Date()
  since.setDate(since.getDate() - dayDelta)
  since.setHours(0)
  since.setMinutes(0)
  since.setSeconds(0)
  return since
}

export function formatDateToTimestamp(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
