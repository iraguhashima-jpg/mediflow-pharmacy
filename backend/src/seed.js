import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

async function seed() {
  const email = (process.env.INITIAL_OWNER_EMAIL || 'owner@mediflow.local').toLowerCase();
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  
  if (rows.length > 0) {
    console.log('[seed] Owner already exists.');
    return pool.end();
  }

  const hash = bcrypt.hashSync(process.env.INITIAL_OWNER_PASSWORD || 'ChangeMe123!', 12);
  await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)',
    [process.env.INITIAL_OWNER_NAME || 'Owner', email, hash, 'OWNER']
  );
  console.log(`[seed] Created OWNER: ${email}`);
  await pool.end();
}

seed().catch(async (err) => { console.error(err); await pool.end(); process.exit(1); });
