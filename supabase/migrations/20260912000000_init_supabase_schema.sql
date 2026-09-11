-- DeepFakeAI Supabase Core Schema Migration
-- Complete PostgreSQL schema replacing Prisma ORM

-- 1. Enums
CREATE TYPE user_type AS ENUM ('ANONYMOUS', 'REGISTERED', 'API');
CREATE TYPE trulean AS ENUM ('UNREVIEWED', 'UNKNOWN', 'FALSE', 'TRUE');
CREATE TYPE yes_no_review AS ENUM ('YES', 'NO', 'UNREVIEWED');
CREATE TYPE request_state AS ENUM ('ERROR', 'UPLOADING', 'PROCESSING', 'COMPLETE');
CREATE TYPE notability AS ENUM ('NOTABLE', 'CANDIDATE', 'WAS_NOTABLE', 'PLAIN');
CREATE TYPE media_publisher AS ENUM ('UNKNOWN', 'OTHER', 'X', 'TIKTOK', 'MASTODON', 'YOUTUBE', 'REDDIT', 'GOOGLE_DRIVE', 'INSTAGRAM', 'FACEBOOK');
CREATE TYPE reply_type AS ENUM ('PROCESSING', 'FINAL');
CREATE TYPE queue_message_status AS ENUM ('PENDING', 'IN_PROGRESS', 'FAILED', 'COMPLETED', 'CANCELED');

-- 2. Tables

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'USER'
);

-- Organizations (Native Supabase Organizations)
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
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
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
  size INTEGER NOT NULL DEFAULT 0,
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

-- Queries
CREATE TABLE IF NOT EXISTS public.queries (
  id TEXT PRIMARY KEY DEFAULT ('qry_' || gen_random_uuid()),
  post_url TEXT NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id TEXT,
  api_key_id TEXT REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Media Throttle
CREATE TABLE IF NOT EXISTS public.media_throttle (
  media_id TEXT PRIMARY KEY REFERENCES public.media(id) ON DELETE CASCADE,
  user_type user_type NOT NULL
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

-- Rate Limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id TEXT PRIMARY KEY DEFAULT ('rl_' || gen_random_uuid()),
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reruns
CREATE TABLE IF NOT EXISTS public.reruns (
  id TEXT PRIMARY KEY DEFAULT ('rr_' || gen_random_uuid()),
  media_id TEXT NOT NULL,
  models TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING'
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notable_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Public read policies for open-access content
CREATE POLICY "Public read notable_media" ON public.notable_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read media" ON public.media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read quiz_media" ON public.quiz_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read verified_source" ON public.verified_source FOR SELECT TO anon, authenticated USING (true);

-- User queries policy
CREATE POLICY "Users can select their own queries" ON public.queries FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Anon can insert queries" ON public.queries FOR INSERT TO anon, authenticated WITH CHECK (true);

-- User feedback policy
CREATE POLICY "Users can manage their feedback" ON public.user_feedback FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Storage bucket initialization for media
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public media access" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "Allow media uploads" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'media');
