-- 005_reminders_insurance.sql
-- SMS reminders + insurance billing + payment methods on sales.

-- =========================================================
-- 1. INSURANCE
-- =========================================================
CREATE TABLE IF NOT EXISTS insurances (
  id                  SERIAL PRIMARY KEY,
  pharmacy_id         INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  code                TEXT NOT NULL,              -- short code, e.g. RSSB, RAMA, MMI, BRITAM
  name                TEXT NOT NULL,              -- full name
  contact_phone       TEXT,
  contact_email       TEXT,
  -- Reimbursement model:
  --   'PATIENT_PAYS_ALL'  — patient pays full, insurer refunds patient later
  --   'SPLIT_AT_COUNTER'  — patient pays copay, pharmacy bills insurer
  --   'INSURER_PAYS_ALL'  — pharmacy bills insurer the whole amount
  billing_model       TEXT NOT NULL DEFAULT 'SPLIT_AT_COUNTER'
                      CHECK (billing_model IN ('PATIENT_PAYS_ALL','SPLIT_AT_COUNTER','INSURER_PAYS_ALL')),
  -- Default reimbursement percentage the insurer covers (0-100).
  -- Only used when billing_model = 'SPLIT_AT_COUNTER'.
  coverage_percent    NUMERIC(5,2) NOT NULL DEFAULT 80.00
                      CHECK (coverage_percent >= 0 AND coverage_percent <= 100),
  -- What identifies a member on their card:
  member_id_label     TEXT NOT NULL DEFAULT 'Member number',
  active              BOOLEAN NOT NULL DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, code)
);
CREATE INDEX IF NOT EXISTS idx_insurances_pharmacy ON insurances(pharmacy_id);

-- Patient's insurance link (a patient can carry one active insurance at a time).
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS insurance_id            INTEGER REFERENCES insurances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS insurance_member_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expires_at    DATE;

-- Sales — payment + insurance split.
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_method          TEXT NOT NULL DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH','MOBILE_MONEY','CARD','INSURANCE')),
  ADD COLUMN IF NOT EXISTS insurance_id            INTEGER REFERENCES insurances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS insurance_member_number TEXT,
  ADD COLUMN IF NOT EXISTS patient_contribution    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS insurance_contribution  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS claim_status            TEXT
    CHECK (claim_status IS NULL OR claim_status IN ('PENDING','SUBMITTED','PAID','REJECTED'));

CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_claim_status   ON sales(claim_status);

-- =========================================================
-- 2. SMS REMINDERS
-- =========================================================
CREATE TABLE IF NOT EXISTS reminders (
  id                SERIAL PRIMARY KEY,
  pharmacy_id       INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  patient_id        INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id   INTEGER REFERENCES prescriptions(id) ON DELETE SET NULL,
  -- What the reminder is about (free text is fine — often it's a medicine name).
  subject           TEXT NOT NULL,
  dosage_instructions TEXT,
  -- Phone to send to (usually the patient's phone; can be overridden).
  phone             TEXT NOT NULL,
  -- Scheduling:
  first_dose_at     TIMESTAMPTZ NOT NULL,
  interval_minutes  INTEGER NOT NULL CHECK (interval_minutes > 0),
  total_doses       INTEGER NOT NULL CHECK (total_doses > 0),
  doses_sent        INTEGER NOT NULL DEFAULT 0 CHECK (doses_sent >= 0),
  -- State:
  status            TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  -- Message template. {subject}, {dosage}, {pharmacy}, {time} are substituted.
  message_template  TEXT NOT NULL DEFAULT
    'Reminder from {pharmacy}: time to take {subject} ({dosage}). Reply STOP to opt out.',
  created_by        INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_pharmacy ON reminders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due      ON reminders(status, first_dose_at);

CREATE TABLE IF NOT EXISTS reminder_sends (
  id             SERIAL PRIMARY KEY,
  reminder_id    INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  dose_number    INTEGER NOT NULL,
  phone          TEXT NOT NULL,
  body           TEXT NOT NULL,
  provider       TEXT NOT NULL,           -- 'console', 'africastalking', ...
  provider_message_id TEXT,
  status         TEXT NOT NULL DEFAULT 'SENT'
                 CHECK (status IN ('SENT','FAILED')),
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_reminder ON reminder_sends(reminder_id);

-- =========================================================
-- 3. Migration touch-ups (safety)
-- =========================================================
-- Patients can exist without an ID; make sure that's already true.
-- (national_id is nullable from 004 — nothing to change.)
