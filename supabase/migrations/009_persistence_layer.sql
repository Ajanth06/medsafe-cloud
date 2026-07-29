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
