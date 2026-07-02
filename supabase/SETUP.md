# Supabase Auth — medsafe-cloud
# Project: https://supabase.com/dashboard/project/woisxvgsgvpfnntmrpat

## Redirect URLs (Authentication → URL Configuration)

Site URL:
http://localhost:3003

Redirect URLs (add all):
http://localhost:3003/auth/callback
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback

## Providers (Authentication → Providers)

### Email
- Enable Email provider (default: on)
- Confirm email: recommended for production

### Google
1. Create OAuth credentials in Google Cloud Console
2. Authorized redirect URI:
   https://woisxvgsgvpfnntmrpat.supabase.co/auth/v1/callback
3. Paste Client ID + Client Secret in Supabase → Google provider → Enable

### Apple
1. Create Services ID in Apple Developer Console
2. Return URL:
   https://woisxvgsgvpfnntmrpat.supabase.co/auth/v1/callback
3. Paste Client ID + Secret in Supabase → Apple provider → Enable

## API Keys

Copy from Settings → API Keys → Legacy anon key:
- Project URL → NEXT_PUBLIC_SUPABASE_URL
- anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
