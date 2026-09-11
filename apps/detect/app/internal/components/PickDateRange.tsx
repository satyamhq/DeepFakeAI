import { useState } from "react"
import { TextInput } from "flowbite-react"
import { DateRange, YMD, toYMD } from "../summarize"

export default function PickDateRange({
  range,
  setRange,
  title = "Date range:",
  titleColor,
}: {
  range: DateRange
  setRange: (range: DateRange) => void
  title?: string
  titleColor?: string
}) {
  const [from, setFrom] = useState(range.from || "")
  const [to, setTo] = useState(range.to || "")
  const isValidDate = (date: string) => !date.trim() || /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
  function commitDate(key: "from" | "to", date: YMD | undefined) {
    const norm = date ? toYMD(new Date(date)) : undefined
    setRange({ ...range, [key]: norm })
    if (key == "from") setFrom(norm || "")
    else setTo(norm || "")
  }
  function onPressed(e: React.KeyboardEvent<HTMLInputElement>, which: "from" | "to", date: YMD) {
    if (e.key == "Enter" && isValidDate(date)) {
      commitDate(which, date)
      e.currentTarget.blur()
    }
  }
  function onBlur(which: "from" | "to", date: YMD) {
    if (isValidDate(date)) commitDate(which, date)
  }
  const editors = (
    <div className="flex flex-row gap-2">
      <TextInput
        className="w-32"
        name="from"
        value={from}
        placeholder="From: Y-M-D"
        onChange={(e) => setFrom(e.target.value)}
        onKeyDown={(e) => onPressed(e, "from", from)}
        onBlur={() => onBlur("from", from)}
        color={isValidDate(from) ? undefined : "failure"}
      />
      <TextInput
        className="w-32"
        name="to"
        value={to}
        placeholder="To: Y-M-D"
        onChange={(e) => setTo(e.target.value)}
        onKeyDown={(e) => onPressed(e, "to", to)}
        onBlur={() => onBlur("to", to)}
        color={isValidDate(to) ? undefined : "failure"}
      />
    </div>
  )
  return !title ? (
    editors
  ) : (
    <div className="flex flex-col gap-1">
      <div className={titleColor ?? "text-gray-400"}>{title}</div>
      {editors}
    </div>
  )
}
