import 'dotenv/config';
import { pool } from './db.js';

// Helper to send SMS via Africa's Talking
async function sendSms(to, body) {
  if (process.env.SMS_PROVIDER !== 'africastalking' || !process.env.AT_API_KEY) {
    console.log(`\n📱 [SMS TEST MODE] To: ${to}\nMessage: ${body}\n`);
    return { ok: true, providerMessageId: 'test-mode' };
  }
  try {
    const params = new URLSearchParams({ username: process.env.AT_USERNAME, to, message: body });
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { 'apiKey': process.env.AT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: params.toString()
    });
    const data = await res.json();
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (!res.ok || (recipient && recipient.status.toLowerCase() !== 'success')) {
      throw new Error(recipient?.status || 'AT API Error');
    }
    return { ok: true, providerMessageId: recipient?.messageId };
  } catch (err) {
    console.error('SMS Error:', err.message);
    return { ok: false, error: err.message };
  }
}

// The main scheduler loop
export function startReminderScheduler() {
  console.log('[Reminders] Scheduler started. Checking every 60 seconds...');
  
  setInterval(async () => {
    try {
      // Find reminders that are ACTIVE and due
      const { rows: reminders } = await pool.query(`
        SELECT r.*, p.full_name AS patient_name, ph.name AS pharmacy_name
        FROM reminders r
        JOIN patients p ON p.id = r.patient_id
        JOIN pharmacies ph ON ph.id = r.pharmacy_id
        WHERE r.status = 'ACTIVE'
      `);

      const now = new Date();

      for (const r of reminders) {
        // Calculate when the next dose is due
        const nextDoseTime = new Date(new Date(r.first_dose_at).getTime() + (r.doses_sent * r.interval_minutes * 60000));
        
        if (now >= nextDoseTime) {
          if (r.doses_sent >= r.total_doses) {
            // Mark completed
            await pool.query(`UPDATE reminders SET status = 'COMPLETED' WHERE id = $1`, [r.id]);
            continue;
          }

          // Send the SMS
          const message = `Hello ${r.patient_name}, this is a reminder from ${r.pharmacy_name} to take your medicine: ${r.medicine_name}. Instructions: ${r.dosage_instructions}. (Dose ${r.doses_sent + 1} of ${r.total_doses})`;
          
          const result = await sendSms(r.phone, message);

          // Log the send
          await pool.query(`
            INSERT INTO reminder_sends (reminder_id, dose_number, phone, body, provider, provider_message_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [r.id, r.doses_sent + 1, r.phone, message, process.env.SMS_PROVIDER || 'console', result.providerMessageId || null, result.ok ? 'SENT' : 'FAILED']);

          // Update the reminder count
          const newCount = r.doses_sent + 1;
          const newStatus = newCount >= r.total_doses ? 'COMPLETED' : 'ACTIVE';
          await pool.query(`UPDATE reminders SET doses_sent = $1, status = $2 WHERE id = $3`, [newCount, newStatus, r.id]);
          
          console.log(`[Reminders] Sent dose ${newCount}/${r.total_doses} to ${r.patient_name}`);
        }
      }
    } catch (err) {
      console.error('[Reminders] Error:', err.message);
    }
  }, 60000); // Run every minute
}
