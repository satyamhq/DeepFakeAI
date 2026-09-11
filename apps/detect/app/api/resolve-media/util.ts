export function needsKeywordAdded({ keywords, newKeyword }: { keywords: string | undefined; newKeyword: string }) {
  if (!keywords) return { needsChange: true, keywords: newKeyword }

  for (let word of keywords.split(" ")) {
    word = word.trim()
    if (!word) continue
    if (word === newKeyword) {
      return { needsChange: false, keywords }
    }
  }
  return { needsChange: true, keywords: `${keywords} ${newKeyword}` }
}

export function needsKeywordRemoved({
  keywords,
  keywordToDelete,
}: {
  keywords: string | undefined
  keywordToDelete: string
}) {
  if (!keywords) return { needsChange: false, keywords }
  if (keywords === keywordToDelete) return { needsChange: true, keywords: "" }
  const newKeywords = keywords
    .split(" ")
    .filter((kk) => kk !== keywordToDelete)
    .join(" ")
  return { needsChange: newKeywords.length !== keywords.length, keywords: newKeywords }
}
