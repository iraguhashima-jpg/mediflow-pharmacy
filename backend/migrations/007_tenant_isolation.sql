ALTER TABLE medicines ADD COLUMN IF NOT EXISTS pharmacy_id INTEGER REFERENCES pharmacies(id);
UPDATE medicines SET pharmacy_id = (SELECT id FROM pharmacies ORDER BY id LIMIT 1) WHERE pharmacy_id IS NULL;
ALTER TABLE medicines ALTER COLUMN pharmacy_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medicines_pharmacy ON medicines(pharmacy_id);

ALTER TABLE batches ADD COLUMN IF NOT EXISTS pharmacy_id INTEGER REFERENCES pharmacies(id);
UPDATE batches SET pharmacy_id = (SELECT pharmacy_id FROM medicines WHERE medicines.id = batches.medicine_id) WHERE pharmacy_id IS NULL;
ALTER TABLE batches ALTER COLUMN pharmacy_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batches_pharmacy ON batches(pharmacy_id);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS pharmacy_id INTEGER REFERENCES pharmacies(id);
UPDATE sales SET pharmacy_id = (SELECT pharmacy_id FROM medicines WHERE medicines.id = sales.medicine_id) WHERE pharmacy_id IS NULL;
ALTER TABLE sales ALTER COLUMN pharmacy_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_pharmacy ON sales(pharmacy_id);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS pharmacy_id INTEGER REFERENCES pharmacies(id);
UPDATE audit_logs a SET pharmacy_id = (SELECT u.pharmacy_id FROM users u WHERE u.id = a.user_id) WHERE pharmacy_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_pharmacy ON audit_logs(pharmacy_id);
