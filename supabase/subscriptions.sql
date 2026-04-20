-- Production-grade subscription access codes.
-- Run this in Supabase SQL editor before launch for server-backed code management.

create table if not exists public.subscription_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null default 'Subscription',
  duration_days integer not null default 30 check (duration_days > 0),
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  status text not null default 'active' check (status in ('active', 'disabled', 'expired')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_code_uses (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.subscription_codes(id) on delete cascade,
  session_id text not null,
  used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists subscription_codes_code_idx on public.subscription_codes (code);
create index if not exists subscription_codes_status_idx on public.subscription_codes (status);
create index if not exists subscription_code_uses_code_id_idx on public.subscription_code_uses (code_id);

alter table public.subscription_codes enable row level security;
alter table public.subscription_code_uses enable row level security;

drop policy if exists "Admins manage subscription codes" on public.subscription_codes;
create policy "Admins manage subscription codes"
on public.subscription_codes
for all
using (
  exists (
    select 1 from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
);

drop policy if exists "Admins read subscription uses" on public.subscription_code_uses;
create policy "Admins read subscription uses"
on public.subscription_code_uses
for select
using (
  exists (
    select 1 from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
);
