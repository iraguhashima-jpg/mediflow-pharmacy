import { pool } from './db.js';

export async function getPharmacyForUser(userId) {
  const { rows } = await pool.query(
    `SELECT p.* FROM pharmacies p
       JOIN users u ON u.pharmacy_id = p.id
      WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

export async function upsertPharmacyForUser(userId, patch) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: u } = await client.query(
      'SELECT pharmacy_id FROM users WHERE id = $1',
      [userId]
    );
    let pharmacyId = u[0]?.pharmacy_id;
    if (!pharmacyId) {
      const { rows } = await client.query(
        `INSERT INTO pharmacies (name, created_by)
         VALUES ($1, $2) RETURNING id`,
        [patch.name || 'My Pharmacy', userId]
      );
      pharmacyId = rows[0].id;
      await client.query('UPDATE users SET pharmacy_id = $1 WHERE id = $2', [pharmacyId, userId]);
    }
    const fields = [];
    const values = [];
    let i = 1;
    for (const k of ['name','legal_name','address','city','country','phone','email','license_number','tax_id','slug','patient_self_registration']) {
      if (patch[k] !== undefined) { fields.push(`${k} = $${i++}`); values.push(patch[k]); }
    }
    if (fields.length) {
      fields.push(`updated_at = now()`);
      values.push(pharmacyId);
      await client.query(
        `UPDATE pharmacies SET ${fields.join(', ')} WHERE id = $${i}`,
        values
      );
    }
    await client.query('COMMIT');
    const { rows: final } = await pool.query('SELECT * FROM pharmacies WHERE id = $1', [pharmacyId]);
    return final[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
