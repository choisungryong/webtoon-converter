DROP TABLE IF EXISTS videos;
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, uploaded, processing, completed, failed
  r2_key TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  video_id TEXT, -- Optional link to original video
  r2_key TEXT NOT NULL,
  prompt TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_images_created_at ON generated_images(created_at DESC);
