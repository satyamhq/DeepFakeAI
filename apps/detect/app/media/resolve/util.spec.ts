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

  it("accepts youtube and linkedin domains", () => {
    expect(isPostUrlInAllowList("https://www.youtube.com/watch?v=123")).toBeTruthy()
    expect(isPostUrlInAllowList("https://youtu.be/123")).toBeTruthy()
    expect(isPostUrlInAllowList("https://www.linkedin.com/posts/example")).toBeTruthy()
    expect(isPostUrlInAllowList("https://lnkd.in/example")).toBeTruthy()
  })

  it("rejects removed sources tiktok and truth social", () => {
    expect(isPostUrlInAllowList("https://www.tiktok.com/@user/video/123")).toBeFalsy()
    expect(isPostUrlInAllowList("https://truthsocial.com/@user/posts/123")).toBeFalsy()
  })
})
