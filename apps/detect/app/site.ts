export const currentSiteBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL_BASE ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000"

export const siteUrl = currentSiteBaseUrl

export const termsUrl = "/terms"

export const privacyUrl = "/privacy"

export const contactUrl = "/contact"

export const aboutUrl = "/about"

export const signInUrl = "/"

export const signUpUrl = "/"

export const disclaimerText =
  "Disclaimer: DeepFakeAI uses both leading vendors and state-of-the-art academic AI methods. However, errors can occur."
