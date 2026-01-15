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
  user_id TEXT, -- Anonymous User ID from Cookie
  video_id TEXT, -- Optional link to original video
  r2_key TEXT NOT NULL,
  original_r2_key TEXT, -- Original input image key
  type TEXT DEFAULT 'image', -- 'image' or 'webtoon'
  prompt TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_type ON generated_images(type);
