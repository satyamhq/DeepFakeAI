export const ANONYMOUS_USER_ID = "anonymousanonymousanonymo"
export const ANONYMOUS_USER_NAME = "All Anonymous Users"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}
