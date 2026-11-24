PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  universe_id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  creator TEXT NOT NULL DEFAULT 'Unknown creator',
  creator_id TEXT,
  creator_type TEXT,
  creator_verified INTEGER NOT NULL DEFAULT 0 CHECK (creator_verified IN (0, 1)),
  genre TEXT NOT NULL DEFAULT 'Other',
  subgenre TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  age_recommendation TEXT,
  max_players INTEGER,
  voice_chat TEXT,
  camera TEXT,
  artwork_url TEXT NOT NULL DEFAULT '',
  hero_url TEXT,
  roblox_url TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  source_created_at TEXT,
  source_updated_at TEXT,
  source_active_players INTEGER,
  source_favorites INTEGER,
  source_visits TEXT,
  source_likes INTEGER,
  source_dislikes INTEGER,
  source_date_fetched TEXT,
  source_rating REAL,
  source_review_count INTEGER,
  active_players INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  average_playtime_minutes REAL NOT NULL DEFAULT 0,
  weekly_change REAL NOT NULL DEFAULT 0,
  d1_retention REAL NOT NULL DEFAULT 0,
  d7_retention REAL NOT NULL DEFAULT 0,
  d30_retention REAL NOT NULL DEFAULT 0,
  repeat_play_rate REAL NOT NULL DEFAULT 0,
  average_session_minutes REAL NOT NULL DEFAULT 0,
  synthetic_seed INTEGER NOT NULL,
  match_scores_json TEXT NOT NULL DEFAULT '{}',
  source_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (source_status IN ('pending', 'valid', 'unavailable', 'invalid')),
  first_seen_at TEXT NOT NULL,
  last_enriched_at TEXT,
  updated_local_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_active_players ON games(active_players DESC);
CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(source_status);

CREATE TABLE IF NOT EXISTS game_metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  universe_id TEXT NOT NULL REFERENCES games(universe_id) ON DELETE CASCADE,
  observed_at TEXT NOT NULL,
  active_players INTEGER NOT NULL,
  visits TEXT,
  favorites INTEGER,
  rating REAL,
  review_count INTEGER,
  weekly_change REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('csv-2024', 'roblox-api', 'synthetic')),
  UNIQUE (universe_id, observed_at, source)
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_game_time
  ON game_metric_snapshots(universe_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  rows_seen INTEGER NOT NULL DEFAULT 0,
  rows_valid INTEGER NOT NULL DEFAULT 0,
  rows_invalid INTEGER NOT NULL DEFAULT 0,
  rows_unavailable INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  row_number INTEGER,
  universe_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS synthetic_personas (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  preferences_json TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations(version, name, applied_at)
VALUES (1, 'initial-catalog-schema', datetime('now'));
