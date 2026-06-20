-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id   TEXT UNIQUE,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE,
  avatar_url  TEXT,
  is_guest    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Matches
CREATE TABLE matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code    TEXT UNIQUE NOT NULL,
  game_mode    TEXT CHECK (game_mode IN ('FFA', 'TEAM')) DEFAULT 'FFA',
  map_type     TEXT CHECK (map_type IN ('SMALL', 'LARGE')) DEFAULT 'SMALL',
  status       TEXT CHECK (status IN ('WAITING', 'IN_PROGRESS', 'FINISHED')) DEFAULT 'WAITING',
  max_players  INTEGER DEFAULT 8,
  time_limit   INTEGER DEFAULT 180,
  winner_team  TEXT CHECK (winner_team IN ('RED', 'BLUE')),
  is_public    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT NOW(),
  started_at   TIMESTAMP,
  ended_at     TIMESTAMP
);

-- Stats (junction table)
CREATE TABLE stats (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id  UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  kills     INTEGER DEFAULT 0,
  deaths    INTEGER DEFAULT 0,
  team      TEXT CHECK (team IN ('RED', 'BLUE')),
  won       BOOLEAN DEFAULT FALSE
);