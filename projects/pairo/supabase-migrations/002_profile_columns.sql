-- ============================================
-- PAIRO: Add missing profile columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Add date_of_birth column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add prompts column (JSONB array of {q, a} objects)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prompts jsonb default '[]';

-- Add photos column (array of URLs)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photos text[] default '{}';
