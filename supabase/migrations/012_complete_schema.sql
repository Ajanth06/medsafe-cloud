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
