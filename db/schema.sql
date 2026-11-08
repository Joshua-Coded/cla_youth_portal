CREATE TABLE IF NOT EXISTS members (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  name_key    TEXT NOT NULL,
  phone       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS members_name_idx ON members (name_key);
-- member | facilitator | leader
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';
CREATE INDEX IF NOT EXISTS members_phone_idx ON members (phone);

-- Ongoing programmes people check in to (Faith Forward, True North, ...)
CREATE TABLE IF NOT EXISTS programmes (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  tagline     TEXT,
  schedule    TEXT,
  color       TEXT NOT NULL DEFAULT '#7c5cff',
  icon        TEXT NOT NULL DEFAULT 'star',
  code        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per programme per day it met; created by the first check-in that day
CREATE TABLE IF NOT EXISTS sessions (
  id            SERIAL PRIMARY KEY,
  programme_id  INTEGER NOT NULL REFERENCES programmes (id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  is_open       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (programme_id, date)
);

CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  member_id   INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, member_id)
);
CREATE INDEX IF NOT EXISTS attendance_member_idx ON attendance (member_id);

-- Rooms (classes) inside Faith Forward; a facilitator takes the roll for each
CREATE TABLE IF NOT EXISTS classes (
  id              SERIAL PRIMARY KEY,
  programme_id    INTEGER NOT NULL REFERENCES programmes (id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  room            TEXT,
  facilitator_id  INTEGER REFERENCES members (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A person belongs to at most one class per programme
CREATE TABLE IF NOT EXISTS class_members (
  class_id      INTEGER NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  member_id     INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  programme_id  INTEGER NOT NULL REFERENCES programmes (id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, member_id),
  UNIQUE (programme_id, member_id)
);

-- When a facilitator submitted the roll for a class on a given session
CREATE TABLE IF NOT EXISTS class_rolls (
  class_id    INTEGER NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  session_id  INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, session_id)
);

-- self = scanned the QR, class = marked by a facilitator
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'self';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes (id) ON DELETE SET NULL;

INSERT INTO programmes (name, color, icon, code, sort_order)
SELECT * FROM (VALUES
  ('Faith Forward', '#7c5cff', 'arrow',   'faith-forward', 1),
  ('True North',    '#0ea5e9', 'compass', 'true-north',    2),
  ('Campus Fusion', '#f97316', 'spark',   'campus-fusion', 3),
  ('119',           '#10b981', 'book',    '119',           4)
) AS seed (name, color, icon, code, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM programmes);
