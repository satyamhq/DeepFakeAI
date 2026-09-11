-- DeepFakeAI Schema Fixes Migration
-- Extends the initial migration with missing columns and tables

-- Fix reruns table: add all missing columns
ALTER TABLE public.reruns
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS started TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complete INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS keywords TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS to_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS include_unknown BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS only_errors BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS leeway_days INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reruns_completed ON public.reruns(completed_at);
CREATE INDEX IF NOT EXISTS idx_reruns_source ON public.reruns(source);

-- Fix rate_limits table: change schema to support action-keyed rate limiting
-- Add action column and times array (current schema only has count/window_start)
ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS times INTEGER[] NOT NULL DEFAULT '{}';

-- Add unique constraint for user_id + action
ALTER TABLE public.rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_pkey;

ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS user_action_key TEXT GENERATED ALWAYS AS (user_id || '_' || action) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action);

-- Media throttle: ensure proper structure
ALTER TABLE public.media_throttle
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'ANONYMOUS';

-- Ensure analysis_results has index on source for rerun queries
CREATE INDEX IF NOT EXISTS idx_analysis_results_source ON public.analysis_results(source);
CREATE INDEX IF NOT EXISTS idx_analysis_results_media_source ON public.analysis_results(media_id, source);

-- Queue messages: add index for scheduler polling
CREATE INDEX IF NOT EXISTS idx_queue_messages_status ON public.queue_messages(status, queue_name, created_at);

-- Add RLS policies for service role (admin) access to all tables
ALTER TABLE public.reruns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_throttle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_upload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ground_truth_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used for server-side admin operations)
-- Note: service_role key bypasses RLS by default in Supabase, no policy needed

-- Anon + authenticated can read media
CREATE POLICY IF NOT EXISTS "anon_read_analysis_results" ON public.analysis_results
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_media_metadata" ON public.media_metadata
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_post_media" ON public.post_media
  FOR SELECT TO anon, authenticated USING (true);
