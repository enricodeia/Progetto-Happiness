-- ============================================
-- PAIRO: Swipes + Matches system
-- Run this in Supabase SQL Editor
-- ============================================

-- Swipes table: records every swipe action
CREATE TABLE IF NOT EXISTS swipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  swiped_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('left', 'right')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(swiper_id, swiped_id)
);

-- Matches view: mutual right swipes
CREATE OR REPLACE VIEW matches AS
SELECT
  a.swiper_id AS user_a,
  a.swiped_id AS user_b,
  GREATEST(a.created_at, b.created_at) AS matched_at
FROM swipes a
JOIN swipes b ON a.swiper_id = b.swiped_id AND a.swiped_id = b.swiper_id
WHERE a.direction = 'right' AND b.direction = 'right'
  AND a.swiper_id < a.swiped_id; -- avoid duplicates

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_pair ON swipes(swiper_id, swiped_id);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own swipes
CREATE POLICY "Users can insert own swipes"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);

-- Users can read swipes they're involved in
CREATE POLICY "Users can read own swipes"
  ON swipes FOR SELECT
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

-- ============================================
-- Profiles: ensure RLS is on + add missing policies
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read profiles (for Discover)
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (onboarding)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Grant access to the matches view
GRANT SELECT ON matches TO authenticated;
