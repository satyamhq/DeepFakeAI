"use client"

import { Button, TextInput } from "flowbite-react"
import { useState } from "react"

export default function SearchForm({ q = "" }) {
  const [query, setQuery] = useState(q)
  return (
    <form action={"/internal/users"}>
      <div className="flex flex-row gap-4 mb-5">
        <TextInput
          className="text-black"
          placeholder="search"
          name="q"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
        />
        <Button color="lime" type="submit">
          Search
        </Button>
      </div>
    </form>
  )
}
