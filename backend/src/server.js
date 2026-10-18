import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'node:crypto';
import { pool } from './db.js';
import { sendSms } from './sms.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));

const PgStore = connectPgSimple(session);
app.use(session({
  store: new PgStore({ pool, tableName: 'session', createTableIfMissing: true }),
  name: 'mediflow.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
}));

const auth = (req, res, next) => req.session?.user ? next() : res.status(401).json({ error: 'Authentication required.' });
const currentPharmacyId = async (userId) => {
  const { rows } = await pool.query('SELECT pharmacy_id FROM users WHERE id = $1', [userId]);
  return rows[0]?.pharmacy_id;
};

// ================== AUTH ==================
app.post('/api/auth/register', async (req, res) => {
  try {
    const input = z.object({
      ownerName: z.string().min(2), email: z.string().email(), password: z.string().min(10),
      pharmacyName: z.string().min(2), phone: z.string().optional().nullable(),
      pharmacyCity: z.string().optional().nullable(), pharmacyAddress: z.string().optional().nullable(),
      pharmacyLicense: z.string().optional().nullable(), pharmacyPhone: z.string().optional().nullable()
    }).parse(req.body);

    const email = input.email.toLowerCase();
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const slug = input.pharmacyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      const ph = await client.query(`INSERT INTO pharmacies (name, slug) VALUES ($1, $2) RETURNING id`, [input.pharmacyName, slug]);
      const pharmacyId = ph.rows[0].id;
      
      const hash = bcrypt.hashSync(input.password, 12);
      const u = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status, must_change_password, pharmacy_id, approval_status) 
         VALUES ($1, $2, $3, 'OWNER', 'ACTIVE', false, $4, 'APPROVED') RETURNING id, name, email, role`,
        [input.ownerName, email, hash, pharmacyId]
      );
      await client.query('COMMIT');

      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: 'Session failed' });
        req.session.user = { id: u.rows[0].id, name: u.rows[0].name, email: u.rows[0].email, role: u.rows[0].role };
        res.status(201).json({ user: req.session.user });
      });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); } finally { client.release(); }
  } catch (err) { res.status(422).json({ error: 'Validation failed. Check all fields.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Incorrect email or password.' });

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session failed' });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ user: req.session.user });
  });
});

app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.clearCookie('mediflow.sid').json({ ok: true })));


// ================== SECURE JOIN & APPROVAL ==================
app.post('/api/auth/request-join', async (req, res) => {
  try {
    const { name, email, password, phone, pharmacy_slug, requested_role, otp_code } = req.body;
    const emailLower = email.toLowerCase();
    
    // RULE 1: Password cannot be the email
    if (password.toLowerCase() === emailLower) {
      return res.status(422).json({ error: 'Password cannot be your email address.' });
    }

    // RULE 2: Verify OTP
    const otpCheck = await pool.query('SELECT 1 FROM otp_codes WHERE phone = $1 AND code = $2 AND expires_at > now()', [phone, otp_code]);
    if (!otpCheck.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired SMS code. Please request a new code.' });
    }
    await pool.query('DELETE FROM otp_codes WHERE phone = $1', [phone]);

    // RULE 3: Check if email exists
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered.' });
    
    // RULE 4: Find the pharmacy
    const ph = await pool.query('SELECT id FROM pharmacies WHERE slug = $1', [pharmacy_slug]);
    if (!ph.rows[0]) return res.status(404).json({ error: 'Pharmacy not found.' });
    
    // Create user with PENDING status
    const hash = bcrypt.hashSync(password, 12);
    const { rows } = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, status, must_change_password, pharmacy_id, phone, approval_status)
      VALUES ($1, $2, $3, $4, 'ACTIVE', false, $5, $6, 'PENDING') RETURNING id, name, email, role
    `, [name, emailLower, hash, requested_role || 'STAFF', ph.rows[0].id, phone]);
    
    console.log(`\n✅ NEW STAFF REQUEST: ${name} (${email}) is waiting for approval.\n`);
    res.status(201).json({ ok: true, user: rows[0], message: 'Request sent. The owner must approve you.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/pending', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    console.log(`[Owner Fetching Pending] Pharmacy ID: ${pid}`);
    
    const { rows } = await pool.query(
      `SELECT id, name, email, role, phone FROM users WHERE pharmacy_id = $1 AND approval_status = 'PENDING' ORDER BY name`,
      [pid]
    );
    console.log(`[Pending Found] ${rows.length} staff member(s)`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users/:id/approve', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const id = Number(req.params.id);
    await pool.query("UPDATE users SET approval_status = 'APPROVED' WHERE id = $1 AND pharmacy_id = $2", [id, pid]);
    console.log(`[Approved] User ID ${id}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ================== SMS REMINDERS ==================
app.get('/api/reminders', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`
      SELECT r.*, p.full_name AS patient_name 
      FROM reminders r JOIN patients p ON p.id = r.patient_id 
      WHERE r.pharmacy_id = $1 ORDER BY r.id DESC`, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reminders', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { patient_id, prescription_id, medicine_name, dosage_instructions, phone, first_dose_at, interval_minutes, total_doses } = req.body;
    
    if (!patient_id || !phone || !first_dose_at) throw new Error('Missing required fields.');

    const { rows } = await pool.query(`
      INSERT INTO reminders (pharmacy_id, patient_id, prescription_id, medicine_name, dosage_instructions, phone, first_dose_at, interval_minutes, total_doses, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [pid, patient_id, prescription_id || null, medicine_name, dosage_instructions, phone, first_dose_at, interval_minutes, total_doses, req.session.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== DASHBOARD ==================
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const meds = (await pool.query(`SELECT m.*, COALESCE(SUM(b.quantity),0)::int AS stock FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id WHERE m.pharmacy_id = $1 GROUP BY m.id`, [pid])).rows;
    const salesToday = (await pool.query(`SELECT COALESCE(SUM(total),0)::float AS total, COUNT(*)::int AS count FROM sales WHERE pharmacy_id = $1 AND created_at::date = CURRENT_DATE`, [pid])).rows[0];
    
    const feedbackAlerts = (await pool.query(`
      SELECT p.full_name AS patient_name, pi.medicine_name, pi.patient_side_effects, pi.patient_feedback_at
      FROM prescription_items pi
      JOIN prescriptions pr ON pr.id = pi.prescription_id
      JOIN patients p ON p.id = pr.patient_id
      WHERE pr.pharmacy_id = $1 AND pi.patient_side_effects IS NOT NULL AND pi.patient_side_effects != ''
      ORDER BY pi.patient_feedback_at DESC LIMIT 10
    `, [pid])).rows;

    res.json({ 
      role: req.session.user.role, 
      metrics: { medicineCount: meds.length, salesToday: Number(salesToday.total), transactionsToday: Number(salesToday.count), lowStock: meds.filter(m=>m.stock<=m.reorder_level).length }, 
      lowStock: meds.filter(m=>m.stock<=m.reorder_level).slice(0,8), 
      feedbackAlerts,
      expiryBuckets: { within30:0, within60:0, within90:0 }, activity: [], recentSales: []
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ================== GLOBAL ALERTS ==================
app.get('/api/alerts', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`
      SELECT p.full_name AS patient_name, pi.medicine_name, pi.patient_side_effects, pi.patient_feedback_at
      FROM prescription_items pi
      JOIN prescriptions pr ON pr.id = pi.prescription_id
      JOIN patients p ON p.id = pr.patient_id
      WHERE pr.pharmacy_id = $1 AND pi.patient_side_effects IS NOT NULL AND pi.patient_side_effects != ''
      ORDER BY pi.patient_feedback_at DESC LIMIT 10
    `, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== MEDICINES ==================
app.get('/api/medicines', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`SELECT m.*, COALESCE(SUM(b.quantity),0)::int AS stock FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id WHERE m.pharmacy_id = $1 GROUP BY m.id ORDER BY m.name`, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/medicines', auth, async (req, res) => {
  try {
    if (req.session.user.role !== 'OWNER' && req.session.user.role !== 'PHARMACIST') return res.status(403).json({ error: 'Permission denied.' });
    const pid = await currentPharmacyId(req.session.user.id);
    const m = req.body;
    const { rows } = await pool.query(`INSERT INTO medicines (pharmacy_id, name, sku, category, unit, reorder_level) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [pid, m.name, m.sku, m.category, m.unit, m.reorder_level]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== INVENTORY ==================
app.get('/api/batches', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`SELECT b.*, m.name as medicine_name, m.sku FROM batches b JOIN medicines m ON m.id = b.medicine_id WHERE b.pharmacy_id = $1 ORDER BY b.expiry_date`, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/batches', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { medicine_id, batch_number, quantity, expiry_date, cost_price, selling_price } = req.body;
    if (!medicine_id) return res.status(422).json({ error: 'Select a medicine.' });
    const { rows } = await pool.query(`INSERT INTO batches (pharmacy_id, medicine_id, batch_number, quantity, expiry_date, cost_price, selling_price) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [pid, medicine_id, batch_number, quantity, expiry_date, cost_price, selling_price]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== SALES ==================
app.get('/api/sales', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`SELECT s.*, m.name as medicine_name, u.name as sold_by_name FROM sales s JOIN medicines m ON m.id = s.medicine_id LEFT JOIN users u ON u.id = s.sold_by WHERE s.pharmacy_id = $1 ORDER BY s.id DESC LIMIT 100`, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sales', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { batch_id, quantity, patient_id } = req.body;
    const qty = Number(quantity);
    if (!batch_id || qty <= 0) throw new Error("Invalid batch or quantity.");

    await client.query('BEGIN');
    const batchRes = await client.query('SELECT * FROM batches WHERE id = $1 AND pharmacy_id = $2 FOR UPDATE', [batch_id, pid]);
    const batch = batchRes.rows[0];
    if (!batch) throw new Error("Batch not found.");
    if (batch.quantity < qty) throw new Error(`Only ${batch.quantity} units left.`);

    await client.query('UPDATE batches SET quantity = quantity - $1 WHERE id = $2', [qty, batch.id]);
    const receipt = `MF-${Date.now()}`;
    const total = Number(batch.selling_price) * qty;

    const saleRes = await client.query(`INSERT INTO sales (pharmacy_id, receipt_number, medicine_id, batch_id, quantity, unit_price, total, sold_by, patient_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [pid, receipt, batch.medicine_id, batch.id, qty, batch.selling_price, total, req.session.user.id, patient_id || null]);
    await client.query('COMMIT');
    res.status(201).json(saleRes.rows[0]);
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); } finally { client.release(); }
});

// ================== PATIENTS ==================
app.get('/api/patients', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`SELECT * FROM patients WHERE pharmacy_id=$1 ORDER BY full_name`, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patients', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const p = req.body;
    const { rows } = await pool.query(`INSERT INTO patients (pharmacy_id, full_name, phone, email, gender, address, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [pid, p.full_name, p.phone, p.email, p.gender, p.address, req.session.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/patients/:id', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const id = Number(req.params.id);
    const p = await pool.query(`SELECT p.*, i.name AS insurance_name, ph.name AS pharmacy_name, ph.phone AS pharmacy_phone FROM patients p LEFT JOIN insurances i ON i.id = p.insurance_id LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id WHERE p.id = $1 AND p.pharmacy_id = $2`, [id, pid]);
    if (!p.rows[0]) return res.status(404).json({ error: 'Patient not found.' });
    const purchases = await pool.query(`SELECT s.*, m.name AS medicine_name FROM sales s JOIN medicines m ON m.id=s.medicine_id WHERE s.patient_id=$1 ORDER BY s.id DESC`, [id]);
    const prescriptions = await pool.query(`SELECT pr.*, (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id=pr.id) AS item_count FROM prescriptions pr WHERE pr.patient_id=$1 ORDER BY pr.id DESC`, [id]);
    res.json({ patient: p.rows[0], purchases: purchases.rows, prescriptions: prescriptions.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patients/:id/portal-link', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const id = Number(req.params.id);
    const token = crypto.randomBytes(36).toString('base64url');
    const { rows } = await pool.query(`UPDATE patients SET access_token = $1 WHERE id = $2 AND pharmacy_id = $3 RETURNING access_token`, [token, id, pid]);
    if (!rows[0]) return res.status(404).json({ error: 'Patient not found.' });
    res.json({ token: rows[0].access_token, url: '/patient/' + rows[0].access_token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== PATIENT PUBLIC PORTAL ==================
app.get('/api/patient-portal/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT p.*, ph.name AS pharmacy_name, ph.phone AS pharmacy_phone FROM patients p JOIN pharmacies ph ON ph.id = p.pharmacy_id WHERE p.access_token = $1`, [req.params.token]);
    if (!rows[0]) return res.status(404).json({ error: 'Link invalid.' });
    res.json({ patient: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/patient-portal/:token/prescriptions', async (req, res) => {
  try {
    const { rows: p } = await pool.query(`SELECT id FROM patients WHERE access_token = $1`, [req.params.token]);
    if (!p[0]) return res.status(404).json({ error: 'Invalid link.' });
    const { rows: prs } = await pool.query(`SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY id DESC`, [p[0].id]);
    const { rows: items } = await pool.query(`SELECT pi.*, m.name AS medicine_full_name FROM prescription_items pi LEFT JOIN medicines m ON m.id = pi.medicine_id WHERE pi.prescription_id = ANY($1::int[])`, [prs.map(pr=>pr.id)]);
    const grouped = {};
    for (const it of items) (grouped[it.prescription_id] ||= []).push(it);
    res.json({ prescriptions: prs.map(pr => ({ ...pr, items: grouped[pr.id] || [] })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patient-portal/:token/feedback', async (req, res) => {
  try {
    const { token } = req.params;
    const { item_id, is_taking, side_effects } = req.body;
    const { rows } = await pool.query(`SELECT pi.id FROM prescription_items pi JOIN prescriptions pr ON pr.id = pi.prescription_id JOIN patients p ON p.id = pr.patient_id WHERE p.access_token = $1 AND pi.id = $2`, [token, item_id]);
    if (!rows[0]) return res.status(403).json({ error: 'Unauthorized.' });
    await pool.query(`UPDATE prescription_items SET patient_is_taking = $1, patient_side_effects = $2, patient_feedback_at = now() WHERE id = $3`, [is_taking, side_effects, item_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== PRESCRIPTIONS ==================
app.get('/api/prescriptions', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`SELECT pr.*, p.full_name AS patient_name, (SELECT json_agg(pi) FROM prescription_items pi WHERE pi.prescription_id = pr.id) AS items FROM prescriptions pr JOIN patients p ON p.id = pr.patient_id WHERE pr.pharmacy_id = $1 ORDER BY pr.id DESC`, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/prescriptions', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const b = req.body;
    await client.query('BEGIN');
    const pr = await client.query(`INSERT INTO prescriptions (pharmacy_id, patient_id, prescriber_name, notes, issued_at, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [pid, b.patient_id, b.prescriber_name, b.notes, b.issued_at || new Date().toISOString().slice(0,10), req.session.user.id]);
    for (const item of b.items) {
      await client.query(`INSERT INTO prescription_items (prescription_id, medicine_id, medicine_name, dosage, quantity) VALUES ($1,$2,$3,$4,$5)`, [pr.rows[0].id, item.medicine_id, item.medicine_name, item.dosage, item.quantity]);
    }
    await client.query('COMMIT');
    res.status(201).json(pr.rows[0]);
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); } finally { client.release(); }
});

// ================== INSURANCES ==================
app.get('/api/insurances', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query('SELECT * FROM insurances WHERE pharmacy_id = $1 ORDER BY name', [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/insurances', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const b = req.body;
    const { rows } = await pool.query(`INSERT INTO insurances (pharmacy_id, code, name, contact_phone, contact_email, billing_model, coverage_percent, member_id_label) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [pid, b.code, b.name, b.contact_phone, b.contact_email, b.billing_model || 'SPLIT_AT_COUNTER', b.coverage_percent || 80, b.member_id_label || 'Member number']);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== STAFF ==================
app.get('/api/users', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query('SELECT id, name, email, role, status, approval_status FROM users WHERE pharmacy_id = $1 ORDER BY name', [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { name, email, password, role } = req.body;
    const hash = bcrypt.hashSync(password, 12);
    const { rows } = await pool.query(`INSERT INTO users (name, email, password_hash, role, status, must_change_password, pharmacy_id, approval_status) VALUES ($1,$2,$3,$4,'ACTIVE', true, $5, 'APPROVED') RETURNING id, name, email, role`, [name, email.toLowerCase(), hash, role, pid]);
    res.status(201).json({ user: rows[0], tempPassword: password });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== PHARMACY & REPORTS ==================
app.get('/api/pharmacy', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query('SELECT * FROM pharmacies WHERE id = $1', [pid]);
    res.json({ pharmacy: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports/stock', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(`SELECT m.id, m.name, m.sku, m.reorder_level, COALESCE(SUM(b.quantity), 0)::int AS stock, COALESCE(SUM(b.quantity * b.cost_price), 0)::float AS stock_value FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id WHERE m.pharmacy_id = $1 GROUP BY m.id ORDER BY m.name`, [pid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ================== PUBLIC PHARMACIES (FOR JOINING) ==================

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 8) return res.status(422).json({ error: 'Invalid phone number.' });
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await pool.query(`
      INSERT INTO otp_codes (phone, code, expires_at) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (phone) DO UPDATE SET code = $2, expires_at = $3
    `, [phone, code, expiresAt]);
    
    // Send via Africa's Talking (or console if no keys)
    console.log(`\n📱 [SMS OTP] To: ${phone} | Code: ${code}\n`);
    
    if (process.env.SMS_PROVIDER === 'africastalking' && process.env.AT_API_KEY) {
      const params = new URLSearchParams({ username: process.env.AT_USERNAME, to: phone, message: `Your MediFlow verification code is: ${code}` });
      await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: { 'apiKey': process.env.AT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }).catch(e => console.error('SMS Error:', e.message));
    }
    
    res.json({ ok: true, message: 'OTP sent successfully.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pharmacies/public', async (req, res) => {
  try {
    // Get all registered pharmacies that have a URL slug
    const { rows } = await pool.query('SELECT slug, name, city FROM pharmacies WHERE slug IS NOT NULL ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/request-join', async (req, res) => {
  try {
    const { name, email, password, phone, pharmacy_slug, requested_role, otp_code } = req.body;
    const emailLower = email.toLowerCase();
    
    // 1. Verify OTP
    const otpCheck = await pool.query('SELECT 1 FROM otp_codes WHERE phone = $1 AND code = $2 AND expires_at > now()', [phone, otp_code]);
    if (!otpCheck.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired phone verification code. Please try again.' });
    }
    await pool.query('DELETE FROM otp_codes WHERE phone = $1', [phone]);

    // 2. Check if email exists
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered.' });
    
    // Find the pharmacy
    const ph = await pool.query('SELECT id FROM pharmacies WHERE slug = $1', [pharmacy_slug]);
    if (!ph.rows[0]) return res.status(404).json({ error: 'Pharmacy not found.' });
    
    // Create user with PENDING status
    const hash = bcrypt.hashSync(password, 12);
    const { rows } = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, status, must_change_password, pharmacy_id, phone, approval_status)
      VALUES ($1, $2, $3, $4, 'ACTIVE', false, $5, $6, 'PENDING') RETURNING id, name, email, role
    `, [name, emailLower, hash, requested_role || 'STAFF', ph.rows[0].id, phone || null]);
    
    res.status(201).json({ ok: true, user: rows[0], message: 'Request sent. The owner must approve you.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== STAFF APPROVALS ==================
app.get('/api/users/pending', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const { rows } = await pool.query(
      "SELECT id, name, email, role, phone FROM users WHERE pharmacy_id = $1 AND approval_status = 'PENDING' ORDER BY name",
      [pid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users/:id/approve', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const id = Number(req.params.id);
    await pool.query("UPDATE users SET approval_status = 'APPROVED' WHERE id = $1 AND pharmacy_id = $2", [id, pid]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use((err, req, res, next) => { res.status(500).json({ error: err.message || 'Internal server error' }); });
import { startReminderScheduler } from './reminders.js';
startReminderScheduler();

app.listen(4000, () => console.log(`MediFlow API listening on port 4000`));
