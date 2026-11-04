-- RecServerNews 4.0: Supabase-Cloud mit privaten Archiven pro Konto.
-- Diesen gesamten Inhalt im SQL Editor DEINES Supabase-Projektes ausführen.
-- Keine Service-Role- oder Secret-Keys in die HTML-Datei kopieren!

create table if not exists public.recservernews_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  file_name text not null,
  previous_file_name text,
  checksum text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.recservernews_sync enable row level security;
grant select,insert,update on public.recservernews_sync to authenticated;

drop policy if exists "rsn_read_own_archive" on public.recservernews_sync;
create policy "rsn_read_own_archive" on public.recservernews_sync
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "rsn_create_own_archive" on public.recservernews_sync;
create policy "rsn_create_own_archive" on public.recservernews_sync
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "rsn_update_own_archive" on public.recservernews_sync;
create policy "rsn_update_own_archive" on public.recservernews_sync
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Private Bucket: Bilder und Artikel werden als einzelne JSON-Snapshots
-- gespeichert. Jedes Konto bekommt einen eigenen UUID-Unterordner.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('recservernews-private','recservernews-private',false,52428800,array['application/json']::text[])
on conflict (id) do nothing;

drop policy if exists "rsn_view_own_snapshots" on storage.objects;
create policy "rsn_view_own_snapshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'recservernews-private' and
         (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "rsn_upload_own_snapshots" on storage.objects;
create policy "rsn_upload_own_snapshots" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recservernews-private' and
              (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "rsn_delete_own_snapshots" on storage.objects;
create policy "rsn_delete_own_snapshots" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recservernews-private' and
         (storage.foldername(name))[1] = (select auth.uid())::text);