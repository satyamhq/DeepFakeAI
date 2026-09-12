import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder-project.supabase.co"
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "sb_placeholder_key"

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl
    const isPublic =
      pathname.startsWith("/login") ||
      pathname.startsWith("/signin") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/about") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/faq") ||
      pathname.startsWith("/contact") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.includes(".")

    const allowAnon = process.env.ALLOW_ANONYMOUS_USAGE === "true"

    if (!user && !isPublic && !allowAnon) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      if (pathname !== "/") {
        url.searchParams.set("redirect_to", pathname)
      }
      return NextResponse.redirect(url)
    }
  } catch (err) {
    // If Supabase is unreachable or unconfigured during build, allow request through
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
