create table if not exists public.active_viewer_sessions (
  session_id text primary key,
  user_id uuid references public.user_profiles(id) on delete set null,
  content_id uuid not null,
  content_type text not null check (content_type in ('movie', 'series', 'channel')),
  started_at timestamptz not null default timezone('utc', now()),
  last_seen timestamptz not null default timezone('utc', now())
);

create index if not exists idx_active_viewer_sessions_content
  on public.active_viewer_sessions (content_type, content_id, last_seen desc);

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

alter table public.active_viewer_sessions enable row level security;

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
