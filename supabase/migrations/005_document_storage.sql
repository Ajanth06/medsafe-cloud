-- Document file storage (private bucket, per-user paths)

alter table public.documents
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Users upload own document files" on storage.objects;
drop policy if exists "Users read own document files" on storage.objects;
drop policy if exists "Users delete own document files" on storage.objects;

create policy "Users upload own document files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own document files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own document files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
