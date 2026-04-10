-- StreamControl starter seed
-- Run after schema.sql

insert into public.app_settings (key, value)
values
  ('app_name', 'StreamControl'),
  ('primary_color', '#6366F1'),
  ('logo_url', ''),
  ('watch_rooms_enabled', 'true'),
  ('live_tv_enabled', 'true'),
  ('maintenance_mode', 'false')
on conflict (key) do update
set value = excluded.value,
    updated_at = timezone('utc', now());

-- Promote your first admin manually after creating a user account:
-- update public.user_profiles
-- set role = 'admin'
-- where email = 'you@example.com';
