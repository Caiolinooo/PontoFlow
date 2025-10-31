-- Phase 19: profiles.ui_theme
-- Persist user theme preference for cross-device sync

alter table if exists public.profiles
  add column if not exists ui_theme text check (ui_theme in ('light','dark'));

-- Optional: default from current preference not set; leave null means follow system

