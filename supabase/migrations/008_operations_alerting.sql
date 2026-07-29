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
