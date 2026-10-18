// Authentication primitives: password policy, bcrypt wrapper, login rate limit.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 10;
const LOGIN_WINDOW_MIN = 15;
const LOGIN_MAX_FAILURES = 5;

export const PASSWORD_POLICY = {
  minLength: MIN_PASSWORD_LENGTH,
  description:
    `At least ${MIN_PASSWORD_LENGTH} characters, must not equal the email, ` +
    `must contain a letter and a digit.`
};

export function validatePassword(password, email) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain a digit.';
  if (email && password.toLowerCase() === email.toLowerCase()) {
    return 'Password must not equal the email address.';
  }
  return null;
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function generateTempPassword() {
  // 16 chars, cryptographically random, guaranteed to satisfy policy.
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const { randomBytes } = crypto;
  const pick = (set, n) =>
    Array.from(randomBytes(n)).map((b) => set[b % set.length]).join('');
  return pick(letters, 10) + pick(digits, 3) + pick(symbols, 1) + pick(letters, 2);
}

// ---- Login rate limiting ----
export async function recordLoginAttempt(email, ip, success) {
  await pool.query(
    'INSERT INTO login_attempts (email, ip, success) VALUES ($1,$2,$3)',
    [email.toLowerCase(), ip || 'unknown', success]
  );
}

export async function isLoginRateLimited(email, ip) {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MIN * 60_000);
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS failures
       FROM login_attempts
      WHERE success = false
        AND created_at > $1
        AND (email = $2 OR ip = $3)`,
    [windowStart, email.toLowerCase(), ip || 'unknown']
  );
  return rows[0].failures >= LOGIN_MAX_FAILURES;
}

// ---- Session helpers ----
export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowed.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    next();
  };
}

export function requirePasswordChanged(req, res, next) {
  // Reject any non-auth route while the user still has must_change_password.
  if (req.session?.user?.mustChangePassword) {
    return res.status(428).json({
      error: 'Password change required before continuing.',
      code: 'PASSWORD_CHANGE_REQUIRED'
    });
  }
  next();
}

export const ROLES = ['OWNER', 'PHARMACIST', 'STAFF'];
