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
