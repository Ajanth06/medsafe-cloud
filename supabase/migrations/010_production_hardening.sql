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
