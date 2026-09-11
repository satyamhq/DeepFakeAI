import { textQuestion, askYesNoAboutMedia } from "./openai"

const textTestCases = [
  { desc: "Photo of signs at rally", url: "https://pbs.twimg.com/media/GS2YcA3WoAAoBj5.jpg", expected: "NO" },
  {
    desc: "Trump in front of sign",
    url: "https://<TODO-PLACEHOLDER>.amazonaws.com/<TODO-MEDIA-ITEM>",
    expected: "NO",
  },
  {
    desc: "Biden with overlaid message",
    url: "https://<TODO-PLACEHOLDER>.amazonaws.com/<TODO-MEDIA-ITEM>",
    expected: "YES",
  },
]

const timeoutMS = 10000

textTestCases.forEach(({ desc, url, expected }) => {
  // skip running these tests regularly in CI because they are slow and prone to flakiness (calling openai)
  test.skip(
    `text analysis: should return ${expected} for ${desc}`,
    async () => {
      const result = await askYesNoAboutMedia(textQuestion, url, 0)
      expect(result!.answer).toBe(expected)
    },
    timeoutMS,
  )
})
