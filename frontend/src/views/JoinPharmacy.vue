<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const pharmacies = ref([]);
const form = ref({
  name: '', email: '', password: '', confirm: '', phone: '',
  pharmacy_slug: '', requested_role: 'STAFF', otp_code: ''
});
const error = ref('');
const busy = ref(false);
const success = ref(false);
const otpSent = ref(false);
const otpBusy = ref(false);
const notice = ref('');

async function load() {
  try {
    const r = await api.get('/pharmacies/public');
    pharmacies.value = r.data;
  } catch {}
}

async function sendOtp() {
  error.value = '';
  notice.value = '';
  if (!form.value.phone || form.value.phone.length < 8) {
    error.value = 'Please enter a valid phone number first.';
    return;
  }
  otpBusy.value = true;
  try {
    await api.post('/auth/send-otp', { phone: form.value.phone });
    otpSent.value = true;
    notice.value = 'Verification code sent! Check your SMS.';
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not send SMS.';
  } finally { otpBusy.value = false; }
}

async function submit() {
  error.value = '';
  if (form.value.password.length < 10) { error.value = 'Password must be at least 10 characters.'; return; }
  if (form.value.password.toLowerCase() === form.value.email.toLowerCase()) { error.value = 'Password cannot be your email address.'; return; }
  if (form.value.password !== form.value.confirm) { error.value = 'Passwords do not match.'; return; }
  if (!otpSent.value || !form.value.otp_code) { error.value = 'Please verify your phone number first.'; return; }
  
  busy.value = true;
  try {
    await api.post('/auth/request-join', {
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      phone: form.value.phone,
      pharmacy_slug: form.value.pharmacy_slug,
      requested_role: form.value.requested_role,
      otp_code: form.value.otp_code
    });
    success.value = true;
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not send your request.';
  } finally { busy.value = false; }
}

onMounted(load);
</script>

<template>
  <section class="join-screen">
    <div class="join-card">
      <router-link to="/" class="brand-link"><span class="brand-mark small">✚</span><span class="brand-name">MediFlow</span></router-link>

      <div v-if="success" class="done">
        <div class="check">✓</div>
        <h1>Request sent</h1>
        <p>Your request has been sent to the pharmacy owner. They must approve you before you can sign in.</p>
        <router-link to="/login" class="primary">Go to sign in</router-link>
      </div>

      <template v-else>
        <h1>Join a pharmacy</h1>
        <p class="muted">Request an account at an existing pharmacy on MediFlow. The owner will approve you.</p>

        <form @submit.prevent="submit">
          <label>Full name *</label>
          <input v-model="form.name" required minlength="2">
          
          <label>Email *</label>
          <input v-model="form.email" type="email" required>
          
          <label>Phone number * (Requires verification)</label>
          <div style="display:flex; gap:10px;">
            <input v-model="form.phone" type="tel" required placeholder="+25078..." style="flex:1">
            <button type="button" class="secondary" @click="sendOtp" :disabled="otpBusy">
              {{ otpBusy ? 'Sending…' : (otpSent ? 'Resend Code' : 'Send Code') }}
            </button>
          </div>

          <div v-if="otpSent" style="margin-top:10px; background:#eafaf3; padding:12px; border-radius:8px; border:1px solid #cceee1;">
            <label style="color:#0a927b; margin-top:0;">Enter 6-digit SMS Code *</label>
            <input v-model="form.otp_code" required placeholder="123456" maxlength="6" style="border-color:#0a927b; font-weight:bold; letter-spacing:4px; font-size:16px;">
            <p class="muted" style="margin-top:4px; font-size:10px;">Please enter the code sent to your phone.</p>
          </div>

          <div class="two-col" style="margin-top:15px;">
            <div><label>Password * (min 10 chars)</label><input v-model="form.password" type="password" required minlength="10"></div>
            <div><label>Confirm Password *</label><input v-model="form.confirm" type="password" required minlength="10"></div>
          </div>

          <label>Which pharmacy? *</label>
          <select v-model="form.pharmacy_slug" required>
            <option value="" disabled>Select pharmacy</option>
            <option v-for="p in pharmacies" :key="p.slug" :value="p.slug">
              {{ p.name }}<template v-if="p.city"> · {{ p.city }}</template>
            </option>
          </select>

          <label>Requested role</label>
          <select v-model="form.requested_role">
            <option value="STAFF">Staff</option>
            <option value="PHARMACIST">Pharmacist</option>
          </select>

          <p v-if="error" class="error">{{ error }}</p>
          <p v-if="notice" class="ok-msg">{{ notice }}</p>

          <button class="primary full" :disabled="busy || !otpSent">{{ busy ? 'Sending…' : 'Send request' }}</button>
        </form>
      </template>
    </div>
  </section>
</template>

<style scoped>
.join-screen { min-height: 100vh; padding: 40px 20px; background: radial-gradient(circle at top right, #e0f7ef, transparent 38%), #f4f8fa; display: grid; place-items: start center; }
.join-card { width: min(100%, 560px); background: #fff; padding: 38px; border: 1px solid #e5edf0; border-radius: 22px; box-shadow: 0 20px 70px rgba(21, 63, 85, 0.06); }
.brand-link { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: #142f43; margin-bottom: 22px; }
.brand-name { font: 800 16px Manrope, sans-serif; letter-spacing: -0.4px; }
h1 { font: 800 26px Manrope, sans-serif; color: #142f43; margin: 0 0 8px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0 0 8px; }
form { margin-top: 20px; }
label { display: block; font-size: 12px; font-weight: 700; margin: 12px 0 6px; color: #354a58; }
input, select { width: 100%; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; background: #fff; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.full { width: 100%; margin-top: 14px; padding: 13px; }
.error { color: #c43c4c; font-size: 12px; margin: 10px 0 0; font-weight: bold; }
.ok-msg { color: #07836c; font-size: 12px; margin: 10px 0 0; font-weight: bold; }
.primary { background: #078c78; color: #fff; border: 0; border-radius: 10px; padding: 12px 20px; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; }
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.secondary { border: 1px solid #d3ebe4; background: #e9f5f2; color: #087b6b; border-radius: 9px; padding: 11px 16px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.done { text-align: center; padding: 20px 0; }
.check { width: 56px; height: 56px; border-radius: 50%; background: #e2f7ed; color: #0a927b; display: grid; place-items: center; font-size: 30px; font-weight: 800; margin: 0 auto 18px; }
@media (max-width: 520px) { .two-col { grid-template-columns: 1fr; } .join-card { padding: 26px; } }
</style>
