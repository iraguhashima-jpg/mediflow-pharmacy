-- 003_pharmacies_profiles.sql
-- Adds pharmacies table, user profile fields, avatar storage path.

CREATE TABLE IF NOT EXISTS pharmacies (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  legal_name      TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT NOT NULL DEFAULT 'Rwanda',
  phone           TEXT,
  email           TEXT,
  license_number  TEXT,
  tax_id          TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single pharmacy for now; multi-tenant membership comes in a later migration.
-- We just point users at one pharmacy id.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pharmacy_id INTEGER REFERENCES pharmacies(id),
  ADD COLUMN IF NOT EXISTS job_title   TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_pharmacy ON users(pharmacy_id);
