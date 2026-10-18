<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const router = useRouter();
const auth = useAuthStore();

const ownerName = ref('');
const email = ref('');
const password = ref('');
const confirm = ref('');
const phone = ref('');
const otpCode = ref('');
const pharmacyName = ref('');
const pharmacyAddress = ref('');
const pharmacyCity = ref('');
const pharmacyLicense = ref('');
const pharmacyPhone = ref('');
const error = ref('');
const notice = ref('');
const busy = ref(false);
const otpBusy = ref(false);
const otpSent = ref(false);

async function sendOtp() {
  error.value = '';
  notice.value = '';
  if (!phone.value || phone.value.length < 8) {
    error.value = 'Enter a valid phone number first (e.g. +25078...).'; return;
  }
  otpBusy.value = true;
  try {
    await api.post('/auth/send-otp', { phone: phone.value });
    otpSent.value = true;
    notice.value = 'Verification code sent! Check your SMS (or the backend terminal).';
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not send SMS.';
  } finally { otpBusy.value = false; }
}

async function submit() {
  error.value = '';
  notice.value = '';
  
  if (password.value.length < 10) { error.value = 'Password must be at least 10 characters.'; return; }
  if (password.value.toLowerCase() === email.value.toLowerCase()) { error.value = 'Password cannot be your email address.'; return; }
  if (password.value !== confirm.value) { error.value = 'Passwords do not match.'; return; }
  if (!otpSent.value || !otpCode.value) { error.value = 'Please verify your phone number first.'; return; }
  
  busy.value = true;
  try {
    const r = await api.post('/auth/register', {
      ownerName: ownerName.value.trim(),
      email: email.value.trim(),
      password: password.value,
      phone: phone.value.trim(),
      otp_code: otpCode.value.trim(),
      pharmacyName: pharmacyName.value.trim(),
      pharmacyAddress: pharmacyAddress.value.trim() || null,
      pharmacyCity: pharmacyCity.value.trim() || null,
      pharmacyLicense: pharmacyLicense.value.trim() || null,
      pharmacyPhone: pharmacyPhone.value.trim() || null
    });
    auth.user = r.data.user;
    router.push({ name: 'dashboard' });
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not create your pharmacy.';
  } finally { busy.value = false; }
}
</script>

<template>
  <section class="register-screen">
    <div class="register-card">
      <router-link to="/" class="brand-link"><span class="brand-mark small">✚</span><span class="brand-name">MediFlow</span></router-link>
      <h1>Register a new pharmacy</h1>
      <p class="muted">Create your isolated workspace on MediFlow.</p>

      <form @submit.prevent="submit">
        <fieldset>
          <legend>Your account</legend>
          <label>Full name *</label><input v-model="ownerName" required minlength="2">
          <label>Email *</label><input v-model="email" type="email" required>
          
          <label>Phone number * (Requires verification)</label>
          <div style="display:flex; gap:10px;">
            <input v-model="phone" type="tel" required placeholder="+25078..." style="flex:1">
            <button type="button" class="secondary" @click="sendOtp" :disabled="otpBusy">
              {{ otpBusy ? 'Sending…' : (otpSent ? 'Resend Code' : 'Send Code') }}
            </button>
          </div>

          <div v-if="otpSent" style="margin-top:10px; background:#eafaf3; padding:12px; border-radius:8px; border:1px solid #cceee1;">
            <label style="color:#0a927b; margin-top:0;">Enter 6-digit SMS Code *</label>
            <input v-model="otpCode" required placeholder="123456" maxlength="6" style="border-color:#0a927b; font-weight:bold; letter-spacing:4px; font-size:16px;">
            <p class="muted" style="margin-top:4px; font-size:10px;">Check the terminal running the backend to see the code.</p>
          </div>

          <div class="two-col" style="margin-top:15px;">
            <div><label>Password * (min 10 chars)</label><input v-model="password" type="password" required minlength="10"></div>
            <div><label>Confirm password *</label><input v-model="confirm" type="password" required minlength="10"></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Your pharmacy</legend>
          <label>Pharmacy name *</label><input v-model="pharmacyName" required minlength="2">
          <div class="two-col">
            <div><label>City</label><input v-model="pharmacyCity"></div>
            <div><label>Pharmacy phone</label><input v-model="pharmacyPhone"></div>
          </div>
          <label>Address (optional)</label><input v-model="pharmacyAddress">
          <label>License number (optional)</label><input v-model="pharmacyLicense">
        </fieldset>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="notice" class="ok-msg">{{ notice }}</p>

        <button class="primary full" :disabled="busy || !otpSent">{{ busy ? 'Creating…' : 'Create pharmacy' }}</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.register-screen { min-height: 100vh; padding: 40px 20px; background: #f4f8fa; display: grid; place-items: center; }
.register-card { width: min(100%, 620px); background: #fff; padding: 40px; border-radius: 22px; border: 1px solid #e5edf0; }
.brand-link { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: #142f43; margin-bottom: 22px; }
.brand-name { font: 800 16px Manrope, sans-serif; letter-spacing: -0.4px; }
h1 { font: 800 26px Manrope, sans-serif; color: #142f43; margin: 0 0 8px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0 0 8px; }
form { margin-top: 24px; }
fieldset { border: 1px solid #e5ecef; border-radius: 12px; padding: 18px 20px 22px; margin: 0 0 18px; }
legend { padding: 0 8px; font-size: 11px; text-transform: uppercase; color: #0a927b; font-weight: 800; }
label { display: block; font-size: 12px; font-weight: 700; margin: 10px 0 6px; color: #354a58; }
input { width: 100%; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.full { width: 100%; padding: 13px; }
.error { color: #c43c4c; font-size: 12px; font-weight: bold; background: #ffebed; padding: 10px; border-radius: 8px; margin-top: 10px; }
.ok-msg { color: #07836c; font-size: 12px; font-weight: bold; margin-top: 10px; }
.primary { border: 0; border-radius: 10px; padding: 13px; font-size: 13px; font-weight: 700; background: #078c78; color: #fff; cursor: pointer; }
.secondary { border: 1px solid #d3ebe4; background: #e9f5f2; color: #087b6b; border-radius: 9px; padding: 11px 16px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
</style>
