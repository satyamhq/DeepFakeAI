import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "../../supabase"
import { db } from "../../server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("redirect_to") || searchParams.get("next") || "/"

  if (code) {
    const cookieStore = cookies()
    const supabase = getSupabaseServerClient(cookieStore)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Sync Google user into public.users
      try {
        await db.user.upsert({
          where: { id: data.user.id },
          create: {
            id: data.user.id,
            email: data.user.email || `${data.user.id}@user.deepfakeai.org`,
          },
          update: {
            email: data.user.email || `${data.user.id}@user.deepfakeai.org`,
          },
        })
      } catch (syncErr: any) {
        console.warn("[auth/callback] User sync notice:", syncErr?.message || syncErr)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error("[auth/callback] Code exchange failed:", error?.message)
    const errorMessage = error?.message || "Failed to exchange OAuth code"
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMessage)}`)
  }

  const errorParam = searchParams.get("error_description") || searchParams.get("error")
  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`)
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid+OAuth+callback`)
}
