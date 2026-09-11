"use client"

import { useState } from "react"
import { Button, TextInput } from "flowbite-react"

export default function DaysSelector({ days }: { days: string }) {
  const [selDays, setSelDays] = useState(days)

  return (
    <form className="flex flex-row gap-5" action="/internal/usage" method="GET">
      <TextInput
        type="number"
        name="days"
        value={selDays}
        onChange={(e) => setSelDays(e.target.value)}
        className="w-24"
      />
      <Button type="submit">Update</Button>
    </form>
  )
}
