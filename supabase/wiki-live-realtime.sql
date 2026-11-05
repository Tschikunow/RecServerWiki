-- RecServerWiki Live-Synchronisierung
-- Nur das öffentliche Metadaten-Update wird als Live-Signal übertragen.
-- Die eigentlichen Artikel bleiben im vorhandenen versionierten JSON-Archiv.
-- Alle RLS-Richtlinien und Admin-Konten bleiben unverändert.
do $$
begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime')
 and not exists (
  select 1 from pg_publication_tables
  where pubname='supabase_realtime'
  and schemaname='public'
  and tablename='recserverwiki_shared'
 ) then
  alter publication supabase_realtime add table public.recserverwiki_shared;
 end if;
end
$$;
