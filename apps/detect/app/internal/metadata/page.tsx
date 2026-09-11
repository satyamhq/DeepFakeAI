import { MediaMetadata } from "@prisma/client"
import { db } from "../../server"
import { pageNav } from "../ui"
import WordList from "./WordList"

export const dynamic = "force-dynamic"

export type Word = { word: string; ids: Set<string> }

function summarizeWords(metas: MediaMetadata[], getWords: (meta: MediaMetadata) => string): Word[] {
  const counts: Record<string, Set<string>> = {}
  for (const meta of metas) {
    const words = getWords(meta).toLowerCase()
    for (const word of words.split(" ")) {
      if (!word) continue
      counts[word] ??= new Set<string>()
      counts[word].add(meta.mediaId)
    }
  }
  const summary = Object.entries(counts)
  summary.sort((a, b) => {
    const dc = b[1].size - a[1].size
    return dc == 0 ? a[0].localeCompare(b[0]) : dc
  })
  return summary.map((pair) => ({ word: pair[0], ids: pair[1] }))
}

export default async function Page() {
  const metas = await db.mediaMetadata.findMany({})

  const keywords = summarizeWords(metas, (mm) => mm.keywords)
  const sources = summarizeWords(metas, (mm) => mm.source)
  const languages = summarizeWords(metas, (mm) => mm.language)

  return (
    <>
      {pageNav("Metadata")}

      <div>Total media with metadata: {metas.length}</div>
      <WordList label="Keywords" words={keywords} />
      <WordList label="Sources" words={sources} />
      <WordList label="Languages" words={languages} />
    </>
  )
}
