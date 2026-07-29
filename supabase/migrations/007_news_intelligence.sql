-- Phase 4: News & Geopolitical Intelligence tables
-- Separate from healthcare data — service-role access only

create table if not exists public.mi_news_items (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text,
  headline text not null,
  summary text,
  source_name text not null,
  source_domain text,
  source_type text,
  source_origin text,
  syndication_group text,
  published_at timestamptz not null,
  aaryx_received_at timestamptz not null default now(),
  processed_at timestamptz,
  url text,
  categories jsonb not null default '[]',
  entities jsonb not null default '[]',
  credibility_score integer,
  data_availability text not null default 'LIVE',
  created_at timestamptz not null default now()
);

create index if not exists mi_news_items_published_at_idx on public.mi_news_items (published_at desc);
create index if not exists mi_news_items_provider_idx on public.mi_news_items (provider);
create index if not exists mi_news_items_source_name_idx on public.mi_news_items (source_name);

create table if not exists public.mi_intelligence_event_clusters (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  event_type text not null,
  news_event_type text not null,
  headline text not null,
  summary text,
  state text not null default 'DETECTED',
  verification_status text not null default 'UNVERIFIED',
  independent_source_count integer not null default 0,
  official_source_count integer not null default 0,
  first_report_at timestamptz not null,
  latest_update_at timestamptz not null,
  affected_region text,
  potentially_affected_markets jsonb not null default '[]',
  market_relevance jsonb not null default '{}',
  priority text not null default 'LOW',
  priority_score integer not null default 0,
  causality text not null default 'UNKNOWN',
  watch_mode boolean not null default false,
  data_availability text not null default 'LIVE',
  timestamps jsonb not null default '{}',
  audit_trail jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mi_intel_clusters_state_idx on public.mi_intelligence_event_clusters (state);
create index if not exists mi_intel_clusters_event_type_idx on public.mi_intelligence_event_clusters (event_type);
create index if not exists mi_intel_clusters_first_report_idx on public.mi_intelligence_event_clusters (first_report_at desc);

create table if not exists public.mi_intelligence_event_sources (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.mi_intelligence_event_clusters (id) on delete cascade,
  news_item_id uuid references public.mi_news_items (id) on delete set null,
  source_name text not null,
  source_type text,
  published_at timestamptz not null,
  headline text not null,
  url text,
  role text not null,
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mi_market_news_correlations (
  id uuid primary key default gen_random_uuid(),
  market_event_id text not null,
  intelligence_event_id uuid not null references public.mi_intelligence_event_clusters (id) on delete cascade,
  time_difference_ms bigint not null,
  affected_assets jsonb not null default '[]',
  correlation_confidence text not null,
  possible_causality text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists mi_market_news_corr_market_idx on public.mi_market_news_correlations (market_event_id);
create index if not exists mi_market_news_corr_intel_idx on public.mi_market_news_correlations (intelligence_event_id);

create table if not exists public.mi_investigation_jobs (
  id uuid primary key default gen_random_uuid(),
  market_event_id text not null,
  status text not null default 'PENDING',
  search_queries jsonb not null default '[]',
  providers_searched jsonb not null default '[]',
  result_count integer not null default 0,
  rejected_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mi_investigation_jobs_market_event_idx on public.mi_investigation_jobs (market_event_id);
create index if not exists mi_investigation_jobs_created_at_idx on public.mi_investigation_jobs (created_at desc);

create table if not exists public.mi_event_updates (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.mi_intelligence_event_clusters (id) on delete cascade,
  title text not null,
  description text,
  verification_status text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
