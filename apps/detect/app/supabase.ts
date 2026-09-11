import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder-project.supabase.co"
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_placeholder_key"

/**
 * Standard Supabase client for data operations.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

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
