-- ==============================================================================
-- DeepFakeAI Unified Supabase PostgreSQL Production Schema
-- Single consolidated migration replacing all previous migrations & Prisma ORM
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('ANONYMOUS', 'REGISTERED', 'API');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trulean AS ENUM ('UNREVIEWED', 'UNKNOWN', 'FALSE', 'TRUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE yes_no_review AS ENUM ('YES', 'NO', 'UNREVIEWED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_state AS ENUM ('ERROR', 'UPLOADING', 'PROCESSING', 'COMPLETE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notability AS ENUM ('NOTABLE', 'CANDIDATE', 'WAS_NOTABLE', 'PLAIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_publisher AS ENUM ('UNKNOWN', 'OTHER', 'X', 'TIKTOK', 'MASTODON', 'YOUTUBE', 'REDDIT', 'GOOGLE_DRIVE', 'INSTAGRAM', 'FACEBOOK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reply_type AS ENUM ('PROCESSING', 'FINAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE queue_message_status AS ENUM ('PENDING', 'IN_PROGRESS', 'FAILED', 'COMPLETED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Core Tables

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'USER'
);

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY DEFAULT ('org_' || gen_random_uuid()),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

-- Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id TEXT PRIMARY KEY DEFAULT ('mem_' || gen_random_uuid()),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- API Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id TEXT PRIMARY KEY DEFAULT ('key_' || gen_random_uuid()),
  key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  org_id TEXT,
  created_by_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, org_id)
);

-- Media
CREATE TABLE IF NOT EXISTS public.media (
  id TEXT PRIMARY KEY,
  media_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  size BIGINT NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audio_id TEXT,
  audio_mime_type TEXT,
  external BOOLEAN NOT NULL DEFAULT FALSE,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis_time INTEGER NOT NULL DEFAULT 0,
  source media_publisher NOT NULL DEFAULT 'UNKNOWN',
  source_user_id TEXT,
  source_user_name TEXT,
  verified_source BOOLEAN NOT NULL DEFAULT FALSE,
  posted_to_x BOOLEAN NOT NULL DEFAULT FALSE,
  trimmed BOOLEAN NOT NULL DEFAULT FALSE,
  scheduler_message_id TEXT,
  api_key_id TEXT REFERENCES public.api_keys(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_media_resolved_at ON public.media(resolved_at);

-- Queries (Supports both registered and anonymous queries)
CREATE TABLE IF NOT EXISTS public.queries (
  id TEXT PRIMARY KEY DEFAULT ('qry_' || gen_random_uuid()),
  post_url TEXT NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id TEXT,
  api_key_id TEXT REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  ip_addr TEXT NOT NULL DEFAULT '',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON public.queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_time ON public.queries(time DESC);

-- Post Metadata & Post Media
CREATE TABLE IF NOT EXISTS public.post_metadata (
  post_url TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_media (
  post_url TEXT NOT NULL,
  media_id TEXT NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  PRIMARY KEY (post_url, media_id)
);
CREATE INDEX IF NOT EXISTS idx_post_media_post_url ON public.post_media(post_url);
CREATE INDEX IF NOT EXISTS idx_post_media_media_id ON public.post_media(media_id);

-- Media Throttle
CREATE TABLE IF NOT EXISTS public.media_throttle (
  media_id TEXT PRIMARY KEY REFERENCES public.media(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL DEFAULT 'ANONYMOUS'
);

-- Media Metadata
CREATE TABLE IF NOT EXISTS public.media_metadata (
  media_id TEXT PRIMARY KEY REFERENCES public.media(id) ON DELETE CASCADE,
  fake trulean NOT NULL DEFAULT 'UNREVIEWED',
  audio_fake trulean NOT NULL DEFAULT 'UNREVIEWED',
  relabel_fake trulean NOT NULL DEFAULT 'UNREVIEWED',
  relabel_audio_fake trulean NOT NULL DEFAULT 'UNREVIEWED',
  language TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  speakers TEXT NOT NULL DEFAULT '',
  misleading BOOLEAN NOT NULL DEFAULT FALSE,
  no_photorealistic_faces BOOLEAN NOT NULL DEFAULT FALSE,
  fake_reviewer TEXT NOT NULL DEFAULT '',
  audio_fake_reviewer TEXT NOT NULL DEFAULT '',
  relabel_fake_reviewer TEXT NOT NULL DEFAULT '',
  relabel_fake_audio_reviewer TEXT NOT NULL DEFAULT '',
  video_object_overlay yes_no_review NOT NULL DEFAULT 'UNREVIEWED',
  video_text_overlay yes_no_review NOT NULL DEFAULT 'UNREVIEWED',
  video_effects yes_no_review NOT NULL DEFAULT 'UNREVIEWED'
);

-- User Feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  fake trulean NOT NULL DEFAULT 'UNKNOWN',
  comments TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, media_id)
);

-- Analysis Results
CREATE TABLE IF NOT EXISTS public.analysis_results (
  media_id TEXT NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  json TEXT NOT NULL,
  user_id TEXT,
  created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed TIMESTAMPTZ,
  request_id TEXT,
  request_state request_state,
  api_key_id TEXT REFERENCES public.api_keys(id) ON DELETE SET NULL,
  PRIMARY KEY (media_id, source)
);
CREATE INDEX IF NOT EXISTS idx_analysis_results_request_id ON public.analysis_results(request_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_source ON public.analysis_results(source);
CREATE INDEX IF NOT EXISTS idx_analysis_results_media_source ON public.analysis_results(media_id, source);

-- Notable Media
CREATE TABLE IF NOT EXISTS public.notable_media (
  media_id TEXT PRIMARY KEY REFERENCES public.media(id) ON DELETE CASCADE,
  notability notability NOT NULL DEFAULT 'NOTABLE',
  "order" INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  creator TEXT NOT NULL DEFAULT '',
  created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL DEFAULT '',
  preview_url TEXT,
  review_channel_message_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_notable_media_order ON public.notable_media("order");

-- Quiz Media
CREATE TABLE IF NOT EXISTS public.quiz_media (
  media_id TEXT PRIMARY KEY REFERENCES public.media(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer BOOLEAN NOT NULL,
  explanation TEXT NOT NULL
);

-- Verified Source
CREATE TABLE IF NOT EXISTS public.verified_source (
  id TEXT PRIMARY KEY DEFAULT ('src_' || gen_random_uuid()),
  platform media_publisher NOT NULL,
  display_name TEXT,
  platform_id TEXT NOT NULL,
  added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, platform_id)
);

-- Ground Truth Updates
CREATE TABLE IF NOT EXISTS public.ground_truth_updates (
  id TEXT PRIMARY KEY DEFAULT ('gt_' || gen_random_uuid()),
  media_id TEXT NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  old_summary TEXT NOT NULL,
  new_summary TEXT NOT NULL,
  poll_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datasets & Groups
CREATE TABLE IF NOT EXISTS public.datasets (
  id TEXT PRIMARY KEY DEFAULT ('ds_' || gen_random_uuid()),
  name TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  keywords TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.dataset_groups (
  id TEXT PRIMARY KEY DEFAULT ('dsg_' || gen_random_uuid()),
  name TEXT UNIQUE NOT NULL,
  set_ids TEXT[] NOT NULL DEFAULT '{}',
  from_date TIMESTAMPTZ,
  to_date TIMESTAMPTZ
);

-- Batch Uploads
CREATE TABLE IF NOT EXISTS public.batch_uploads (
  id TEXT PRIMARY KEY DEFAULT ('batch_' || gen_random_uuid()),
  user_id TEXT NOT NULL,
  org_id TEXT,
  api_key_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.batch_upload_items (
  id TEXT PRIMARY KEY DEFAULT ('item_' || gen_random_uuid()),
  batch_upload_id TEXT NOT NULL REFERENCES public.batch_uploads(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  query_id TEXT REFERENCES public.queries(id) ON DELETE SET NULL,
  media_id TEXT REFERENCES public.media(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolve_url_job_id TEXT,
  start_analysis_job_id TEXT,
  debug_info JSONB
);

-- Queue Messages (Background Scheduler Jobs)
CREATE TABLE IF NOT EXISTS public.queue_messages (
  id TEXT PRIMARY KEY DEFAULT ('msg_' || gen_random_uuid()),
  apikey_id TEXT REFERENCES public.api_keys(id) ON DELETE SET NULL,
  queue_name TEXT NOT NULL,
  message JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_id TEXT,
  lease_expiration TIMESTAMPTZ,
  lease_times TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  status queue_message_status NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX IF NOT EXISTS idx_queue_messages_lease ON public.queue_messages(queue_name, status, lease_expiration);
CREATE INDEX IF NOT EXISTS idx_queue_messages_status ON public.queue_messages(status, queue_name, created_at);

-- Rate Limits (Action-keyed sliding counter)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id TEXT PRIMARY KEY DEFAULT ('rl_' || gen_random_uuid()),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'default',
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  times INTEGER[] NOT NULL DEFAULT '{}',
  UNIQUE (user_id, action)
);

-- Reruns
CREATE TABLE IF NOT EXISTS public.reruns (
  id TEXT PRIMARY KEY DEFAULT ('rr_' || gen_random_uuid()),
  media_id TEXT NOT NULL,
  models TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,
  started TIMESTAMPTZ,
  complete INTEGER DEFAULT 0,
  matched BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  keywords TEXT DEFAULT '',
  from_date TIMESTAMPTZ,
  to_date TIMESTAMPTZ,
  include_unknown BOOLEAN DEFAULT false,
  only_errors BOOLEAN DEFAULT false,
  leeway_days INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reruns_completed ON public.reruns(completed_at);
CREATE INDEX IF NOT EXISTS idx_reruns_source ON public.reruns(source);

-- 4. Storage Buckets (media and media-uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('media', 'media', true, 104857600),
  ('media-uploads', 'media-uploads', true, 104857600)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600;

-- 5. Storage Access Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public media select" ON storage.objects;
  DROP POLICY IF EXISTS "Public media insert" ON storage.objects;
  DROP POLICY IF EXISTS "Public media update" ON storage.objects;
  DROP POLICY IF EXISTS "Public media delete" ON storage.objects;
  DROP POLICY IF EXISTS "Public media access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow media uploads" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Public media select" ON storage.objects
  FOR SELECT TO anon, authenticated, service_role
  USING (bucket_id IN ('media', 'media-uploads'));

CREATE POLICY "Public media insert" ON storage.objects
  FOR INSERT TO anon, authenticated, service_role
  WITH CHECK (bucket_id IN ('media', 'media-uploads'));

CREATE POLICY "Public media update" ON storage.objects
  FOR UPDATE TO anon, authenticated, service_role
  USING (bucket_id IN ('media', 'media-uploads'))
  WITH CHECK (bucket_id IN ('media', 'media-uploads'));

CREATE POLICY "Public media delete" ON storage.objects
  FOR DELETE TO anon, authenticated, service_role
  USING (bucket_id IN ('media', 'media-uploads'));

-- 6. Grants to API Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 7. Row Level Security (RLS) Configuration
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_throttle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notable_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_upload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reruns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ground_truth_updates ENABLE ROW LEVEL SECURITY;

-- Helper to safely drop and recreate policies
DO $$ 
DECLARE
  pol record;
BEGIN
  -- Media policies
  DROP POLICY IF EXISTS "media_select_policy" ON public.media;
  DROP POLICY IF EXISTS "media_insert_policy" ON public.media;
  DROP POLICY IF EXISTS "media_update_policy" ON public.media;
  DROP POLICY IF EXISTS "Public read media" ON public.media;

  -- Queries policies
  DROP POLICY IF EXISTS "queries_select_policy" ON public.queries;
  DROP POLICY IF EXISTS "queries_insert_policy" ON public.queries;
  DROP POLICY IF EXISTS "queries_update_policy" ON public.queries;
  DROP POLICY IF EXISTS "Users can select their own queries" ON public.queries;
  DROP POLICY IF EXISTS "Anon can insert queries" ON public.queries;

  -- Post media policies
  DROP POLICY IF EXISTS "post_media_all_policy" ON public.post_media;
  DROP POLICY IF EXISTS "anon_read_post_media" ON public.post_media;

  -- Post metadata policies
  DROP POLICY IF EXISTS "post_metadata_all_policy" ON public.post_metadata;

  -- Media metadata policies
  DROP POLICY IF EXISTS "media_metadata_all_policy" ON public.media_metadata;
  DROP POLICY IF EXISTS "anon_read_media_metadata" ON public.media_metadata;

  -- Analysis results policies
  DROP POLICY IF EXISTS "analysis_results_all_policy" ON public.analysis_results;
  DROP POLICY IF EXISTS "anon_read_analysis_results" ON public.analysis_results;

  -- Notable media policies
  DROP POLICY IF EXISTS "notable_media_all_policy" ON public.notable_media;
  DROP POLICY IF EXISTS "Public read notable_media" ON public.notable_media;

  -- Quiz media policies
  DROP POLICY IF EXISTS "quiz_media_all_policy" ON public.quiz_media;
  DROP POLICY IF EXISTS "Public read quiz_media" ON public.quiz_media;

  -- Verified source policies
  DROP POLICY IF EXISTS "verified_source_all_policy" ON public.verified_source;
  DROP POLICY IF EXISTS "Public read verified_source" ON public.verified_source;

  -- Feedback policies
  DROP POLICY IF EXISTS "user_feedback_all_policy" ON public.user_feedback;
  DROP POLICY IF EXISTS "Users can manage their feedback" ON public.user_feedback;

  -- Queue messages policies
  DROP POLICY IF EXISTS "queue_messages_all_policy" ON public.queue_messages;

  -- Rate limits policies
  DROP POLICY IF EXISTS "rate_limits_all_policy" ON public.rate_limits;

  -- Throttle policies
  DROP POLICY IF EXISTS "media_throttle_all_policy" ON public.media_throttle;

  -- Batch upload policies
  DROP POLICY IF EXISTS "batch_uploads_all_policy" ON public.batch_uploads;
  DROP POLICY IF EXISTS "batch_upload_items_all_policy" ON public.batch_upload_items;

  -- Rerun policies
  DROP POLICY IF EXISTS "reruns_all_policy" ON public.reruns;

  -- Datasets policies
  DROP POLICY IF EXISTS "datasets_all_policy" ON public.datasets;
  DROP POLICY IF EXISTS "dataset_groups_all_policy" ON public.dataset_groups;
  DROP POLICY IF EXISTS "ground_truth_updates_all_policy" ON public.ground_truth_updates;
END $$;

-- Define clean permissive policies for application operations
CREATE POLICY "media_select_policy" ON public.media FOR SELECT TO anon, authenticated, service_role USING (true);
CREATE POLICY "media_insert_policy" ON public.media FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
CREATE POLICY "media_update_policy" ON public.media FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "queries_select_policy" ON public.queries FOR SELECT TO anon, authenticated, service_role USING (true);
CREATE POLICY "queries_insert_policy" ON public.queries FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
CREATE POLICY "queries_update_policy" ON public.queries FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "post_media_all_policy" ON public.post_media FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "post_metadata_all_policy" ON public.post_metadata FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "media_metadata_all_policy" ON public.media_metadata FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "analysis_results_all_policy" ON public.analysis_results FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "notable_media_all_policy" ON public.notable_media FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "quiz_media_all_policy" ON public.quiz_media FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "verified_source_all_policy" ON public.verified_source FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_feedback_all_policy" ON public.user_feedback FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "queue_messages_all_policy" ON public.queue_messages FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "rate_limits_all_policy" ON public.rate_limits FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "media_throttle_all_policy" ON public.media_throttle FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "batch_uploads_all_policy" ON public.batch_uploads FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "batch_upload_items_all_policy" ON public.batch_upload_items FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "reruns_all_policy" ON public.reruns FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "datasets_all_policy" ON public.datasets FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "dataset_groups_all_policy" ON public.dataset_groups FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "ground_truth_updates_all_policy" ON public.ground_truth_updates FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
