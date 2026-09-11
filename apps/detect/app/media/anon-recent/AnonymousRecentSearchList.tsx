import { useState, useEffect } from "react"
import { LocalHistoryItem } from "./local-history"
import { Verdict } from "../../data/verdict"
import AnonymousUserHistoryItem from "./AnonymousRecentSearchItem"
import { getMediaVerdicts } from "../../api/get-verdicts/actions"

export default function AnonymousUserHistoryList({ items }: { items: LocalHistoryItem[] }) {
  const [verdicts, setVerdicts] = useState({} as Record<string, Verdict>)

  useEffect(() => {
    async function getVerdicts() {
      if (items.length > 0) {
        setVerdicts(await getMediaVerdicts(items.map((i) => i.mediaId)))
      }
    }
    getVerdicts()
  }, [items])

  return (
    <>
      {items.map((item) => (
        <AnonymousUserHistoryItem key={item.mediaId} item={item} verdict={verdicts[item.mediaId]} />
      ))}
    </>
  )
}
