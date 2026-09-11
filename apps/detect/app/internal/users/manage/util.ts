export function normalizeEmail(email: string) {
  const lbidx = email.indexOf("<")
  const rbidx = email.indexOf(">")
  if (lbidx >= 0 && rbidx > 0 && lbidx < rbidx) {
    return email.substring(lbidx + 1, rbidx)
  }
  return email.toLocaleLowerCase()
}

export function validateEmail(email: string): string | undefined {
  // our trimming function should extract the email part, but if that fails, complain
  const disallowedCharacters = /[ <>]/
  if (!email || !email.includes("@")) return "Email should have an '@' in it."
  else if (disallowedCharacters.test(email)) return "Email address invalid."
}
