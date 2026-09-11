import { Dataset } from "@prisma/client"
import { db } from "../../server"

export const internalUserId = "internal-user"

export async function loadDatasets(): Promise<Dataset[]> {
  const datasets = await db.dataset.findMany()
  // add a synthentic "internal-user" dataset which filters out all media from
  // external-users as well as media from all other manually defined datasets
  const allKeywords = new Set<string>()
  for (const ds of datasets) {
    for (const kw of ds.keywords.split(" ")) {
      if (kw.startsWith("-")) continue
      else if (kw.startsWith("?")) allKeywords.add(kw.substring(1))
      else allKeywords.add(kw)
    }
  }
  datasets.push({
    id: internalUserId,
    name: "internal-user",
    source: "Media added by internal users that is not also part of another dataset.",
    keywords: Array.from(allKeywords)
      .map((kw) => `-${kw}`)
      .join(" "),
  })
  return datasets
}
