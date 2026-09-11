import { normalizeEmail, validateEmail } from "./util"

const fullEmails = [
  "Bob Smith <bob@smith.org>",
  "John Smith <john.smith@example.org>",
  "John Doe <john@example.com>",
  '"John Doe" <john@example.com>',
]

const bareEmails = [
  "foo@bar.com",
  "simple@example.com",
  "very.common@example.com",
  "FirstName.LastName@EasierReading.org",
  "x@example.com",
  "long.email-address-with-hyphens@and.subdomains.example.com",
  "user.name+tag+sorting@example.com",
  "name/surname@example.com",
  "admin@example",
  "example@s.example",
  '"john..doe"@example.org',
  "mailhost!username@example.org",
  "user%example.com@example.org",
  "user-@example.org",
  "postmaster@[123.123.123.123]",
  "postmaster@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]",
  "_test@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]",
  // we don't support these weird but apparently valid email addresses; sorry kids
  // '" "@example.org',
  // '"very.(),:;<>[]\".VERY.\"very@\\ \"very\".unusual"@strange.example.com',
]

const nonEmails = [
  "https://docs.google.com/spreadsheets/d/1XEC9n5hilbpPk6FQETM9voYNwxg3MsYHmz19auavjQE/edit#gid=1556112290",
  "abc.example.com",
  // if we want to get fancy, we can update our code to reject these
  // "a@b@c@example.com",
  // 'a"b(c)d,e:f;g<h>i[j\k]l@example.com',
  // 'just"not"right@example.com',
  // 'this is"not\allowed@example.com',
  // 'this\ still\"not\\allowed@example.com',
  // '1234567890123456789012345678901234567890123456789012345678901234+x@example.com',
  // 'i.like.underscores@but_they_are_not_allowed_in_this_part',
]

it("normalizeEmail() trims name and brackets", () => {
  expect(normalizeEmail(fullEmails[0])).toBe("bob@smith.org")
  for (const bareEmail of bareEmails) expect(normalizeEmail(bareEmail)).toBe(bareEmail.toLocaleLowerCase())
})

it("validateEmail() rejects weird emails", () => {
  for (const fullEmail of fullEmails) expect(validateEmail(normalizeEmail(fullEmail))).toBe(undefined)
  for (const bareEmail of bareEmails) expect(validateEmail(normalizeEmail(bareEmail))).toBe(undefined)
  for (const bareEmail of bareEmails) expect(validateEmail(bareEmail)).toBe(undefined)
  for (const fullEmail of fullEmails) expect(validateEmail(fullEmail)).not.toBe(undefined)
  for (const nonEmail of nonEmails) expect(validateEmail(normalizeEmail(nonEmail))).not.toBe(undefined)
})
