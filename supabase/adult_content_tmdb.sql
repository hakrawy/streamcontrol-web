alter table public.movies
  add column if not exists original_title text not null default '',
  add column if not exists imdb_id text,
  add column if not exists tmdb_id bigint,
  add column if not exists is_adult boolean not null default false,
  add column if not exists is_manually_blocked boolean not null default false,
  add column if not exists visibility_status text not null default 'visible';

alter table public.series
  add column if not exists original_title text not null default '',
  add column if not exists imdb_id text,
  add column if not exists tmdb_id bigint,
  add column if not exists is_adult boolean not null default false,
  add column if not exists is_manually_blocked boolean not null default false,
  add column if not exists visibility_status text not null default 'visible';

update public.movies
set visibility_status = 'visible'
where visibility_status is null or visibility_status = '';

update public.series
set visibility_status = 'visible'
where visibility_status is null or visibility_status = '';

alter table public.movies
  drop constraint if exists movies_visibility_status_check;

alter table public.movies
  add constraint movies_visibility_status_check
  check (visibility_status in ('visible', 'hidden', 'blocked'));

alter table public.series
  drop constraint if exists series_visibility_status_check;

alter table public.series
  add constraint series_visibility_status_check
  check (visibility_status in ('visible', 'hidden', 'blocked'));

create index if not exists idx_movies_visibility_adult on public.movies (is_adult, is_manually_blocked, visibility_status);
create index if not exists idx_series_visibility_adult on public.series (is_adult, is_manually_blocked, visibility_status);
create unique index if not exists idx_movies_tmdb_id_unique on public.movies (tmdb_id) where tmdb_id is not null;
create unique index if not exists idx_series_tmdb_id_unique on public.series (tmdb_id) where tmdb_id is not null;

insert into public.app_settings (key, value)
values
  ('adult_content_enabled', 'false'),
  ('adult_content_visible', 'false'),
  ('adult_import_enabled', 'false')
on conflict (key) do nothing;
