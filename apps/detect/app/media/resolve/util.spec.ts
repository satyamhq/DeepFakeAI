import { isPostUrlInAllowList } from "./util"

describe("isPostUrlInAllowList", () => {
  it("accepts a simple perfect example", () => {
    const url = "http://instagram.com"
    expect(isPostUrlInAllowList(url)).toBeTruthy()
  })

  it("prepends http:// if the protocol is missing", () => {
    const url = "instagram.com"
    expect(isPostUrlInAllowList(url)).toBeTruthy()
  })

  it("accepts www.", () => {
    const url = "http://www.instagram.com"
    expect(isPostUrlInAllowList(url)).toBeTruthy()
  })

  it("prepends http:// when www is present.", () => {
    const url = "www.instagram.com"
    expect(isPostUrlInAllowList(url)).toBeTruthy()
  })

  it("fails a completely disallowed domain", () => {
    const url = "evil.com"
    expect(isPostUrlInAllowList(url)).toBeFalsy()
  })

  it("fails for evil attempts", () => {
    const url = "evilinstagram.com"
    expect(isPostUrlInAllowList(url)).toBeFalsy()
  })
  it("fails for urls not explicitly matching the domain we're testing for", () => {
    const url = "suffix.com"
    expect(isPostUrlInAllowList(url)).toBeFalsy()
  })
  it("ignores contenent after the .com", () => {
    const url = "reddit.com/r/truemedia"
    expect(isPostUrlInAllowList(url)).toBeTruthy()
  })
})
