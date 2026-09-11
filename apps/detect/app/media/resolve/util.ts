export function isPostUrlInAllowList(postUrl: string) {
  // I sorted and looked through all the post_urls in the DB to make this list.
  const allowedDomains = [
    "facebook.com",
    "fb.com",
    "instagram.com",
    "pbs.twimg.com",
    "reddit.com",
    "redd.it",
    "tiktok.com",
    "truthsocial.com",
    "twimg.com",
    "twitter.com",
    "x.com",
  ]
  try {
    // Creating a URL without "http://" will crash, like new URL("instagram.com")
    postUrl = postUrl.startsWith("http") ? postUrl : "http://" + postUrl
    const domain = new URL(postUrl).hostname.toLowerCase()
    for (const allowedDomain of allowedDomains) {
      const regex = new RegExp(`(^|\\.)${allowedDomain.replace(".", "\\.")}$`)
      if (regex.test(domain)) {
        return true
      }
    }
  } catch (error) {
    return false
  }
  return false
}
