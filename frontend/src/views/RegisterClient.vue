<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';

const route = useRoute();
const router = useRouter();
const slug = route.params.slug;

const pharmacy = ref(null);
const loading = ref(true);
const notFound = ref(false);
const success = ref(false);
const error = ref('');
const busy = ref(false);

const form = ref({
  full_name: '', phone: '', email: '', date_of_birth: '',
  gender: 'UNSPECIFIED', address: '', allergies: '',
  chronic_conditions: '', notes: ''
});

async function load() {
  try {
    const r = await api.get(`/pharmacy/public/${slug}`);
    pharmacy.value = r.data.pharmacy;
  } catch (e) {
    notFound.value = true;
    error.value = e.response?.data?.error || 'Pharmacy not found.';
  } finally {
    loading.value = false;
  }
}

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    await api.post(`/public/register-client/${slug}`, form.value);
    success.value = true;
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not register.';
  } finally { busy.value = false; }
}

onMounted(load);
</script>

<template>
  <div class="client-screen">
    <div class="client-card">
      <router-link to="/" class="brand-link">
        <span class="brand-mark small">✚</span>
        <span class="brand-name">MediFlow</span>
      </router-link>

      <div v-if="loading" class="muted">Loading…</div>

      <div v-else-if="notFound" class="muted-block">
        <h1>Registration not available</h1>
        <p>{{ error }}</p>
        <p class="muted">Ask your pharmacy for the correct link, or visit them in person.</p>
      </div>

      <div v-else-if="success" class="success-block">
        <div class="check">✓</div>
        <h1>You're registered</h1>
        <p>Thank you, <strong>{{ form.full_name }}</strong>. {{ pharmacy.name }} now has your details on file.</p>
        <p class="muted">Next time you visit, just give your name or phone number and they'll find your record.</p>
        <router-link to="/" class="primary">Back to home</router-link>
      </div>

      <template v-else>
        <h1>Register with {{ pharmacy.name }}</h1>
        <p class="muted">
          Add your details so {{ pharmacy.name }} can recognize you next visit and keep your
          purchase and prescription history in one place.
        </p>
        <p v-if="pharmacy.city" class="muted small">📍 {{ pharmacy.city }}<span v-if="pharmacy.address"> · {{ pharmacy.address }}</span></p>

        <form @submit.prevent="submit">
          <fieldset>
            <legend>Your details</legend>
            <label>Full name *</label>
            <input v-model="form.full_name" required minlength="2">
            <label>Phone *</label>
            <input v-model="form.phone" type="tel" required minlength="4">
            <label>Email (optional)</label>
            <input v-model="form.email" type="email">
            <div class="two-col">
              <div><label>Date of birth</label><input v-model="form.date_of_birth" type="date"></div>
              <div>
                <label>Gender</label>
                <select v-model="form.gender">
                  <option value="UNSPECIFIED">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <label>Address</label>
            <input v-model="form.address">
          </fieldset>

          <fieldset>
            <legend>Health information (optional)</legend>
            <label>Known allergies</label>
            <input v-model="form.allergies" placeholder="e.g. penicillin">
            <label>Chronic conditions</label>
            <input v-model="form.chronic_conditions" placeholder="e.g. hypertension">
            <label>Anything else the pharmacist should know</label>
            <textarea v-model="form.notes" rows="2"></textarea>
          </fieldset>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="primary full" :disabled="busy">
            {{ busy ? 'Registering…' : 'Register' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.client-screen {
  min-height: 100vh; padding: 40px 20px;
  background: radial-gradient(circle at top right, #e0f7ef, transparent 38%), #f4f8fa;
  display: grid; place-items: start center;
}
.client-card {
  width: min(100%, 620px); background: #fff; padding: 40px;
  border: 1px solid #e5edf0; border-radius: 22px;
  box-shadow: 0 20px 70px rgba(21, 63, 85, 0.06);
}
.brand-link { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: #142f43; margin-bottom: 22px; }
.brand-name { font: 800 16px Manrope, sans-serif; letter-spacing: -0.4px; }
h1 { font: 800 24px Manrope, sans-serif; color: #142f43; margin: 0 0 8px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0 0 8px; }
.muted.small { font-size: 12px; }
.muted-block, .success-block { text-align: center; padding: 20px 0; }
.check {
  width: 56px; height: 56px; border-radius: 50%; background: #e2f7ed; color: #0a927b;
  display: grid; place-items: center; font-size: 30px; font-weight: 800;
  margin: 0 auto 18px;
}
form { margin-top: 20px; }
fieldset { border: 1px solid #e5ecef; border-radius: 12px; padding: 18px 20px 22px; margin: 0 0 18px; }
legend { padding: 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #0a927b; font-weight: 800; }
label { display: block; font-size: 12px; font-weight: 700; margin: 10px 0 6px; color: #354a58; }
input, select, textarea { width: 100%; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.full { width: 100%; padding: 13px; margin-top: 8px; }
.primary { background: #078c78; color: #fff; border: 0; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; }
.error { color: #c43c4c; font-size: 12px; margin: 10px 0 0; }
@media (max-width: 520px) { .two-col { grid-template-columns: 1fr; } .client-card { padding: 26px; } }
</style>
