-- 002_users_real.sql
-- Turn the users table into something a real pharmacy can operate on.

-- Status: ACTIVE, SUSPENDED. Never hard-delete users, just suspend.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','SUSPENDED'));

-- Force first-login password change for accounts created with a temp password.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Track when a user last successfully logged in.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Track who created the account (audit trail for staff onboarding).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Index for the login path.
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Rate-limit table for login attempts.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  success    BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, created_at DESC);
