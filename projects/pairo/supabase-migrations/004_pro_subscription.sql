-- ============================================
-- PAIRO: Pro subscription columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Add Pro subscription fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_since timestamptz;
