"use client"

// this is needed so that we can force date rendering to happen on the client, not the server, so
// that the date is rendered in the correct time zone
export default function DateLabel({ date, options }: { date: Date; options?: Intl.DateTimeFormatOptions }) {
  return <span className="text-nowrap">{date.toLocaleString(undefined, options)}</span>
}

export function DayMonthLabel({ date }: { date?: Date }) {
  if (!date) return null
  return <span className="text-nowrap">{date.toLocaleDateString(undefined)}</span>
}
