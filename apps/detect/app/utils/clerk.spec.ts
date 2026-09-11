import { isClerkOrgId, isClerkUserId } from "./clerk-util"

describe("Clerk utils recognize various user and org IDs", () => {
  it("Recognizes a Clerk userId", () => {
    expect(isClerkUserId("user_2kyqxobf4H96r3eYwpzF7RUF07a")).toBeTruthy()
  })

  it("Does not recognize a prisma user Id as a Clerk userId", () => {
    expect(isClerkUserId("clt7e36uq00005esi4d10phcy")).toBeFalsy()
  })

  it("Recognizes a Clerk orgId", () => {
    expect(isClerkOrgId("org_2iyfk8aADmshJaDniY2ZTWxzs0j")).toBeTruthy()
  })
})
