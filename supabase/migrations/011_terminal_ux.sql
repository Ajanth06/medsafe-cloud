-- AARYX Phase 9: Terminal UX — watchlist on user preferences

alter table public.mi_alert_preferences
  add column if not exists watchlist_symbols text[] not null default array['WTI', 'BRENT', 'GOLD']::text[];
