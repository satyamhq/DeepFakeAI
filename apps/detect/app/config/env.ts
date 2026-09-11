import { z } from "zod"

/**
 * Validates that a string is a non-empty, non-placeholder value.
 */
function isSetAndNotPlaceholder(val: string | undefined): val is string {
  if (!val) return false
  const trimmed = val.trim()
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith("your-") &&
    !trimmed.includes("change-me") &&
    !trimmed.includes("XXXXXXXXXX")
  )
}

const envSchema = z.object({
  // Supabase Core
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("media-uploads"),

  // Application
  ANON_QUERY: z.string().default("true"),
  NEXT_PUBLIC_SITE_URL_BASE: z.string().optional(),
  RENDER_EXTERNAL_URL: z.string().optional(),

  // Microservices
  SCHEDULER_URL: z.string().optional(),
  SCHEDULER_SHARED_AUTH_SECRET: z.string().optional(),
  WEBAPP_TRPC_URL: z.string().optional(),
  MEDIA_RESOLVER_URL: z.string().optional(),

  // AI Detectors (All optional with automatic fallback)
  REALITY_API_KEY: z.string().optional(),
  AIORNOT_API_KEY: z.string().optional(),
  AION_API_KEY: z.string().optional(),
  HIVE_API_KEY: z.string().optional(),
  HIVE_SECRET_KEY: z.string().optional(),
  HIVE_ACCESS_KEY_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  SENSITY_API_TOKEN: z.string().optional(),
  DFTOTAL_API_KEY: z.string().optional(),
  LOCCUS_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  VETRIC_API_KEY: z.string().optional(),
  MICROSOFT_API_KEY: z.string().optional(),

  // Observability & Feature Flags
  NEXT_PUBLIC_GOOGLE_ANALYTICS: z.string().optional(),
  SLACK_TOKEN: z.string().optional(),
  POSTMARK_TOKEN: z.string().optional(),
  GROUND_TRUTH_UPDATE_EMAILS_ENABLED: z.string().default("false"),
  VERIFIED_LABEL_ENABLED: z.string().default("false"),
  CREATE_PIPEDRIVE_CONTACT: z.string().default("false"),
})

export type AppEnv = z.infer<typeof envSchema>

let validatedEnv: AppEnv | null = null

/**
 * Validates and returns the application environment configuration.
 * Logs actionable diagnostics if essential infrastructure variables are missing.
 */
export function getAppEnv(): AppEnv {
  if (validatedEnv) return validatedEnv

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    console.error(`[DeepFakeAI Config Error] Invalid environment configuration:\n${errorDetails}`)
  }

  const data = parsed.success ? parsed.data : (process.env as unknown as AppEnv)

  const supabaseUrl = data.SUPABASE_URL || data.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = data.SUPABASE_SECRET_KEY || data.SUPABASE_PUBLISHABLE_KEY || data.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (process.env.NODE_ENV === "production" && (!supabaseUrl || !supabaseKey)) {
    console.warn(
      "[DeepFakeAI Warning] Production environment detected without fully configured Supabase credentials. " +
        "Please set SUPABASE_URL and SUPABASE_SECRET_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in your hosting dashboard."
    )
  }

  validatedEnv = data
  return validatedEnv
}

/**
 * Helper to check if a specific API key is active (present and not a template placeholder).
 */
export function isProviderConfigured(providerKey: keyof AppEnv): boolean {
  const env = getAppEnv()
  return isSetAndNotPlaceholder(env[providerKey] as string | undefined)
}

/**
 * Retrieves the effective Supabase configuration for server execution.
 */
export function getServerSupabaseConfig() {
  const env = getAppEnv()
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  const bucket = env.SUPABASE_STORAGE_BUCKET || "media-uploads"
  return { url, key, bucket }
}

/**
 * Retrieves the client-safe public Supabase configuration.
 */
export function getClientSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return { url, anonKey }
}
