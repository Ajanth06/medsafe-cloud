-- Extended profile fields for onboarding

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists gender text,
  add column if not exists primary_diagnosis text,
  add column if not exists treating_clinic text,
  add column if not exists emergency_contact text,
  add column if not exists language text not null default 'de';

-- Backfill first/last name from existing full_name
update public.profiles
set
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = nullif(trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1)), '')
where full_name is not null
  and trim(full_name) <> ''
  and (first_name is null or last_name is null);
