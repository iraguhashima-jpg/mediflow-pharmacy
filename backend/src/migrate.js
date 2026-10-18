import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { pool } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../migrations');

async function run() {
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now());`);
  const { rows } = await pool.query('SELECT name FROM _migrations');
  const applied = new Set(rows.map(r => r.name));

  const files = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
  
  for (const file of files) {
    if (applied.has(file)) continue;
    console.log('[migrate] applying', file);
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    await pool.query('COMMIT');
  }
  await pool.end();
  console.log('[migrate] done');
}

run().catch(async (err) => { console.error(err); await pool.end(); process.exit(1); });
