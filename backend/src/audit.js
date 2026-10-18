import { pool } from './db.js';

export const audit = {
  async run(userId, action, entity, entityId, metadata = null) {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [userId ?? null, action, entity, entityId ?? null]
    );
    if (metadata && process.env.NODE_ENV !== 'production') {
      // Dev-only trailing log for observability.
      console.log(`[audit] ${action} ${entity}#${entityId} by user ${userId}`);
    }
  }
};
