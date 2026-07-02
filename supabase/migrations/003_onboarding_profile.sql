-- Extend profiles for onboarding and private user data

alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists phone text,
  add column if not exists onboarding_completed boolean not null default false;

-- Existing users who already have a name can skip re-onboarding
update public.profiles
set onboarding_completed = true
where full_name is not null
  and trim(full_name) <> ''
  and onboarding_completed = false;
