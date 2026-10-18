import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const here = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(here, '../logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const SMS_LOG = path.join(LOG_DIR, 'sms.log');

const PROVIDER = (process.env.SMS_PROVIDER || 'console').toLowerCase();

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('250')) return '+' + digits;
  if (digits.startsWith('0')) return '+250' + digits.slice(1);
  return '+' + digits;
}

async function sendViaConsole({ to, body }) {
  const line = `[${new Date().toISOString()}] TO=${to}\n${body}\n---\n`;
  fs.appendFileSync(SMS_LOG, line, 'utf8');
  console.log(`[sms:console] to=${to} body=${body.slice(0, 80)}`);
  return { ok: true, provider: 'console', providerMessageId: 'console-' + Date.now() };
}

async function sendViaAfricaTalking({ to, body }) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const sender = process.env.AT_SENDER_ID || undefined;

  if (!username || !apiKey) {
    return { ok: false, error: 'AT_USERNAME / AT_API_KEY not set in .env' };
  }

  const params = new URLSearchParams();
  params.append('username', username);
  params.append('to', to);
  params.append('message', body);
  if (sender) params.append('from', sender);

  let res, text;
  try {
    res = await fetch((process.env.AT_SANDBOX === 'true'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging'), {
      method: 'POST',
      headers: {
        apiKey: apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: params.toString()
    });
    text = await res.text();
  } catch (err) {
    return { ok: false, error: 'network: ' + (err.message || String(err)) };
  }

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
  }

  let json = null;
  try { json = JSON.parse(text); } catch { }

  const recipient = json?.SMSMessageData?.Recipients?.[0];
  if (!recipient || String(recipient.status).toLowerCase() !== 'success') {
    const msg = recipient
      ? `${recipient.status}: ${recipient.number || ''}`
      : text.slice(0, 300);
    return { ok: false, error: msg };
  }
  return { ok: true, provider: 'africastalking', providerMessageId: recipient.messageId || null };
}

export async function sendSms({ to, body }) {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: 'invalid phone number' };
  if (!body || !body.trim()) return { ok: false, error: 'empty body' };

  try {
    if (PROVIDER === 'africastalking') {
      return await sendViaAfricaTalking({ to: phone, body });
    }
    return await sendViaConsole({ to: phone, body });
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

export function renderTemplate(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString());
}

export const SMS_INFO = {
  provider: PROVIDER,
  consoleMode: PROVIDER === 'console',
  logPath: SMS_LOG
};
