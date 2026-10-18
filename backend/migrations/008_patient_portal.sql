ALTER TABLE patients ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_patients_token ON patients(access_token);
