"use client"

import { useState, useRef } from "react"
import { analysisLink } from "../ui"
import { Word } from "./page"

export default function WordList({ label, words }: { label: string; words: Word[] }) {
  const [shown, setShown] = useState<Word | undefined>(undefined)
  const shownRef = useRef<HTMLDivElement>(null)

  function show(word: Word) {
    setShown(word)
    shownRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  const format = (word: Word) => (
    <span key={word.word} className="mr-2 text-nowrap">
      <span className="cursor-pointer" onClick={() => show(word)}>
        {word.word}
      </span>{" "}
      ({word.ids.size})
    </span>
  )

  return (
    <>
      <h1 className="text-lg font-bold mt-5">{label}:</h1>
      <div className="text-sm flex flex-row flex-wrap">{words.map(format)}</div>
      <div className="flex flex-col" ref={shownRef}>
        {shown ? (
          <>
            <div className="mt-3">Media Details: {shown.word}</div>
            {Array.from(shown.ids).map((id) => (
              <span key={id}>{analysisLink(id, id, "_blank")}</span>
            ))}
          </>
        ) : undefined}
      </div>
    </>
  )
}
