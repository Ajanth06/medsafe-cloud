# Supabase Auth — medsafe-cloud
# Project: https://supabase.com/dashboard/project/woisxvgsgvpfnntmrpat

## Redirect URLs (Authentication → URL Configuration)

Site URL (production):
https://www.medsafe-cloud.de

Redirect URLs (add all):
http://localhost:3003/auth/callback
https://www.medsafe-cloud.de/auth/callback

## Google OAuth — Schritt für Schritt

### 1. Projekt erstellen
https://console.cloud.google.com/projectcreate
- Name: `MedSafe Cloud`
- Erstellen

### 2. OAuth-Zustimmungsbildschirm
https://console.cloud.google.com/apis/credentials/consent
- User Type: **External**
- App name: `MedSafe Cloud`
- Authorized domains: `medsafe-cloud.de`
- Test users: deine E-Mail hinzufügen

### 3. OAuth Client ID
https://console.cloud.google.com/apis/credentials → **+ Anmeldedaten erstellen** → **OAuth-Client-ID**
- Typ: **Webanwendung**
- JavaScript origins:
  - `https://www.medsafe-cloud.de`
  - `http://localhost:3003`
- Redirect URIs:
  - `https://woisxvgsgvpfnntmrpat.supabase.co/auth/v1/callback`

### 4. In Supabase eintragen
https://supabase.com/dashboard/project/woisxvgsgvpfnntmrpat/auth/providers?provider=Google
- **Enable Sign in with Google** aktivieren
- Client ID + Client Secret einfügen → **Save**

## User data isolation (run after 001)

Run `supabase/migrations/002_user_health_data.sql` in the SQL Editor.

This creates per-user tables with Row Level Security:
- `documents` — only `auth.uid() = user_id`
- `medications`
- `timeline_events`
- `health_summaries`

Each logged-in user can only read and write their own rows.


1. Apple Developer → Services ID
2. Return URL: `https://woisxvgsgvpfnntmrpat.supabase.co/auth/v1/callback`
3. Supabase → Apple provider → Enable + Credentials

## API Keys

Copy from Settings → API Keys → Legacy anon key:
- Project URL → NEXT_PUBLIC_SUPABASE_URL
- anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
