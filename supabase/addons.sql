create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  addon_key text not null,
  manifest_url text not null unique,
  name text not null,
  description text not null default '',
  logo text not null default '',
  version text not null default '',
  catalogs jsonb not null default '[]'::jsonb,
  resources text[] not null default '{}',
  types text[] not null default '{}',
  enabled boolean not null default true,
  manifest_json jsonb,
  last_tested_at timestamptz,
  last_imported_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_addons_addon_key on public.addons (addon_key);

create table if not exists public.content_external_refs (
  id uuid primary key default gen_random_uuid(),
  addon_id uuid not null references public.addons(id) on delete cascade,
  content_type text not null check (content_type in ('movie', 'series', 'episode')),
  content_id text not null,
  external_type text not null,
  external_id text not null,
  imdb_id text,
  title text,
  year integer,
  meta_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (addon_id, content_type, external_id)
);

create index if not exists idx_content_external_refs_content on public.content_external_refs (content_type, content_id);
create index if not exists idx_content_external_refs_imdb on public.content_external_refs (imdb_id);
create index if not exists idx_content_external_refs_title_year on public.content_external_refs (title, year);

drop trigger if exists set_addons_updated_at on public.addons;
create trigger set_addons_updated_at
  before update on public.addons
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_content_external_refs_updated_at on public.content_external_refs;
create trigger set_content_external_refs_updated_at
  before update on public.content_external_refs
  for each row execute procedure public.set_updated_at();

alter table public.addons enable row level security;
alter table public.content_external_refs enable row level security;

drop policy if exists "addons_public_enabled_read" on public.addons;
create policy "addons_public_enabled_read"
  on public.addons for select
  using (enabled or public.is_admin());

drop policy if exists "addons_admin_all" on public.addons;
create policy "addons_admin_all"
  on public.addons for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "content_external_refs_public_read" on public.content_external_refs;
create policy "content_external_refs_public_read"
  on public.content_external_refs for select
  using (
    exists (
      select 1
      from public.addons
      where public.addons.id = content_external_refs.addon_id
        and (public.addons.enabled or public.is_admin())
    )
  );

drop policy if exists "content_external_refs_admin_all" on public.content_external_refs;
create policy "content_external_refs_admin_all"
  on public.content_external_refs for all
  using (public.is_admin())
  with check (public.is_admin());
