-- Fix: missing ON clause for mi_web_push_subscriptions policy (run if 010 failed mid-way)

drop policy if exists mi_web_push_subscriptions_self on public.mi_web_push_subscriptions;
create policy mi_web_push_subscriptions_self
  on public.mi_web_push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
