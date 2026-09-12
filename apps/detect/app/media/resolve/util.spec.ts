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

  it("accepts only supported sources: X, YouTube, LinkedIn, Reddit, Google Drive, Instagram, Facebook", () => {
    expect(isPostUrlInAllowList("https://www.youtube.com/watch?v=123")).toBeTruthy()
    expect(isPostUrlInAllowList("https://youtu.be/123")).toBeTruthy()
    expect(isPostUrlInAllowList("https://www.linkedin.com/posts/example")).toBeTruthy()
    expect(isPostUrlInAllowList("https://lnkd.in/example")).toBeTruthy()
    expect(isPostUrlInAllowList("https://x.com/user/status/123")).toBeTruthy()
    expect(isPostUrlInAllowList("https://www.facebook.com/post/123")).toBeTruthy()
    expect(isPostUrlInAllowList("https://www.instagram.com/p/123")).toBeTruthy()
    expect(isPostUrlInAllowList("https://drive.google.com/file/d/123")).toBeTruthy()
    // TikTok and Truth Social are completely removed/disallowed
    expect(isPostUrlInAllowList("https://www.tiktok.com/@user/video/123")).toBeFalsy()
    expect(isPostUrlInAllowList("https://truthsocial.com/@user/posts/123")).toBeFalsy()
  })
})
