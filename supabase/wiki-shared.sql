-- RecServerWiki 5.0: gemeinsames öffentliches Wiki
-- Im Supabase SQL Editor ausführen. Die alte private Sammlung bleibt erhalten.

create table if not exists public.recserverwiki_editors (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','editor')),
 granted_at timestamptz not null default now()
);
alter table public.recserverwiki_editors enable row level security;
revoke all on public.recserverwiki_editors from anon;
grant select on public.recserverwiki_editors to authenticated;
drop policy if exists "rsw_read_own_editor_role" on public.recserverwiki_editors;
create policy "rsw_read_own_editor_role" on public.recserverwiki_editors
 for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.recserverwiki_can_edit()
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (select 1 from public.recserverwiki_editors e
 where e.user_id = (select auth.uid()) and e.role in ('admin','editor'));
$$;
revoke all on function public.recserverwiki_can_edit() from public;
grant execute on function public.recserverwiki_can_edit() to authenticated;

create table if not exists public.recserverwiki_shared (
 key text primary key check (key = 'main'),
 revision bigint not null default 0 check (revision >= 0),
 file_name text,
 previous_file_name text,
 checksum text not null default '',
 updated_at timestamptz not null default now()
);
alter table public.recserverwiki_shared enable row level security;
grant select on public.recserverwiki_shared to anon,authenticated;
grant update on public.recserverwiki_shared to authenticated;
drop policy if exists "rsw_everyone_can_read" on public.recserverwiki_shared;
create policy "rsw_everyone_can_read" on public.recserverwiki_shared
 for select to anon,authenticated using (true);
drop policy if exists "rsw_editors_can_publish" on public.recserverwiki_shared;
create policy "rsw_editors_can_publish" on public.recserverwiki_shared
 for update to authenticated using ((select public.recserverwiki_can_edit()))
 with check ((select public.recserverwiki_can_edit()));
insert into public.recserverwiki_shared(key,revision,checksum)
values ('main',0,'') on conflict (key) do nothing;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('recserverwiki-public','recserverwiki-public',true,52428800,array['application/json']::text[])
on conflict (id) do update set public=true;
drop policy if exists "rsw_public_read_snapshots" on storage.objects;
create policy "rsw_public_read_snapshots" on storage.objects
 for select to anon,authenticated using (bucket_id = 'recserverwiki-public');
drop policy if exists "rsw_editor_upload_snapshots" on storage.objects;
create policy "rsw_editor_upload_snapshots" on storage.objects
 for insert to authenticated with check (
 bucket_id = 'recserverwiki-public' and
 (storage.foldername(name))[1] = 'snapshots' and
 (select public.recserverwiki_can_edit())
 );
drop policy if exists "rsw_editor_delete_snapshots" on storage.objects;
create policy "rsw_editor_delete_snapshots" on storage.objects
 for delete to authenticated using (
 bucket_id = 'recserverwiki-public' and
 (select public.recserverwiki_can_edit())
 );

-- Admin freischalten, nach Registrierung separat ausführen:
-- insert into public.recserverwiki_editors(user_id,role)
-- select id,'admin' from auth.users where email='DEINE_LOGIN_EMAIL'
-- on conflict (user_id) do update set role='admin';
