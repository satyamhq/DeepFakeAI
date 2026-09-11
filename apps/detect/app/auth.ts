import { UserResource } from "@clerk/types"

// friends can view internal pages, but can't change anything
const friends: string[] = []

// internal pages are only accessible by certain user email domains
const internalDomains = ["@truemedia.org"]

// certain trusted domains are allowed to download our cached media
const downloadDomains = ["@truemedia.org"]

export const domainMatches = (email: string | undefined, domains: string[]) =>
  !!email && domains.find((dd) => email.endsWith(dd)) !== undefined

const admins: string[] = [
  /* Fill in with emails of users who are admins */
]
const editors: string[] = [
  /* Fill in with emails of users who are editors */
]

const anonymousLevel = 0
const userLevel = 1
const friendLevel = 2
const internalLevel = 3
const adminLevel = 4

export const userRoles = {
  anonymous: { level: anonymousLevel, name: "anonymous" },
  user: { level: userLevel, name: "user" },
  friend: { level: friendLevel, name: "friend" },
  internal: { level: internalLevel, name: "internal" },
  admin: { level: adminLevel, name: "admin" },
}

/** Defines the (nested) authentication roles for the webapp. */
export class Role {
  readonly level: number
  readonly id: string // will be "" for anonymous sessions
  readonly email: string // will be "" for anonymous sessions

  constructor(level: number, id: string, email: string) {
    if (level >= userLevel && (!id || !email)) {
      throw new Error(`Missing id or email for authed user [id=${id}, email=${email}]`)
    }
    this.level = level
    this.id = id
    this.email = email
  }

  /** Is the user level strictly at anonymous and not higher. */
  get isNotLoggedIn() {
    return this.level === 0
  }
  /** Someone is logged in if they are at user level or higher */
  get isLoggedIn() {
    return this.level >= userLevel
  }

  /** Is at least "anonymous" level. */
  get anonymous() {
    return this.level >= anonymousLevel
  }
  /** Is at least "user" level. */
  get user() {
    return this.level >= userLevel
  }
  /** Is at least "friend" level. */
  get friend() {
    return this.level >= friendLevel
  }
  /** Is at least "internal" level. */
  get internal() {
    return this.level >= internalLevel
  }
  /** Is at least "admin" level. */
  get admin() {
    return this.level >= adminLevel
  }

  /** Whether this user can see and edit media metadata. */
  get canEditMetadata() {
    return this.internal || editors.includes(this.email)
  }

  /** Whether this user can download cached media. */
  get canDownload() {
    return domainMatches(this.email, downloadDomains)
  }

  toString() {
    return `${this.email} // ${this.level}`
  }
}

export function getRoleByUser(user: UserResource | null | undefined): Role {
  return getRoleByIdEmail(user?.externalId, user?.primaryEmailAddress?.emailAddress)
}

export function getRoleByIdEmail(id: string | null | undefined, email: string | null | undefined): Role {
  if (!id || !email) return new Role(anonymousLevel, "", "")
  if (admins.includes(email)) return new Role(adminLevel, id, email)
  if (domainMatches(email, internalDomains)) return new Role(internalLevel, id, email)
  if (friends.includes(email)) return new Role(friendLevel, id, email)
  return new Role(userLevel, id, email)
}

// NOTE: Future cuid may change, they are only guaranteed to start with `c` and have at least 7 characters
// See https://github.com/paralleldrive/cuid/issues/88#issuecomment-339848922
const cuidRegex = /^c[a-z0-9]{24}$/
export function isCuid(s: string | null | undefined): boolean {
  return cuidRegex.test(s || "")
}
