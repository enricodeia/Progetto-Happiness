-- Saves/Bookmarks table
CREATE TABLE IF NOT EXISTS saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  saver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(saver_id, saved_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_saver ON saves(saver_id);

ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own saves"
  ON saves FOR INSERT
  WITH CHECK (auth.uid() = saver_id);

CREATE POLICY "Users can read own saves"
  ON saves FOR SELECT
  USING (auth.uid() = saver_id);

CREATE POLICY "Users can delete own saves"
  ON saves FOR DELETE
  USING (auth.uid() = saver_id);
