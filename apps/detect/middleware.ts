import { clerkMiddleware } from "@clerk/nextjs/server"
import { signInUrl, signUpUrl } from "./app/site"

export default clerkMiddleware({ signInUrl: signInUrl, signUpUrl: signUpUrl })

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
