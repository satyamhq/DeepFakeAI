// it would be nice to get the URL of the current deployment from Vercel, but apparently that's not
// supported because "environment variables should be immutable" or somesuch nonsense
// TODO: use NEXT_PUBLIC_VERCEL_URL
export const siteUrl = "OPEN-TODO-PLACEHOLDER"

// TODO: rationalize this and siteUrl
export const currentSiteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL_BASE ?? "http://localhost:3000"

export const termsUrl = "OPEN-TODO-PLACEHOLDER"

export const privacyUrl = "OPEN-TODO-PLACEHOLDER"

export const signInUrl = "/signin"

export const signUpUrl = "/signup"

export const contactUrl = "mailto:OPEN-TODO-PLACEHOLDER"

export const disclaimerText =
  "Disclaimer: TrueMedia.org uses both leading vendors and state-of-the-art academic AI methods. However, errors can occur."
