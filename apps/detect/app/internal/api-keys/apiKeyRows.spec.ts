import { compareApiKeyRows, ApiKeyTableRowData } from "./apiKeyRows"

const externalA = { fullName: "eA", email: "eA@external.com", id: "", externalId: "" }
const externalB = { fullName: "eB", email: "eB@external.com", id: "", externalId: "" }
const externalC = { fullName: "eC", email: "eC@external.com", id: "", externalId: "" }
const externalNoName = { fullName: "", email: "eNoName@external.com", id: "", externalId: "" }
const internalA = { fullName: "iA", email: "iA@truemedia.org", id: "", externalId: "" }
const internalB = { fullName: "iB", email: "iB@truemedia.org", id: "", externalId: "" }
const internalNoName = { fullName: "", email: "iNoName@truemedia.org", id: "", externalId: "" }

const rows: ApiKeyTableRowData[] = [
  {
    organization: { name: "TrueMedia", id: "" },
    clerkUser: internalB,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: null,
    clerkUser: null,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: { name: "External 2", id: "" },
    clerkUser: externalC,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: null,
    clerkUser: externalA,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: { name: "External", id: "" },
    clerkUser: null,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: { name: "TrueMedia", id: "" },
    clerkUser: internalNoName,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: { name: "External", id: "" },
    clerkUser: externalC,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: { name: "TrueMedia", id: "" },
    clerkUser: internalA,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: { name: "External", id: "" },
    clerkUser: externalNoName,
    apiKey: null,
    orgMemberActive: false,
  },
  {
    organization: { name: "External", id: "" },
    clerkUser: externalB,
    apiKey: null,
    orgMemberActive: false,
  },
]

describe("API key rows sorting", () => {
  it("Sorts rows", () => {
    expect(
      rows.sort(compareApiKeyRows).map((r) => ({ oName: r.organization?.name, uName: r.clerkUser?.fullName })),
    ).toStrictEqual([
      { oName: "External", uName: externalB.fullName },
      { oName: "External", uName: externalC.fullName },
      { oName: "External", uName: externalNoName.fullName },
      { oName: "External", uName: undefined },
      { oName: "External 2", uName: externalC.fullName },
      { oName: "TrueMedia", uName: internalA.fullName },
      { oName: "TrueMedia", uName: internalB.fullName },
      { oName: "TrueMedia", uName: internalNoName.fullName },
      { oName: undefined, uName: externalA.fullName },
      { oName: undefined, uName: undefined },
    ])
  })
})
