-- 004_patients_prescriptions.sql
-- Patients/clients of a pharmacy, prescriptions, patient-linked sales.

-- 1. Pharmacy: slug + patient self-registration toggle
ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS patient_self_registration BOOLEAN NOT NULL DEFAULT false;

-- Backfill a slug for any existing pharmacy rows
UPDATE pharmacies
   SET slug = regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g') || '-' || id
 WHERE slug IS NULL;

-- 2. Patients
CREATE TABLE IF NOT EXISTS patients (
  id                SERIAL PRIMARY KEY,
  pharmacy_id       INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  national_id       TEXT,
  date_of_birth     DATE,
  gender            TEXT CHECK (gender IN ('MALE','FEMALE','OTHER','UNSPECIFIED')),
  address           TEXT,
  allergies         TEXT,
  chronic_conditions TEXT,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_by        INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patients_pharmacy   ON patients(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_patients_name       ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone      ON patients(phone);

-- 3. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id                 SERIAL PRIMARY KEY,
  pharmacy_id        INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  patient_id         INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescriber_name    TEXT,
  prescriber_license TEXT,
  notes              TEXT,
  issued_at          DATE NOT NULL DEFAULT CURRENT_DATE,
  status             TEXT NOT NULL DEFAULT 'OPEN'
                     CHECK (status IN ('OPEN','DISPENSED','CANCELLED')),
  created_by         INTEGER REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy ON prescriptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient  ON prescriptions(patient_id);

CREATE TABLE IF NOT EXISTS prescription_items (
  id                SERIAL PRIMARY KEY,
  prescription_id   INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id       INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
  medicine_name     TEXT NOT NULL,
  dosage            TEXT,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  notes             TEXT
);
CREATE INDEX IF NOT EXISTS idx_presc_items_prescription ON prescription_items(prescription_id);

-- 4. Sales: attach to a patient (optional)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_patient ON sales(patient_id);
