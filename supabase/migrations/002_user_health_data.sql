-- MedSafe Cloud: per-user health data with Row Level Security
-- Run in Supabase SQL Editor after 001_initial_schema.sql

-- Improve profile name capture from OAuth providers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'given_name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source text,
  document_date date,
  type text not null default 'other'
    check (type in ('arztbrief', 'blutwerte', 'ct', 'other')),
  analyzed boolean not null default false,
  summary text,
  key_points jsonb not null default '[]'::jsonb,
  original_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_user_id_date_idx on public.documents (user_id, document_date desc);

alter table public.documents enable row level security;

create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

-- Medications
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  schedule text,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medications_user_id_idx on public.medications (user_id);

alter table public.medications enable row level security;

create policy "Users can view own medications"
  on public.medications for select
  using (auth.uid() = user_id);

create policy "Users can insert own medications"
  on public.medications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own medications"
  on public.medications for update
  using (auth.uid() = user_id);

create policy "Users can delete own medications"
  on public.medications for delete
  using (auth.uid() = user_id);

drop trigger if exists medications_updated_at on public.medications;
create trigger medications_updated_at
  before update on public.medications
  for each row
  execute function public.set_updated_at();

-- Timeline events
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_date date not null,
  label text not null,
  icon text not null default 'document'
    check (icon in ('blood', 'pill', 'hospital', 'document', 'scan')),
  created_at timestamptz not null default now()
);

create index if not exists timeline_events_user_id_idx on public.timeline_events (user_id, event_date desc);

alter table public.timeline_events enable row level security;

create policy "Users can view own timeline events"
  on public.timeline_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own timeline events"
  on public.timeline_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own timeline events"
  on public.timeline_events for update
  using (auth.uid() = user_id);

create policy "Users can delete own timeline events"
  on public.timeline_events for delete
  using (auth.uid() = user_id);

-- AI health summary (one per user)
create table if not exists public.health_summaries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  summary_text text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.health_summaries enable row level security;

create policy "Users can view own health summary"
  on public.health_summaries for select
  using (auth.uid() = user_id);

create policy "Users can insert own health summary"
  on public.health_summaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own health summary"
  on public.health_summaries for update
  using (auth.uid() = user_id);
