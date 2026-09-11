import { NextResponse, type NextRequest } from "next/server"
import { clerkMiddleware } from "@clerk/nextjs/server"
import { signInUrl, signUpUrl } from "./app/site"

const isMockClerkKey =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("ZXhhbXBsZS") ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_clerk")

export default function middleware(req: NextRequest, ev: any) {
  if (isMockClerkKey) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-clerk-auth-status", "signed-out")
    requestHeaders.set("x-clerk-auth-reason", "dev-browser-missing")
    requestHeaders.set("x-clerk-clerk-url", req.nextUrl.toString())
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  return clerkMiddleware({ signInUrl: signInUrl, signUpUrl: signUpUrl })(req, ev)
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
