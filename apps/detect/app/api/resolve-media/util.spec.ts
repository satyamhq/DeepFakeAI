import { needsKeywordAdded, needsKeywordRemoved } from "./util"

describe("needsKeywordAdded()", () => {
  it("should add keyword and preserve existing keywords", () => {
    const keywords = "key1 key2"
    const newKeyword = "key3"
    const result = needsKeywordAdded({ keywords, newKeyword })
    expect(result.needsChange).toBe(true)
    expect(result.keywords).toBe("key1 key2 key3")
  })

  it("should return original keyword when there are no keywords", () => {
    const keywords = ""
    const newKeyword = "key3"
    const result = needsKeywordAdded({ keywords, newKeyword })
    expect(result.needsChange).toBe(true)
    expect(result.keywords).toBe("key3")
  })

  it("should return original keyword when keywords are undefined", () => {
    const keywords = undefined
    const newKeyword = "key3"
    const result = needsKeywordAdded({ keywords, newKeyword })
    expect(result.needsChange).toBe(true)
    expect(result.keywords).toBe("key3")
  })

  it("should change nothing when keyword is already there", () => {
    const keywords = "key1 key3"
    const newKeyword = "key3"
    const result = needsKeywordAdded({ keywords, newKeyword })
    expect(result.needsChange).toBe(false)
    expect(result.keywords).toBe("key1 key3")
  })
})

describe("needsKeywordRemoved", () => {
  it("should remove keyword and preserve existing keywords", () => {
    const keywords = "key1 key2"
    const keywordToDelete = "key2"
    const result = needsKeywordRemoved({ keywords, keywordToDelete })
    expect(result.needsChange).toBe(true)
    expect(result.keywords).toBe("key1")
  })

  it("should return original keyword when there are no keywords to remove", () => {
    const keywords = ""
    const keywordToDelete = "key3"
    const result = needsKeywordRemoved({ keywords, keywordToDelete })
    expect(result.needsChange).toBe(false)
    expect(result.keywords).toBe("")
  })

  it("should return original keyword when keywords are falsy", () => {
    const keywords1 = undefined
    const keywordToDelete = "key3"
    const result = needsKeywordRemoved({ keywords: keywords1, keywordToDelete })
    expect(result.needsChange).toBe(false)
    expect(result.keywords).toBe(keywords1)

    const keywords2 = ""
    const result2 = needsKeywordRemoved({ keywords: keywords2, keywordToDelete })
    expect(result2.needsChange).toBe(false)
    expect(result2.keywords).toBe(keywords2)
  })

  it("should change nothing when keyword to remove is not present", () => {
    const keywords = "key1 key2"
    const keywordToDelete = "key3"
    const result = needsKeywordRemoved({ keywords, keywordToDelete })
    expect(result.needsChange).toBe(false)
    expect(result.keywords).toBe("key1 key2")
  })

  it("should return empty string if keyword to be removed is the only keyword", () => {
    const keywords = "key1"
    const keywordToDelete = "key1"
    const result = needsKeywordRemoved({ keywords, keywordToDelete })
    expect(result.needsChange).toBe(true)
    expect(result.keywords).toBe("")
  })

  it("should return false for partial matches", () => {
    const keywords = "hayneedlestack"
    const keywordToDelete = "needle"
    const result = needsKeywordRemoved({ keywords, keywordToDelete })
    expect(result.needsChange).toBe(false)
    expect(result.keywords).toBe(keywords)
  })
})
