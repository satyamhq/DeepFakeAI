import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient, createServerClient } from "@supabase/ssr"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://placeholder-project.supabase.co"
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_placeholder_key"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  supabaseKey

/**
 * Standard Supabase client for backend data operations.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

let cachedBrowserClient: SupabaseClient | null = null

/**
 * Creates or returns the singleton Supabase browser client with cookie-based session persistence.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  if (!cachedBrowserClient) {
    cachedBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return cachedBrowserClient
}

/**
 * Creates a Supabase server client for Server Components, Server Actions, and Route Handlers.
 */
export function getSupabaseServerClient(cookieStore?: any): SupabaseClient {
  if (!cookieStore) {
    return createClient(supabaseUrl, supabaseKey)
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return typeof cookieStore.getAll === "function" ? cookieStore.getAll() : []
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          if (typeof cookieStore.set === "function") {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          }
        } catch {
          // Ignored in read-only Server Component contexts
        }
      },
    },
  })
}

/**
 * Helper to fetch notable media from Supabase table or return empty array if unpopulated.
 */
export async function getNotableMediaFromSupabase(limit = 20) {
  try {
    const { data, error } = await supabase
      .from("notable_media")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Supabase notable_media fetch notice:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("Supabase query error:", err);
    return [];
  }
}

/**
 * Helper to fetch recent queries from Supabase or return empty array.
 */
export async function getRecentQueriesFromSupabase(userId?: string, limit = 10) {
  try {
    let query = supabase
      .from("queries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Helper to insert query history into Supabase.
 */
export async function recordQueryInSupabase(queryData: Record<string, unknown>) {
  try {
    const { error } = await supabase.from("queries").insert([queryData]);
    if (error) {
      console.warn("Supabase recordQuery notice:", error.message);
    }
  } catch (err) {
    console.warn("Supabase recordQuery error:", err);
  }
}
