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
