CREATE TABLE IF NOT EXISTS patient_messages (
  id                  SERIAL PRIMARY KEY,
  pharmacy_id         INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  patient_id          INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  phone               TEXT NOT NULL,
  body                TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','FAILED')),
  error               TEXT,
  sent_by             INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_messages_patient ON patient_messages(patient_id);
