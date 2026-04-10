-- StreamControl base schema for Supabase
-- Run this in the Supabase SQL editor for a fresh project.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    username,
    display_name,
    avatar,
    role
  )
  values (
    new.id,
    new.email,
    split_part(coalesce(new.email, ''), '@', 1),
    split_part(coalesce(new.email, ''), '@', 1),
    null,
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text,
  display_name text,
  avatar text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  poster text not null default '',
  backdrop text not null default '',
  trailer_url text not null default '',
  stream_url text not null default '',
  genre text[] not null default '{}',
  rating numeric(3,1) not null default 0,
  year integer not null default extract(year from now()),
  duration text not null default '',
  cast_members text[] not null default '{}',
  quality text[] not null default '{"Auto"}',
  subtitle_url text not null default '',
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  is_new boolean not null default false,
  is_exclusive boolean not null default false,
  is_published boolean not null default false,
  view_count integer not null default 0,
  category_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  poster text not null default '',
  backdrop text not null default '',
  trailer_url text not null default '',
  genre text[] not null default '{}',
  rating numeric(3,1) not null default 0,
  year integer not null default extract(year from now()),
  cast_members text[] not null default '{}',
  total_seasons integer not null default 0,
  total_episodes integer not null default 0,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  is_new boolean not null default false,
  is_exclusive boolean not null default false,
  is_published boolean not null default false,
  view_count integer not null default 0,
  category_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  number integer not null,
  title text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (series_id, number)
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  number integer not null,
  title text not null,
  description text not null default '',
  thumbnail text not null default '',
  stream_url text not null default '',
  subtitle_url text not null default '',
  duration text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (season_id, number)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text not null default '',
  stream_url text not null default '',
  category text not null default 'general',
  current_program text not null default '',
  is_live boolean not null default false,
  is_featured boolean not null default false,
  viewers integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  backdrop text not null default '',
  content_id uuid not null,
  content_type text not null check (content_type in ('movie', 'series')),
  badge text,
  genre text[] not null default '{}',
  rating numeric(3,1) not null default 0,
  year integer not null default extract(year from now()),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  content_id uuid not null,
  content_type text not null check (content_type in ('movie', 'series')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, content_id)
);

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  content_id uuid not null,
  content_type text not null check (content_type in ('movie', 'episode')),
  progress integer not null default 0,
  duration integer not null default 0,
  last_watched_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, content_id)
);

create table if not exists public.active_viewer_sessions (
  session_id text primary key,
  user_id uuid references public.user_profiles(id) on delete set null,
  content_id uuid not null,
  content_type text not null check (content_type in ('movie', 'series', 'channel')),
  started_at timestamptz not null default timezone('utc', now()),
  last_seen timestamptz not null default timezone('utc', now())
);

create table if not exists public.watch_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room_code text not null unique,
  host_id uuid not null references public.user_profiles(id) on delete cascade,
  content_id uuid not null,
  content_type text not null check (content_type in ('movie', 'episode', 'channel')),
  content_title text not null,
  content_poster text not null default '',
  privacy text not null default 'public' check (privacy in ('public', 'private', 'invite')),
  max_participants integer not null default 10,
  is_active boolean not null default true,
  playback_time integer not null default 0,
  is_playing boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.watch_room_members (
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_movies_published on public.movies (is_published, view_count desc);
create index if not exists idx_series_published on public.series (is_published, view_count desc);
create index if not exists idx_seasons_series_id on public.seasons (series_id);
create index if not exists idx_episodes_series_id on public.episodes (series_id);
create index if not exists idx_episodes_season_id on public.episodes (season_id);
create index if not exists idx_channels_sort_order on public.channels (sort_order);
create index if not exists idx_banners_sort_order on public.banners (sort_order);
create index if not exists idx_favorites_user_id on public.favorites (user_id);
create index if not exists idx_watch_history_user_id on public.watch_history (user_id, last_watched_at desc);
create index if not exists idx_active_viewer_sessions_content on public.active_viewer_sessions (content_type, content_id, last_seen desc);
create index if not exists idx_watch_rooms_active on public.watch_rooms (is_active, created_at desc);
create index if not exists idx_watch_room_members_room_id on public.watch_room_members (room_id);
create index if not exists idx_room_messages_room_id on public.room_messages (room_id, created_at asc);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_movies_updated_at on public.movies;
create trigger set_movies_updated_at
  before update on public.movies
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_series_updated_at on public.series;
create trigger set_series_updated_at
  before update on public.series
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_seasons_updated_at on public.seasons;
create trigger set_seasons_updated_at
  before update on public.seasons
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_episodes_updated_at on public.episodes;
create trigger set_episodes_updated_at
  before update on public.episodes
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_channels_updated_at on public.channels;
create trigger set_channels_updated_at
  before update on public.channels
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_banners_updated_at on public.banners;
create trigger set_banners_updated_at
  before update on public.banners
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_watch_history_updated_at on public.watch_history;
create trigger set_watch_history_updated_at
  before update on public.watch_history
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_watch_rooms_updated_at on public.watch_rooms;
create trigger set_watch_rooms_updated_at
  before update on public.watch_rooms
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute procedure public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.movies enable row level security;
alter table public.series enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.channels enable row level security;
alter table public.banners enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_history enable row level security;
alter table public.active_viewer_sessions enable row level security;
alter table public.watch_rooms enable row level security;
alter table public.watch_room_members enable row level security;
alter table public.room_messages enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.user_profiles;
create policy "profiles_select_own_or_admin"
  on public.user_profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own_non_role" on public.user_profiles;
create policy "profiles_update_own_non_role"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.user_profiles where id = auth.uid()));

drop policy if exists "profiles_admin_all" on public.user_profiles;
create policy "profiles_admin_all"
  on public.user_profiles for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "movies_public_read" on public.movies;
create policy "movies_public_read"
  on public.movies for select
  using (is_published or public.is_admin());

drop policy if exists "movies_admin_all" on public.movies;
create policy "movies_admin_all"
  on public.movies for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "series_public_read" on public.series;
create policy "series_public_read"
  on public.series for select
  using (is_published or public.is_admin());

drop policy if exists "series_admin_all" on public.series;
create policy "series_admin_all"
  on public.series for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "seasons_public_read" on public.seasons;
create policy "seasons_public_read"
  on public.seasons for select
  using (
    exists (
      select 1
      from public.series
      where public.series.id = seasons.series_id
        and (public.series.is_published or public.is_admin())
    )
  );

drop policy if exists "seasons_admin_all" on public.seasons;
create policy "seasons_admin_all"
  on public.seasons for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "episodes_public_read" on public.episodes;
create policy "episodes_public_read"
  on public.episodes for select
  using (
    exists (
      select 1
      from public.series
      where public.series.id = episodes.series_id
        and (public.series.is_published or public.is_admin())
    )
  );

drop policy if exists "episodes_admin_all" on public.episodes;
create policy "episodes_admin_all"
  on public.episodes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "channels_public_read" on public.channels;
create policy "channels_public_read"
  on public.channels for select
  using (true);

drop policy if exists "channels_admin_all" on public.channels;
create policy "channels_admin_all"
  on public.channels for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "banners_public_read" on public.banners;
create policy "banners_public_read"
  on public.banners for select
  using (is_active or public.is_admin());

drop policy if exists "banners_admin_all" on public.banners;
create policy "banners_admin_all"
  on public.banners for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "favorites_own_all" on public.favorites;
create policy "favorites_own_all"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "watch_history_own_all" on public.watch_history;
create policy "watch_history_own_all"
  on public.watch_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.increment_content_view(target_id uuid, target_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_type = 'movie' then
    update public.movies
    set view_count = view_count + 1,
        updated_at = timezone('utc', now())
    where id = target_id;
  elsif target_type = 'series' then
    update public.series
    set view_count = view_count + 1,
        updated_at = timezone('utc', now())
    where id = target_id;
  end if;
end;
$$;

drop policy if exists "active_viewer_sessions_read" on public.active_viewer_sessions;
create policy "active_viewer_sessions_read"
  on public.active_viewer_sessions for select
  using (true);

drop policy if exists "active_viewer_sessions_insert" on public.active_viewer_sessions;
create policy "active_viewer_sessions_insert"
  on public.active_viewer_sessions for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "active_viewer_sessions_update" on public.active_viewer_sessions;
create policy "active_viewer_sessions_update"
  on public.active_viewer_sessions for update
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "active_viewer_sessions_delete" on public.active_viewer_sessions;
create policy "active_viewer_sessions_delete"
  on public.active_viewer_sessions for delete
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "watch_rooms_read_active" on public.watch_rooms;
create policy "watch_rooms_read_active"
  on public.watch_rooms for select
  using (is_active or host_id = auth.uid() or public.is_admin());

drop policy if exists "watch_rooms_create_own" on public.watch_rooms;
create policy "watch_rooms_create_own"
  on public.watch_rooms for insert
  with check (auth.uid() = host_id);

drop policy if exists "watch_rooms_update_host_or_admin" on public.watch_rooms;
create policy "watch_rooms_update_host_or_admin"
  on public.watch_rooms for update
  using (auth.uid() = host_id or public.is_admin())
  with check (auth.uid() = host_id or public.is_admin());

drop policy if exists "watch_room_members_read" on public.watch_room_members;
create policy "watch_room_members_read"
  on public.watch_room_members for select
  using (true);

drop policy if exists "watch_room_members_own_all" on public.watch_room_members;
create policy "watch_room_members_own_all"
  on public.watch_room_members for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "room_messages_read" on public.room_messages;
create policy "room_messages_read"
  on public.room_messages for select
  using (
    exists (
      select 1
      from public.watch_room_members wrm
      where wrm.room_id = room_messages.room_id
        and wrm.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "room_messages_insert_member" on public.room_messages;
create policy "room_messages_insert_member"
  on public.room_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.watch_room_members wrm
      where wrm.room_id = room_messages.room_id
        and wrm.user_id = auth.uid()
    )
  );

drop policy if exists "app_settings_public_read" on public.app_settings;
create policy "app_settings_public_read"
  on public.app_settings for select
  using (true);

drop policy if exists "app_settings_admin_all" on public.app_settings;
create policy "app_settings_admin_all"
  on public.app_settings for all
  using (public.is_admin())
  with check (public.is_admin());
