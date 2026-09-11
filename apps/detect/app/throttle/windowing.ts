import { UserType } from "@prisma/client"

export function getCurrentWindowStart() {
  const throttleWindowStart = new Date()
  throttleWindowStart.setMilliseconds(0)
  throttleWindowStart.setSeconds(0)
  throttleWindowStart.setMinutes(0)

  return throttleWindowStart
}

const globalLimits: Record<UserType, number> = {
  // the 100 anonymous limit is also enforced in app/api/resolve-media/route.ts
  [UserType.ANONYMOUS]: 100,
  [UserType.REGISTERED]: 150,
  [UserType.API]: 1650,
}

export function throttleLimitForUserType(userType: UserType): number {
  return globalLimits[userType]
}
