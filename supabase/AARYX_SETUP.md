# AARYX Market Intelligence — Supabase Setup

Complete setup for all 10 phases. Healthcare tables (`documents`, `medications`, etc.) are **not** modified.

## 1. Environment variables

Add to `.env.local`:

```env
# Supabase (from Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AARYX persistence (required for 24/7 + multi-instance)
MI_PERSISTENCE_ENABLED=true

# Market data
# Primary oil (WTI/Brent): OilPriceAPI
OILPRICEAPI_KEY=your_oilpriceapi_key
# Other assets / optional futures: Polygon
MARKET_DATA_PROVIDER=polygon
MARKET_DATA_API_KEY=your_polygon_key

# News (optional)
NEWS_API_KEY=your_newsapi_key

# 24/7 worker (production)
WORKER_SECRET=generate-a-long-random-string
CRON_SECRET=same-or-different-for-vercel-cron
ALERT_DELIVERY_ENABLED=true
BACKGROUND_WORKERS_ENABLED=true

# Telegram (optional)
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Database migrations (one-time)
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

## 2. Run migrations

```bash
npm install
npm run mi:migrate
```

This applies migrations `006` through `013`:

| Migration | Content |
|-----------|---------|
| 006 | Assets, price history, market events, alerts |
| 007 | News items, intelligence clusters, correlations |
| 008 | Jobs, deliveries, heartbeats, user preferences |
| 009 | Delivered alerts, timing metrics, job claiming RPC |
| 010 | RLS, indexes, provider health |
| 011 | Watchlist symbols on preferences |
| 012 | Latest quotes, futures, AI analyses, validation runs |
| 013 | Complete RLS (authenticated read, service write) |

**One-shot SQL:** paste `supabase/migrations/ALL_MI_COMBINED.sql` into the SQL Editor.

**Manual alternative:** paste each file into Supabase SQL Editor in order.

## 3. Verify

```bash
npm test
npm run build
npm run mi:validate
```

## 4. 24/7 operation

**Vercel (cron only — not true 24/7):**
- `vercel.json` cron hits `/api/market/worker/tick` every minute
- Set `CRON_SECRET` in Vercel env

**Dedicated worker (recommended):**
```bash
npm run mi:worker
```
Run on Railway, Fly.io, or a VM with the same env vars.

## 5. Tables overview (`mi_*` namespace)

- **Market:** `mi_assets`, `mi_latest_quotes`, `mi_price_history`, `mi_market_events`, `mi_futures_contracts`
- **News/Intel:** `mi_news_items`, `mi_intelligence_event_clusters`, `mi_ai_analyses`, `mi_event_entities`
- **Ops:** `mi_background_jobs`, `mi_delivered_alerts`, `mi_worker_heartbeats`, `mi_provider_health`
- **User:** `mi_alert_preferences`, `mi_web_push_subscriptions`
- **Validation:** `mi_validation_runs`, `mi_event_timing_metrics`

## 6. Phase completion checklist

| Phase | Status |
|-------|--------|
| 1 Dashboard & UI | Terminal at `/market-intelligence` |
| 2 Market Engine | Anomaly, correlation, confidence |
| 3 Real Market Data | Polygon + failover |
| 4 News & Geopolitics | Verification, clustering |
| 5 AI Intelligence | Structured analysis + evidence |
| 6 24/7 & Alerts | Worker, Telegram, in-app |
| 7 Historical Replay | 5 scenarios + metrics |
| 8 Production Hardening | Auth, RLS, rate limits |
| 9 Terminal UX | Watchlist, search, ops console |
| 10 Production Validation | `/api/market/validation`, `mi:validate` |

## 7. Monitoring

- **Dashboard:** Market Intelligence → Ops tab → Production Validation
- **API:** `GET /api/market/validation` (session or worker secret)
- **CLI:** `npm run mi:validate` — health + replay suite
