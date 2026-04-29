-- ============================================
-- PAIRO: Settings & Preferences columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Settings (notification toggles, profile visibility)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setting_push_notifications boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setting_email_updates boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setting_profile_visible boolean DEFAULT true;

-- Preferences (discovery filters)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pref_distance integer DEFAULT 25;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pref_show_remote boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pref_role_types text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pref_industries text[] DEFAULT '{}';

-- Update the public_profiles view to include new columns
-- (preferences are private, settings are private, so they stay OUT of the view)
-- The view already excludes these because it only lists specific columns.
-- No view change needed.
