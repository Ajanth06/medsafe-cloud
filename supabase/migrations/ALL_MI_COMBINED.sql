-- AARYX: Combined MI migrations 006-013 — paste into Supabase SQL Editor

-- ===== 006_market_intelligence.sql =====
-- AARYX Market Intelligence — separate schema namespace from healthcare data
-- Run in Supabase SQL Editor after existing migrations

create table if not exists public.mi_assets (
  id text primary key,
  symbol text not null unique,
  provider_symbol text not null,
  name text not null,
  asset_class text not null,
  priority text default 'standard',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mi_price_history (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.mi_assets (id) on delete cascade,
  symbol text not null,
  price numeric not null,
  recorded_at timestamptz not null,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists mi_price_history_symbol_time_idx
  on public.mi_price_history (symbol, recorded_at desc);

create table if not exists public.mi_market_events (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.mi_assets (id),
  symbol text not null,
  direction text not null,
  percentage_change numeric not null,
  window_minutes integer not null,
  start_price numeric not null,
  current_price numeric not null,
  severity text not null,
  event_type text not null,
  status text not null default 'ACTIVE',
  description text,
  detected_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mi_news_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  event_type text not null,
  severity text not null,
  verification_status text not null default 'UNVERIFIED',
  source_count integer not null default 0,
  sources jsonb not null default '[]',
  affected_markets jsonb not null default '[]',
  published_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mi_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  related_event_id uuid,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mi_market_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null,
  title text not null,
  description text,
  confidence_score integer not null default 0,
  confidence_level text not null,
  verification_status text,
  status text not null default 'ACTIVE',
  affected_assets jsonb not null default '[]',
  timestamps jsonb not null default '{}',
  alert_created_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mi_alert_performance (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.mi_market_alerts (id) on delete cascade,
  price_at_alert numeric not null,
  price_after_5m numeric,
  price_after_15m numeric,
  price_after_30m numeric,
  price_after_60m numeric,
  max_move_after_alert numeric,
  max_adverse_move numeric,
  ai_assessment_correct boolean,
  recorded_at timestamptz not null default now()
);

-- No RLS on market intelligence tables for now — service-role access only in Phase 2.
-- Healthcare tables remain fully isolated.

insert into public.mi_assets (id, symbol, provider_symbol, name, asset_class, priority)
values
  ('wti', 'WTI', 'CL=F', 'WTI Crude Oil', 'commodity', 'primary'),
  ('brent', 'BRENT', 'BZ=F', 'Brent Crude Oil', 'commodity', 'primary'),
  ('gold', 'GOLD', 'GC=F', 'Gold', 'commodity', 'standard'),
  ('dax', 'DAX', '^GDAXI', 'DAX', 'index', 'standard'),
  ('ndx', 'NDX', '^NDX', 'NASDAQ 100', 'index', 'standard'),
  ('spx', 'SPX', '^GSPC', 'S&P 500', 'index', 'standard'),
  ('eurusd', 'EURUSD', 'EURUSD=X', 'EUR/USD', 'forex', 'standard'),
  ('btc', 'BTC', 'BTC-USD', 'Bitcoin', 'crypto', 'standard')
on conflict (id) do nothing;

-- ===== 007_news_intelligence.sql =====
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

-- ===== 008_operations_alerting.sql =====
-- AARYX Phase 6: Background jobs, alert delivery, worker heartbeats
-- Service-role access only — separate from healthcare RLS

create table if not exists public.mi_background_jobs (
  id text primary key,
  job_type text not null,
  status text not null default 'PENDING',
  payload jsonb default '{}',
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  next_retry_at timestamptz
);

create index if not exists mi_background_jobs_status_type_idx
  on public.mi_background_jobs (status, job_type, next_retry_at);

create table if not exists public.mi_alert_deliveries (
  id text primary key,
  alert_id text not null,
  event_id text not null,
  channel text not null,
  status text not null,
  message_version integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  attempts integer not null default 0,
  error text
);

create index if not exists mi_alert_deliveries_event_idx
  on public.mi_alert_deliveries (event_id, created_at desc);

create table if not exists public.mi_worker_heartbeats (
  worker_id text primary key,
  worker_type text not null,
  last_beat_at timestamptz not null,
  status text not null default 'ONLINE',
  metadata jsonb default '{}'
);

create table if not exists public.mi_alert_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  telegram_enabled boolean not null default false,
  push_enabled boolean not null default false,
  minimum_severity text not null default 'HIGH',
  oil_alerts boolean not null default true,
  geopolitical_alerts boolean not null default true,
  macro_alerts boolean not null default true,
  crypto_alerts boolean not null default true,
  equity_alerts boolean not null default true,
  alerts_paused boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.mi_web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.mi_dead_letter_jobs (
  id text primary key,
  job_type text not null,
  event_id text,
  payload jsonb default '{}',
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

-- ===== 009_persistence_layer.sql =====
-- AARYX Phase 6b: Delivered alerts, timing metrics, atomic job claiming

alter table public.mi_background_jobs
  add column if not exists claimed_by text,
  add column if not exists claimed_at timestamptz,
  add column if not exists max_attempts integer not null default 5;

create table if not exists public.mi_delivered_alerts (
  id text primary key,
  event_id text not null,
  intelligence_event_id text,
  severity text not null,
  title text not null,
  body text not null,
  alert_type text not null,
  fingerprint text not null,
  verification text,
  confidence text,
  confidence_score integer,
  affected_assets jsonb not null default '[]',
  deep_link text not null,
  read_status text not null default 'UNREAD',
  event_status text not null default 'ACTIVE',
  material_change jsonb default '[]',
  original_alert_id text,
  latency jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mi_delivered_alerts_event_idx
  on public.mi_delivered_alerts (event_id, created_at desc);

create index if not exists mi_delivered_alerts_fingerprint_idx
  on public.mi_delivered_alerts (fingerprint);

create table if not exists public.mi_event_timing_metrics (
  id text primary key,
  event_id text not null,
  alert_id text,
  market_move_started_at timestamptz,
  anomaly_detected_at timestamptz,
  first_news_at timestamptz,
  multiple_sources_at timestamptz,
  official_confirmation_at timestamptz,
  ai_completed_at timestamptz,
  alert_sent_at timestamptz,
  market_to_alert_ms integer,
  news_to_alert_ms integer,
  ai_latency_ms integer,
  delivery_latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mi_event_timing_metrics_event_idx
  on public.mi_event_timing_metrics (event_id, created_at desc);

-- Atomic job claim for multi-instance workers (FOR UPDATE SKIP LOCKED)
create or replace function public.mi_claim_background_job(
  p_job_type text default null,
  p_instance_id text default 'default'
)
returns setof public.mi_background_jobs
language plpgsql
as $$
declare
  v_job public.mi_background_jobs;
begin
  select * into v_job
  from public.mi_background_jobs
  where status in ('QUEUED', 'RETRYING')
    and (p_job_type is null or job_type = p_job_type)
    and (next_retry_at is null or next_retry_at <= now())
  order by created_at asc
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;

  update public.mi_background_jobs
  set
    status = 'RUNNING',
    started_at = now(),
    attempts = attempts + 1,
    claimed_by = p_instance_id,
    claimed_at = now()
  where id = v_job.id
  returning * into v_job;

  return next v_job;
end;
$$;

-- ===== 010_production_hardening.sql =====
-- AARYX Phase 8: Production hardening — RLS, indexes, service-role isolation

-- User-scoped tables: RLS
alter table public.mi_alert_preferences enable row level security;
alter table public.mi_web_push_subscriptions enable row level security;

drop policy if exists mi_alert_preferences_self on public.mi_alert_preferences;
create policy mi_alert_preferences_self
  on public.mi_alert_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists mi_web_push_subscriptions_self on public.mi_web_push_subscriptions;
create policy mi_web_push_subscriptions_self
  on public.mi_web_push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service-only ops tables: deny anon/authenticated via RLS (service_role bypasses)
alter table public.mi_background_jobs enable row level security;
alter table public.mi_alert_deliveries enable row level security;
alter table public.mi_worker_heartbeats enable row level security;
alter table public.mi_dead_letter_jobs enable row level security;
alter table public.mi_delivered_alerts enable row level security;
alter table public.mi_event_timing_metrics enable row level security;

-- Performance indexes
create index if not exists mi_market_events_detected_at_idx
  on public.mi_market_events (detected_at desc);

create index if not exists mi_market_alerts_created_idx
  on public.mi_market_alerts (alert_created_at desc);

create index if not exists mi_news_items_published_idx
  on public.mi_news_items (published_at desc);

create index if not exists mi_intelligence_clusters_priority_idx
  on public.mi_intelligence_event_clusters (priority_score desc, latest_update_at desc);

-- Provider health tracking (Phase 8)
create table if not exists public.mi_provider_health (
  id text primary key,
  provider text not null,
  provider_type text not null,
  status text not null default 'ONLINE',
  last_success timestamptz,
  last_failure timestamptz,
  latency_ms integer,
  error_count integer not null default 0,
  data_stale boolean not null default false,
  metadata jsonb default '{}',
  updated_at timestamptz not null default now()
);

alter table public.mi_provider_health enable row level security;

-- Read-only for authenticated users (status dashboards)
drop policy if exists mi_provider_health_read on public.mi_provider_health;
create policy mi_provider_health_read
  on public.mi_provider_health
  for select
  using (auth.role() = 'authenticated');

-- ===== 011_terminal_ux.sql =====
-- AARYX Phase 9: Terminal UX — watchlist on user preferences

alter table public.mi_alert_preferences
  add column if not exists watchlist_symbols text[] not null default array['WTI', 'BRENT', 'GOLD']::text[];

-- ===== 012_complete_schema.sql =====
-- AARYX Phase 10: Complete schema — quotes, futures, cross-asset, AI, validation

alter table public.mi_market_events
  add column if not exists external_id text unique;

-- Latest quote snapshot per asset (not full tick history)
create table if not exists public.mi_latest_quotes (
  asset_id text primary key references public.mi_assets (id) on delete cascade,
  symbol text not null,
  price numeric not null,
  bid numeric,
  ask numeric,
  previous_close numeric,
  absolute_change numeric,
  percentage_change numeric,
  provider_timestamp timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now(),
  is_realtime boolean not null default false,
  delay_seconds integer,
  market_status text,
  data_quality text not null default 'LIVE',
  source text,
  contract_symbol text,
  updated_at timestamptz not null default now()
);

create index if not exists mi_latest_quotes_symbol_idx on public.mi_latest_quotes (symbol);

-- WTI/Brent futures contracts
create table if not exists public.mi_futures_contracts (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.mi_assets (id) on delete cascade,
  contract_symbol text not null,
  exchange text not null default 'NYMEX',
  expiration_date date not null,
  is_front_month boolean not null default false,
  is_active boolean not null default true,
  rollover_at timestamptz,
  provider_symbol text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, contract_symbol)
);

create index if not exists mi_futures_contracts_asset_active_idx
  on public.mi_futures_contracts (asset_id, is_active, is_front_month);

-- Cross-asset correlation events
create table if not exists public.mi_cross_asset_events (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  event_type text not null,
  severity text not null,
  confidence_score integer not null default 0,
  market_regime text,
  started_at timestamptz not null,
  detected_at timestamptz not null,
  status text not null default 'ACTIVE',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mi_cross_asset_event_assets (
  id uuid primary key default gen_random_uuid(),
  cross_asset_event_id uuid not null references public.mi_cross_asset_events (id) on delete cascade,
  asset_id text not null references public.mi_assets (id),
  market_event_id text,
  percentage_change numeric,
  relevance text,
  created_at timestamptz not null default now()
);

-- News source registry
create table if not exists public.mi_news_sources (
  id text primary key,
  name text not null,
  provider text,
  source_type text not null,
  domain text,
  country text,
  official boolean not null default false,
  credibility_tier text not null default 'STANDARD',
  syndication_group text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Event entities (countries, regions, orgs)
create table if not exists public.mi_event_entities (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.mi_intelligence_event_clusters (id) on delete cascade,
  entity_type text not null,
  entity_name text not null,
  normalized_name text not null,
  relevance text not null default 'MEDIUM',
  created_at timestamptz not null default now()
);

create index if not exists mi_event_entities_cluster_idx on public.mi_event_entities (cluster_id);

-- AI analyses
create table if not exists public.mi_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  intelligence_event_id text not null,
  market_event_id text,
  version integer not null default 1,
  is_current boolean not null default true,
  previous_analysis_id uuid references public.mi_ai_analyses (id),
  summary text not null,
  event_type text,
  market_regime text,
  possible_cause text,
  confidence_score integer not null default 0,
  confidence_level text not null,
  market_already_moved boolean not null default false,
  reaction_phase text,
  event_significance text,
  model text not null,
  prompt_version text,
  mode text not null default 'LIVE',
  generated_at timestamptz not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric,
  alternative_explanations jsonb not null default '[]',
  affected_assets jsonb not null default '[]',
  confidence_reasons jsonb not null default '[]',
  uncertainty_reasons jsonb not null default '[]',
  key_risks jsonb not null default '[]',
  what_to_watch_next jsonb not null default '[]',
  full_result jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists mi_ai_analyses_intel_event_idx
  on public.mi_ai_analyses (intelligence_event_id, generated_at desc);

create table if not exists public.mi_ai_analysis_evidence (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.mi_ai_analyses (id) on delete cascade,
  evidence_type text not null,
  reference_id text not null,
  label text,
  supports_analysis boolean not null default true,
  created_at timestamptz not null default now()
);

-- Phase 10: production validation runs
create table if not exists public.mi_validation_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'REPLAY',
  scenario_id text,
  passed boolean not null,
  total_scenarios integer,
  passed_scenarios integer,
  failed_scenarios integer,
  metrics jsonb not null default '{}',
  failures jsonb not null default '[]',
  warnings jsonb not null default '[]',
  duration_ms integer,
  environment text not null default 'production',
  created_at timestamptz not null default now()
);

create index if not exists mi_validation_runs_created_idx
  on public.mi_validation_runs (created_at desc);

-- Migration tracking (idempotent deploys)
create table if not exists public.mi_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

-- Seed news sources
insert into public.mi_news_sources (id, name, provider, source_type, domain, official, credibility_tier)
values
  ('reuters', 'Reuters', 'newsapi', 'NEWS_WIRE', 'reuters.com', false, 'TIER_1'),
  ('ap', 'Associated Press', 'newsapi', 'NEWS_WIRE', 'apnews.com', false, 'TIER_1'),
  ('bloomberg', 'Bloomberg', 'newsapi', 'FINANCIAL_MEDIA', 'bloomberg.com', false, 'TIER_1'),
  ('eia', 'EIA', 'official', 'OFFICIAL_ENERGY', 'eia.gov', true, 'OFFICIAL'),
  ('fed', 'Federal Reserve', 'official', 'OFFICIAL_CENTRAL_BANK', 'federalreserve.gov', true, 'OFFICIAL'),
  ('opec', 'OPEC', 'official', 'OFFICIAL_ENERGY', 'opec.org', true, 'OFFICIAL')
on conflict (id) do nothing;

-- Seed front-month futures placeholders (updated by worker)
insert into public.mi_futures_contracts (asset_id, contract_symbol, exchange, expiration_date, is_front_month, is_active, provider_symbol)
values
  ('wti', 'CLZ5', 'NYMEX', '2025-12-20', true, true, 'CL=F'),
  ('brent', 'BRNZ5', 'ICE', '2025-12-31', true, true, 'BZ=F')
on conflict (asset_id, contract_symbol) do nothing;

-- ===== 013_rls_complete.sql =====
-- AARYX: RLS policies for all MI tables — authenticated read, service-role write

-- Helper: read-only for logged-in users on intelligence data
do $$
declare
  t text;
begin
  foreach t in array array[
    'mi_assets',
    'mi_price_history',
    'mi_market_events',
    'mi_news_events',
    'mi_intelligence_events',
    'mi_market_alerts',
    'mi_alert_performance',
    'mi_news_items',
    'mi_intelligence_event_clusters',
    'mi_intelligence_event_sources',
    'mi_market_news_correlations',
    'mi_investigation_jobs',
    'mi_event_updates',
    'mi_latest_quotes',
    'mi_futures_contracts',
    'mi_cross_asset_events',
    'mi_cross_asset_event_assets',
    'mi_news_sources',
    'mi_event_entities',
    'mi_ai_analyses',
    'mi_ai_analysis_evidence',
    'mi_validation_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format(
      'create policy %I_read on public.%I for select using (auth.role() = ''authenticated'')',
      t, t
    );
  end loop;
end $$;

-- Ops tables: no authenticated access (service_role only)
do $$
declare
  t text;
begin
  foreach t in array array[
    'mi_background_jobs',
    'mi_alert_deliveries',
    'mi_worker_heartbeats',
    'mi_dead_letter_jobs',
    'mi_delivered_alerts',
    'mi_event_timing_metrics',
    'mi_provider_health',
    'mi_schema_migrations'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- User tables already have self policies in 010
