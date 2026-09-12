"use client"

// this is needed so that we can force date rendering to happen on the client, not the server, so
// that the date is rendered in the correct time zone
export default function DateLabel({ date, options }: { date?: Date | string | number | null; options?: Intl.DateTimeFormatOptions }) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  return <span suppressHydrationWarning className="text-nowrap">{d.toLocaleString(undefined, options)}</span>
}

export function DayMonthLabel({ date }: { date?: Date | string | number | null }) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  return <span suppressHydrationWarning className="text-nowrap">{d.toLocaleDateString(undefined)}</span>
}
