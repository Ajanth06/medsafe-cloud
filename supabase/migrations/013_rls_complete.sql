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
