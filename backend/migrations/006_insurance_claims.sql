-- 006_insurance_claims.sql
-- Batch sales into insurance claims, track submission and payment.

CREATE TABLE IF NOT EXISTS insurance_claims (
  id                SERIAL PRIMARY KEY,
  pharmacy_id       INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  insurance_id      INTEGER NOT NULL REFERENCES insurances(id),
  -- Period this claim covers (inclusive).
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  -- Frozen summary numbers, computed once at creation.
  line_count        INTEGER NOT NULL DEFAULT 0,
  total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  claimed_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Workflow.
  status            TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','SUBMITTED','PAID','PARTIALLY_PAID','REJECTED')),
  submitted_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  rejection_reason  TEXT,
  notes             TEXT,
  -- Reference the insurer gives back, or our own internal number.
  reference_number  TEXT,
  created_by        INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claims_pharmacy   ON insurance_claims(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_claims_insurance  ON insurance_claims(insurance_id, status);

-- Each sale in a claim is a line. A sale can only be in ONE claim.
CREATE TABLE IF NOT EXISTS insurance_claim_lines (
  id             SERIAL PRIMARY KEY,
  claim_id       INTEGER NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  sale_id        INTEGER NOT NULL REFERENCES sales(id),
  claimed_amount NUMERIC(12,2) NOT NULL,
  UNIQUE (sale_id)
);
CREATE INDEX IF NOT EXISTS idx_claim_lines_claim ON insurance_claim_lines(claim_id);

-- A claim line points at a sale; the sale should not already be in a PAID claim.
-- (We enforce "not in any claim" from the app; DB-level check is not possible
--  across two tables without a trigger, so we do it in SQL before insert.)

-- =========================================================
-- Reports helper: view of outstanding claims
-- =========================================================
CREATE OR REPLACE VIEW insurance_outstanding AS
SELECT
  c.pharmacy_id,
  c.insurance_id,
  i.code   AS insurance_code,
  i.name   AS insurance_name,
  c.id     AS claim_id,
  c.period_start,
  c.period_end,
  c.status,
  c.claimed_amount,
  c.paid_amount,
  (c.claimed_amount - c.paid_amount) AS outstanding,
  c.submitted_at,
  c.paid_at
FROM insurance_claims c
JOIN insurances i ON i.id = c.insurance_id
WHERE c.status IN ('SUBMITTED','PARTIALLY_PAID');
