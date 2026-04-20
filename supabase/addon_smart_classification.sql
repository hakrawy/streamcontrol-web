alter table public.content_external_refs
  drop constraint if exists content_external_refs_content_type_check;

alter table public.content_external_refs
  add constraint content_external_refs_content_type_check
  check (content_type in ('movie', 'series', 'episode', 'channel'));

create index if not exists idx_content_external_refs_addon_external
  on public.content_external_refs (addon_id, external_type, external_id);
