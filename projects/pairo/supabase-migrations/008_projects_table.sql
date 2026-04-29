-- ============================================
-- PAIRO: Projects / Portfolio table
-- Run this in Supabase SQL Editor
-- ============================================

-- Each user can have multiple projects with cover + visuals
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  role text,
  year text,
  description text,
  cover_url text,
  visuals text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, sort_order);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view projects (for discover feed)
CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- Users can only manage their own projects
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
