import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'node:crypto';
import { pool } from './db.js';
import { sendRealOtp } from './otp.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

// Allow cross-site cookies from Netlify
app.use(cors({ origin: true, credentials: true }));

const PgStore = connectPgSimple(session);
app.use(session({
  store: new PgStore({ pool, tableName: 'session', createTableIfMissing: true }),
  name: 'mediflow.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true, 
    sameSite: 'none', 
    secure: true, 
    maxAge: 8 * 60 * 60 * 1000 
  }
}));

const auth = (req, res, next) => req.session?.user ? next() : res.status(401).json({ error: 'Authentication required.' });
const currentPharmacyId = async (userId) => {
  const { rows } = await pool.query('SELECT pharmacy_id FROM users WHERE id = $1', [userId]);
  return rows[0]?.pharmacy_id;
};

// ================== AUTH & OTP ==================
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 8) return res.status(422).json({ error: 'Invalid phone number.' });
    await sendRealOtp(phone);
    res.json({ ok: true, message: 'Verification code sent to your phone.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const input = z.object({
      ownerName: z.string().min(2), email: z.string().email(), password: z.string().min(10),
      pharmacyName: z.string().min(2), phone: z.string(), otp_code: z.string(),
      pharmacyCity: z.string().optional().nullable(), pharmacyAddress: z.string().optional().nullable()
    }).parse(req.body);

    const email = input.email.toLowerCase();
    
    if (input.password.toLowerCase() === email) return res.status(422).json({ error: 'Password cannot be your email.' });
    
    const otpCheck = await pool.query('SELECT 1 FROM otp_codes WHERE phone = $1 AND code = $2 AND expires_at > now()', [input.phone, input.otp_code]);
    if (!otpCheck.rows[0]) return res.status(400).json({ error: 'Invalid or expired SMS code.' });
    await pool.query('DELETE FROM otp_codes WHERE phone = $1', [input.phone]);

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const slug = input.pharmacyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      const ph = await client.query(`INSERT INTO pharmacies (name, slug, patient_self_registration) VALUES ($1, $2, true) RETURNING id`, [input.pharmacyName, slug]);
      
      const hash = bcrypt.hashSync(input.password, 12);
      const u = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status, must_change_password, pharmacy_id, phone, approval_status) 
         VALUES ($1, $2, $3, 'OWNER', 'ACTIVE', false, $4, $5, 'APPROVED') RETURNING id, name, email, role`,
        [input.ownerName, email, hash, ph.rows[0].id, input.phone]
      );
      await client.query('COMMIT');

      req.session.user = { id: u.rows[0].id, name: u.rows[0].name, email: u.rows[0].email, role: u.rows[0].role };
      res.status(201).json({ user: req.session.user });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); } finally { client.release(); }
  } catch (err) { res.status(422).json({ error: 'Validation failed.' }); }
});

app.post('/api/auth/request-join', async (req, res) => {
  try {
    const { name, email, password, phone, pharmacy_slug, requested_role, otp_code } = req.body;
    const emailLower = email.toLowerCase();
    
    if (password.toLowerCase() === emailLower) return res.status(422).json({ error: 'Password cannot be your email.' });

    const otpCheck = await pool.query('SELECT 1 FROM otp_codes WHERE phone = $1 AND code = $2 AND expires_at > now()', [phone, otp_code]);
    if (!otpCheck.rows[0]) return res.status(400).json({ error: 'Invalid or expired SMS code.' });
    await pool.query('DELETE FROM otp_codes WHERE phone = $1', [phone]);

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered.' });
    
    const ph = await pool.query('SELECT id FROM pharmacies WHERE slug = $1', [pharmacy_slug]);
    if (!ph.rows[0]) return res.status(404).json({ error: 'Pharmacy not found.' });
    
    const hash = bcrypt.hashSync(password, 12);
    const { rows } = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, status, must_change_password, pharmacy_id, phone, approval_status)
      VALUES ($1, $2, $3, $4, 'ACTIVE', false, $5, $6, 'PENDING') RETURNING id, name, email, role
    `, [name, emailLower, hash, requested_role || 'STAFF', ph.rows[0].id, phone]);
    
    res.status(201).json({ ok: true, user: rows[0], message: 'Request sent. The owner must approve you.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Incorrect email or password.' });

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ user: req.session.user });
});

app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.clearCookie('mediflow.sid').json({ ok: true })));

// ================== DASHBOARD & ALERTS ==================
app.get('/api/profile', auth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { rows } = await pool.query(`SELECT u.id, u.name, u.email, u.role, u.phone, u.pharmacy_id, p.name as pharmacy_name FROM users u LEFT JOIN pharmacies p ON p.id = u.pharmacy_id WHERE u.id = $1`, [uid]);
    res.json({ user: rows[0], pharmacy: { name: rows[0].pharmacy_name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const pid = await currentPharmacyId(req.session.user.id);
    const meds = (await pool.query(`SELECT m.*, COALESCE(SUM(b.quantity),0)::int AS stock FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id WHERE m.pharmacy_id = $1 GROUP BY m.id`, [pid])).rows;
    const salesToday = (await pool.query(`SELECT COALESCE(SUM(total),0)::float AS total, COUNT(*)::int AS count FROM sales WHERE pharmacy_id = $1 AND created_at::date = CURRENT_DATE`, [pid])).rows[0];
    const feedbackAlerts = (await pool.query(`SELECT p.full_name AS patient_name, pi.medicine_name, pi.patient_side_effects, pi.patient_feedback_at FROM prescription_items pi JOIN prescriptions pr ON pr.id = pi.prescription_id JOIN patients p ON p.id = pr.patient_id WHERE pr.pharmacy_id = $1 AND pi.patient_side_effects IS NOT NULL AND pi.patient_side_effects != '' ORDER BY pi.patient_feedback_at DESC LIMIT 10`, [pid])).rows;
    res.json({ role: req.session.user.role, metrics: { medicineCount: meds.length, salesToday: Number(salesToday.total), transactionsToday: Number(salesToday.count), lowStock: meds.filter(m=>m.stock<=m.reorder_level).length }, lowStock: meds.filter(m=>m.stock<=m.reorder_level).slice(0,8), feedbackAlerts, expiryBuckets: { within30:0, within60:0, within90:0 }, activity: [], recentSales: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== CORE ROUTES ==================
app.get('/api/medicines', auth, async (req, res) => {
  const pid = await currentPharmacyId(req.session.user.id);
  const { rows } = await pool.query(`SELECT m.*, COALESCE(SUM(b.quantity),0)::int AS stock FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id WHERE m.pharmacy_id = $1 GROUP BY m.id ORDER BY m.name`, [pid]);
  res.json(rows);
});

app.get('/api/patients', auth, async (req, res) => {
  const pid = await currentPharmacyId(req.session.user.id);
  const { rows } = await pool.query(`SELECT * FROM patients WHERE pharmacy_id=$1 ORDER BY full_name`, [pid]);
  res.json(rows);
});

app.get('/api/prescriptions', auth, async (req, res) => {
  const pid = await currentPharmacyId(req.session.user.id);
  const { rows } = await pool.query(`SELECT pr.*, p.full_name AS patient_name, (SELECT json_agg(pi) FROM prescription_items pi WHERE pi.prescription_id = pr.id) AS items FROM prescriptions pr JOIN patients p ON p.id = pr.patient_id WHERE pr.pharmacy_id = $1 ORDER BY pr.id DESC`, [pid]);
  res.json(rows);
});

app.get('/api/pharmacies/public', async (req, res) => {
  const { rows } = await pool.query('SELECT slug, name, city FROM pharmacies WHERE slug IS NOT NULL ORDER BY name');
  res.json(rows);
});

app.listen(process.env.PORT || 4000, () => console.log(`MediFlow API listening`));
