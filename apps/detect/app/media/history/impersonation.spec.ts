import { determineUserHistoryParams } from "./impersonation"

const startIdUser = "placeholder_start_id_user"
const startIdOrg = "placeholder_start_id_org"
const sampleIdUser = "user_2kZV9aYpKAFS6N0SxsWI6e9h62R"
const sampleIdOrg = "org_2mAKqu6gc701brIRZp2mic57qyh"

it("leaves ?as=undefined alone", async () => {
  const { userId, orgId, isImpersonating } = determineUserHistoryParams(startIdUser, startIdOrg, undefined)
  expect(userId).toBe(startIdUser)
  expect(orgId).toBe(startIdOrg)
  expect(isImpersonating).toBe(false)
})

it("leaves ?as='' alone", async () => {
  const { userId, orgId, isImpersonating } = determineUserHistoryParams(startIdUser, startIdOrg, "")
  expect(userId).toBe(startIdUser)
  expect(orgId).toBe(startIdOrg)
  expect(isImpersonating).toBe(false)
})

it("leaves ?as='hotdog' alone", async () => {
  const { userId, orgId, isImpersonating } = determineUserHistoryParams(startIdUser, startIdOrg, "hotdog")
  expect(userId).toBe(startIdUser)
  expect(orgId).toBe(startIdOrg)
  expect(isImpersonating).toBe(false)
})

it("replaces userId", async () => {
  const { userId, orgId, isImpersonating } = determineUserHistoryParams(startIdUser, startIdOrg, sampleIdUser)
  expect(userId).toBe(sampleIdUser)
  expect(orgId).toBe(null)
  expect(isImpersonating).toBe(true)
})

it("replaces orgId", async () => {
  const { userId, orgId, isImpersonating } = determineUserHistoryParams(startIdUser, startIdOrg, sampleIdOrg)
  expect(userId).toBe(null)
  expect(orgId).toBe(sampleIdOrg)
  expect(isImpersonating).toBe(true)
})
