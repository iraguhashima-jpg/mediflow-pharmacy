import { pool } from './db.js';

export async function sendRealOtp(phone) {
  // 1. Format phone to +250
  let cleanPhone = String(phone).replace(/\s+/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '+250' + cleanPhone.slice(1);
  else if (cleanPhone.startsWith('7')) cleanPhone = '+250' + cleanPhone;
  else if (cleanPhone.startsWith('250')) cleanPhone = '+' + cleanPhone;

  // 2. Generate code & save
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    `INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3) 
     ON CONFLICT (phone) DO UPDATE SET code = $2, expires_at = $3`, 
    [cleanPhone, code, expiresAt]
  );

  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;

  if (!apiKey || !username) {
    console.error("Missing AT_API_KEY or AT_USERNAME");
    throw new Error('SMS provider not configured. Please contact support.');
  }

  // 3. Send via Africa's Talking
  const params = new URLSearchParams({ 
    username, 
    to: cleanPhone, 
    message: `Your MediFlow verification code is: ${code}` 
  });

  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: { 
      apiKey, 
      'Content-Type': 'application/x-www-form-urlencoded', 
      'Accept': 'application/json' 
    },
    body: params.toString()
  });

  const data = await res.json();
  const recipient = data?.SMSMessageData?.Recipients?.[0];

  if (!res.ok || (recipient && recipient.status.toLowerCase() !== 'success')) {
    const errorMsg = recipient?.status || 'Africa\'s Talking rejected the message.';
    console.error('SMS Failed:', errorMsg);
    throw new Error(errorMsg);
  }

  return true;
}
