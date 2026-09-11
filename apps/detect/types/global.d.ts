export {}

declare global {
  /**
   * This interface describes custom claims we add to our session tokens
   * in the Clerk dashboard.
   */
  interface CustomJwtSessionClaims {
    email?: string
    externalId?: string
    agreedTerms: boolean
  }

  // Defines the shape of the user metadata stored in Clerk-land
  // This is stricter than Clerk's types and enforces a consistent schema for the metadata.
  interface UserPublicMetadata {
    // Whether or not the user agreed to terms and conditions. This must be "true" to use the app.
    agreedTerms: boolean
    // Whether or not the user consents to marketing emails. This is plumbed through to Pipedrive.
    emailConsent?: boolean
    // The user's provided "organization," plumbed through to Pipedrive and NOT used for teams in the app.
    org?: string
  }
}
