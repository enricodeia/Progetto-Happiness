-- ============================================
-- PAIRO: Security fixes migration
-- Run this in Supabase SQL Editor
-- ============================================


-- ============================================
-- 1. Fix swipes CHECK constraint
--    App sends 'like'/'pass', not 'left'/'right'
-- ============================================

ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_direction_check;
ALTER TABLE swipes ADD CONSTRAINT swipes_direction_check
  CHECK (direction IN ('like', 'pass'));


-- ============================================
-- 2. Replace matches view with secure function
--    Views bypass RLS. This function filters
--    to only return the calling user's matches.
-- ============================================

DROP VIEW IF EXISTS matches;

CREATE OR REPLACE FUNCTION get_my_matches()
RETURNS TABLE (
  matched_user_id uuid,
  matched_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN a.swiper_id = auth.uid() THEN a.swiped_id
      ELSE a.swiper_id
    END AS matched_user_id,
    GREATEST(a.created_at, b.created_at) AS matched_at
  FROM swipes a
  JOIN swipes b ON a.swiper_id = b.swiped_id AND a.swiped_id = b.swiper_id
  WHERE a.direction = 'like' AND b.direction = 'like'
    AND (a.swiper_id = auth.uid() OR a.swiped_id = auth.uid())
    AND a.swiper_id < a.swiped_id;
$$;

-- Only authenticated users can call this
REVOKE ALL ON FUNCTION get_my_matches() FROM public;
GRANT EXECUTE ON FUNCTION get_my_matches() TO authenticated;


-- ============================================
-- 3. Scope avatar uploads to user's own folder
--    Drop the old open policy, create a scoped one.
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

CREATE POLICY "Users can upload to own avatar folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Also scope UPDATE to own folder
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================
-- 4. Hide Stripe columns from other users
--    Create a view for public profile data,
--    and restrict direct table SELECT to own row
--    for sensitive columns.
-- ============================================

-- Drop the old open SELECT policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;

-- New: users can read all profiles, but only non-sensitive columns
-- We use a secure view for the discover feed
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id, name, role, bio, skills, photo_url, photos, location,
  looking_for, company, years_experience, availability,
  onboarding_complete, is_pro, date_of_birth, prompts,
  created_at, updated_at
FROM profiles;

-- Secure the view: only authenticated
ALTER VIEW public_profiles SET (security_invoker = false);
REVOKE ALL ON public_profiles FROM public;
GRANT SELECT ON public_profiles TO authenticated;

-- Direct table SELECT: only your own row (needed for reading your Stripe data)
CREATE POLICY "Users can read own full profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);


-- ============================================
-- 5. Add DELETE policy on profiles
--    Users should be able to delete their account data.
-- ============================================

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);


-- ============================================
-- 6. Messages: add DELETE policy
--    Users should be able to delete their own sent messages.
-- ============================================

CREATE POLICY "Users can delete own sent messages"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);
