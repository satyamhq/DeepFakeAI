import { determineSourceAccount } from "./media"

const SOURCE_ACCOUNT_TEST_CASES = [
  // [postUrl, expectedAccount]
  ["https://www.tiktok.com/@user/video/1234567890123456789", "user"],
  ["https://twitter.com/etzioni/status/1753233020377849873", "etzioni"],
  ["https://x.com/aerinykim/status/1755977276783800771?s=20", "aerinykim"],
  ["https://www.reddit.com/r/midjourney/comments/12cxzt6/joe_bidens_visit_to_ireland_next_week/", "r/midjourney"],
  ["https://www.youtube.com/watch?v=qzWuhR94n18&t=2662s", null],
  [null, null],
]

it("determineSourceAccount() should extract the posting account if present", () => {
  for (const [postUrl, expectedAccount] of SOURCE_ACCOUNT_TEST_CASES) {
    expect(determineSourceAccount(postUrl as string)).toBe(expectedAccount)
  }
})
