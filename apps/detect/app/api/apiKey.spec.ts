import { generateApiKey, parseAPIKey } from "./apiKey"

describe("Api keys", () => {
  it("test api key generation produces well formed api keys", async () => {
    const key = generateApiKey()
    expect(parseAPIKey(key)).not.toBeNull()
  })

  it("changing one character in the api key makes it not parse", async () => {
    const key = generateApiKey()

    // increment the 8th character by 1 in ascii
    const modified = key.slice(0, 8) + String.fromCharCode(key.charCodeAt(8) + 1) + key.slice(9)
    expect(parseAPIKey(key)).not.toBeNull()
    expect(parseAPIKey(modified)).toBeNull()
  })
})
