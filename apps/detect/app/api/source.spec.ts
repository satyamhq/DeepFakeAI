import { MediaPublisher } from "@prisma/client"
import { assembleMastodonUserName, extractMediaSourceData, isMastodon } from "./source"

describe("isMastodon", () => {
  it("handles direct Mastodon URLs", () => {
    const url = new URL("https://foo.social/@bleeper/112466701799319435")
    expect(isMastodon(url)).toBeTruthy()
  })

  it("handles indirect Mastodon URLs", () => {
    const url = new URL("https://foo.social/@thedude@bar.club/112466701799319435")
    expect(isMastodon(url)).toBeTruthy()
  })

  it("is not fooled by Twitter URLs", () => {
    let url = new URL("https://www.twitter.com/AngryInternetUser/6874391512")
    expect(isMastodon(url)).toBeFalsy()
    url = new URL("https://www.x.com/AngryInternetUser/6874391512")
    expect(isMastodon(url)).toBeFalsy()
  })

  it("is not fooled by TikTok URLs", () => {
    const url = new URL("https://www.tiktok.com/@lowersyouriq/video/7364519640078257438")
    expect(isMastodon(url)).toBeFalsy()
  })
})

describe("assembleMastodonUserName", () => {
  it("handles users on the same instance", () => {
    // The user's `acct` field will not contain an instance domain
    const acct = { acct: "someguy", uri: "https://foo.social/users/someguy" }
    expect(assembleMastodonUserName(acct)).toEqual("someguy@foo.social")
  })

  it("handles users on a different instance", () => {
    // The user's `acct` field *will* contain an instance domain
    const acct = { acct: "someguy@foo.social", uri: "https://foo.social/users/someguy" }
    expect(assembleMastodonUserName(acct)).toEqual("someguy@foo.social")
  })
})

describe("extractMediaSourceData", () => {
  it("doesn't explode if given an invalid URL", () => {
    expect(extractMediaSourceData("lolpwnt", {})).toBeUndefined()
  })

  it("returns undefined for unrecognized valid URLs", () => {
    expect(extractMediaSourceData("https://www.notasocialmediaplatform.com", {})).toBeUndefined()
  })

  // postData shapes are based on the known shape of responses at the time this test was written...
  // Changes made by these platforms to their APIs
  // may break functionality without failing this unit test.
  it("correctly extracts data for Facebook media", () => {
    const postUrl = "https://www.facebook.com/watch/?v=1234567890"
    const postData = {
      data: {
        nodes: [
          {
            owner: {
              id: "100067987654321",
              name: "Jeff Lebowski",
            },
          },
        ],
      },
    }
    const expected = {
      source: MediaPublisher.FACEBOOK,
      sourceUserId: "100067987654321",
      sourceUserName: "Jeff Lebowski",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for differently-shaped Facebook media", () => {
    const postUrl =
      "https://www.facebook.com/87654321/posts/mjkfdsa89324khlfsd294p6k2kCD31yzaeGAtw2UyDusgJHQoN5Jas9HpFdTmrYl/"
    const postData = {
      data: {
        node: {
          actors: [
            {
              id: "100067987654321",
              name: "Jeff Lebowski",
            },
          ],
        },
      },
    }
    const expected = {
      source: MediaPublisher.FACEBOOK,
      sourceUserId: "100067987654321",
      sourceUserName: "Jeff Lebowski",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for Instagram media", () => {
    const postUrl = "https://www.instagram.com/p/C7LBvcfRJAd/"
    const postData = {
      items: [
        {
          user: {
            username: "someguy",
            id: "123456",
          },
        },
      ],
    }
    const expected = {
      source: MediaPublisher.INSTAGRAM,
      sourceUserId: "123456",
      sourceUserName: "someguy",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for Mastodon media", () => {
    const postUrl = "https://foo.social/@someguy/112466701799319435"
    const postData = {
      account: {
        acct: "someguy",
        uri: "https://foo.social/users/someguy",
      },
    }
    const expected = {
      source: MediaPublisher.MASTODON,
      sourceUserId: undefined, // We do not get unique IDs for Mastodon users
      sourceUserName: "someguy@foo.social",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for Reddit media", () => {
    const postUrl = "https://www.reddit.com/r/reallycoolsubreddit/comments/1cyonrs/post_title/"
    const postData = {
      kind: "Listing",
      data: {
        children: [
          {
            kind: "t3",
            data: {
              author_fullname: "t2_123456",
              author: "thedude",
            },
          },
        ],
      },
    }
    const expected = {
      source: MediaPublisher.REDDIT,
      sourceUserId: "t2_123456",
      sourceUserName: "thedude",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for TikTok media", () => {
    const postUrl = "https://www.tiktok.com/@alady/video/123445556657453"
    const postData = {
      result: {
        author: {
          nickname: "a lady", // this is the display name, don't use it!
          username: "@alady",
        },
      },
    }
    const expected = {
      source: MediaPublisher.TIKTOK,
      sourceUserId: undefined, // We do not get unique IDs for TikTok users
      sourceUserName: "alady",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for Twitter media with twitter.com URLs", () => {
    const postUrl = "https://twitter.com/dudebro/status/1793039071067124147"
    const postData = {
      data: {
        author_id: "112233",
      },
      includes: {
        users: [
          {
            id: "112233",
            username: "dudebro",
          },
        ],
      },
    }
    const expected = {
      source: MediaPublisher.X,
      sourceUserId: "112233",
      sourceUserName: "dudebro",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for Twitter media with x.com URLs", () => {
    const postUrl = "https://x.com/dudebro/status/1793039071067124147"
    const postData = {
      data: {
        author_id: "112233",
      },
      includes: {
        users: [
          {
            id: "112233",
            username: "dudebro",
          },
        ],
      },
    }
    const expected = {
      source: MediaPublisher.X,
      sourceUserId: "112233",
      sourceUserName: "dudebro",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for Twitter media missing the author extension", () => {
    const postUrl = "https://x.com/dudebro/status/1793039071067124147"
    const postData = {
      data: {
        author_id: "112233",
      },
    }
    const expected = {
      source: MediaPublisher.X,
      sourceUserId: "112233",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for YouTube media with youtube.com URLs", () => {
    const postUrl = "https://www.youtube.com/watch?v=videoidhere"
    const postData = {
      videoDetails: {
        channelId: "7654321ABcd",
        author: "someyoutuber",
      },
    }
    const expected = {
      source: MediaPublisher.YOUTUBE,
      sourceUserId: "7654321ABcd",
      sourceUserName: "someyoutuber",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })

  it("correctly extracts data for YouTube media with youtu.be URLs", () => {
    const postUrl = "https://www.youtu.be/watch?v=videoidhere"
    const postData = {
      videoDetails: {
        channelId: "7654321ABcd",
        author: "someyoutuber",
      },
    }
    const expected = {
      source: MediaPublisher.YOUTUBE,
      sourceUserId: "7654321ABcd",
      sourceUserName: "someyoutuber",
    }
    expect(extractMediaSourceData(postUrl, postData)).toEqual(expected)
  })
})
