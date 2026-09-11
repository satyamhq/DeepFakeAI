"use client"

const itemName = "anon-history"
const maxItems = 10

export type LocalHistoryItem = {
  mediaId: string
  mimeType: string
  postUrl: string
  date: Date
}

// Returns the past maxItems media queries this user has performed, as stored in local storage
export function getLocalStorageHistory(): LocalHistoryItem[] {
  let history: LocalHistoryItem[] = []
  if (typeof window !== "undefined") {
    history = JSON.parse(window.localStorage.getItem(itemName) || "[]")
  } else {
    console.error("getLocalStorageHistory called on the server")
  }
  // Dates are read in as strings, so convert them to proper Dates
  return history.map((item) => {
    item.date = new Date(item.date)
    return item
  })
}

export function maybeUpdateLocalStorageHistory(enable: boolean, mediaId: string, mimeType: string, postUrl: string) {
  if (enable) {
    const history = getLocalStorageHistory()
    // Only add this item if it isn't already in the user's history
    const index = history.findIndex((i) => i.mediaId === mediaId)
    if (index < 0) {
      // Stick the most recent at the beginning for easy iteration
      history.unshift({
        mediaId,
        mimeType,
        postUrl,
        date: new Date(),
      })
      if (typeof window !== "undefined") {
        window.localStorage.setItem(itemName, JSON.stringify(history.slice(0, maxItems)))
      } else {
        console.error("updateLocalStorageHistory called on the server")
      }
    }
  }
}
