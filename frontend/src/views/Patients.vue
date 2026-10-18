<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();
const router = useRouter();

const patients = ref([]);
const insurances = ref([]);
const pharmacySlug = ref('');
const shareUrl = ref('');
const search = ref('');
const statusFilter = ref('ACTIVE');
const notice = ref('');
const busy = ref(false);
const showNew = ref(false);
const form = ref({
  full_name: '', phone: '', email: '', national_id: '',
  date_of_birth: '', gender: 'UNSPECIFIED', address: '',
  allergies: '', chronic_conditions: '', notes: '',
  insurance_id: '', insurance_member_number: '', insurance_expires_at: ''
});

async function load() {
  try {
    const [r, i] = await Promise.all([
      api.get('/patients', { params: { q: search.value, status: statusFilter.value } }),
      api.get('/insurances')
    ]);
    patients.value = r.data;
    insurances.value = i.data.filter(x => x.active);
    try {
      const ph = await api.get('/pharmacy');
      if (ph.data?.pharmacy?.slug) {
        pharmacySlug.value = ph.data.pharmacy.slug;
        shareUrl.value = window.location.origin + '/register-client/' + ph.data.pharmacy.slug;
      }
    } catch {}
  } catch (e) {
    notice.value = e.response?.data?.error || 'Could not load patients.';
  }
}

async function create() {
  busy.value = true;
  try {
    const r = await api.post('/patients', form.value);
    showNew.value = false;
    form.value = { full_name: '', phone: '', email: '', national_id: '',
      date_of_birth: '', gender: 'UNSPECIFIED', address: '',
      allergies: '', chronic_conditions: '', notes: '',
      insurance_id: '', insurance_member_number: '', insurance_expires_at: '' };
    notice.value = 'Patient registered.';
    router.push({ name: 'patient', params: { id: r.data.id } });
  } catch (e) {
    notice.value = e.response?.data?.error || 'Could not create patient.';
  } finally { busy.value = false; }
}

function open(id) { router.push({ name: 'patient', params: { id } }); }

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Patients</template>

    <div v-if="notice" class="notice">{{ notice }}</div>

    <section v-if="shareUrl" class="share-banner">
      <div class="share-text">
        <strong>Share this link with patients</strong>
        <p>Send it by WhatsApp, SMS, or print it as a QR code. Patients fill in their details once and appear in your list.</p>
      </div>
      <div class="share-url">
        <input :value="shareUrl" readonly @focus="$event.target.select()">
        <button class="primary" @click="navigator.clipboard.writeText(shareUrl)">Copy</button>
      </div>
    </section>
    <section v-else class="share-banner empty-share">
      <div class="share-text">
        <strong>Enable patient self-registration</strong>
        <p>Go to <router-link to="/pharmacy">Pharmacy</router-link>, set a slug, and turn on "Allow clients to self-register online". You'll get a link here to share.</p>
      </div>
    </section>

    <div class="toolbar">
      <div>
        <h3>Patients &amp; clients</h3>
        <p class="muted">Records for people who buy from your pharmacy.</p>
      </div>
      <button class="primary" @click="showNew = true">＋ New patient</button>
    </div>

    <div class="search-row">
      <input v-model="search" placeholder="Search by name, phone, email, national ID…" @input="load">
      <select v-model="statusFilter" @change="load" class="status-select">
        <option value="ACTIVE">Active</option>
        <option value="ARCHIVED">Archived</option>
        <option value="">All</option>
      </select>
      <span>{{ patients.length }} results</span>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>DOB</th><th>Gender</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="p in patients" :key="p.id" class="row" @click="open(p.id)">
              <td><strong>{{ p.full_name }}</strong></td>
              <td>{{ p.phone || '—' }}</td>
              <td class="mono">{{ p.email || '—' }}</td>
              <td>{{ p.date_of_birth || '—' }}</td>
              <td>{{ p.gender || '—' }}</td>
              <td><span class="pill" :class="p.status === 'ACTIVE' ? 'green' : 'gray'">{{ p.status }}</span></td>
              <td class="right"><button class="secondary" @click.stop="open(p.id)">Open →</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!patients.length" class="empty">No patients yet. Create one with the button above.</div>
    </section>

    <div v-if="showNew" class="modal-backdrop" @click.self="showNew = false">
      <form class="modal" @submit.prevent="create">
        <div class="modal-title">
          <h3>Register a patient</h3>
          <button type="button" @click="showNew = false">×</button>
        </div>
        <div class="form-grid">
          <div class="span-2">
            <label>Full name *</label>
            <input v-model="form.full_name" required minlength="2">
          </div>
          <div><label>Phone</label><input v-model="form.phone" type="tel"></div>
          <div><label>Email</label><input v-model="form.email" type="email"></div>
          <div><label>National ID</label><input v-model="form.national_id"></div>
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
          <div class="span-2"><label>Address</label><input v-model="form.address"></div>
          <div class="span-2"><label>Known allergies</label><input v-model="form.allergies" placeholder="e.g. penicillin, sulfa"></div>
          <div class="span-2"><label>Chronic conditions</label><input v-model="form.chronic_conditions" list="chronic-diseases" placeholder="Select or type (e.g., Hypertension)"></div>
          <div><label>Insurance</label>
            <select v-model="form.insurance_id">
              <option value="">— None / cash patient —</option>
              <option v-for="i in insurances" :key="i.id" :value="i.id">{{ i.code }} · {{ i.name }}</option>
            </select>
          </div>
          <div><label>Member / policy number</label>
            <input v-model="form.insurance_member_number" placeholder="Number on the card">
          </div>
          <div><label>Insurance expires</label>
            <input v-model="form.insurance_expires_at" type="date">
          </div>
          <div class="span-2"><label>Notes</label><textarea v-model="form.notes" rows="2"></textarea></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="showNew = false">Cancel</button>
          <button class="primary" :disabled="busy">Register patient</button>
        </div>
      </form>
    </div>
  
  <!-- Chronic Diseases Datalist -->
  <datalist id="chronic-diseases">
    <option value="Hypertension"></option>
    <option value="Coronary artery disease"></option>
    <option value="Heart failure"></option>
    <option value="Type 2 diabetes"></option>
    <option value="Hypothyroidism"></option>
    <option value="Chronic kidney disease"></option>
    <option value="Asthma"></option>
    <option value="Chronic obstructive pulmonary disease (COPD)"></option>
    <option value="Alzheimer's disease"></option>
    <option value="Parkinson's disease"></option>
    <option value="Major depressive disorder"></option>
    <option value="Osteoarthritis"></option>
    <option value="Rheumatoid arthritis"></option>
    <option value="Multiple sclerosis"></option>
    <option value="Crohn's disease"></option>
    <option value="Lupus"></option>
    <option value="Fibromyalgia"></option>
    <option value="Epilepsy"></option>
    <option value="Chronic fatigue syndrome"></option>
    <option value="Osteoporosis"></option>
  </datalist>

</AppLayout>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 14px; gap: 16px; }
.toolbar h3 { font: 700 17px Manrope, sans-serif; color: #18384a; margin: 0 0 5px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.search-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.search-row input { flex: 1; max-width: 420px; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 12px; }
.status-select { padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 12px; background: #fff; }
.search-row span { font-size: 10px; color: #8c9ba3; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 12px 17px; border-bottom: 1px solid #edf1f3; text-transform: uppercase; letter-spacing: .5px; }
td { padding: 13px 17px; font-size: 12px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.row { cursor: pointer; }
.row:hover { background: #f8fbfb; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #6c8290; }
.right { text-align: right; }
.pill { display: inline-block; padding: 5px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.gray { background: #eef4f6; color: #6c8290; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 12px; }
.notice { margin-bottom: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.modal-backdrop { position: fixed; inset: 0; z-index: 5; background: rgba(16,45,64,0.6); display: grid; place-items: center; padding: 20px; overflow: auto; }
.modal { width: min(100%, 720px); background: #fff; border-radius: 16px; padding: 24px; max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-title h3 { font: 800 18px Manrope, sans-serif; color: #18384a; margin: 0; }
.modal-title button { border: 0; background: transparent; font-size: 24px; color: #7c8f99; cursor: pointer; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #354a58; }
input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .form-grid .span-2 { grid-column: auto; } }
.share-banner {
  background: linear-gradient(135deg, #eafaf3, #f5fbf8);
  border: 1px solid #cceee1;
  border-radius: 14px;
  padding: 20px 22px;
  margin-bottom: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: center;
}
.share-banner.empty-share { background: #fff8e6; border-color: #f0dfa8; }
.share-text strong { display: block; font: 800 15px Manrope, sans-serif; color: #0a7a63; margin-bottom: 6px; }
.share-banner.empty-share .share-text strong { color: #8a5a00; }
.share-text p { font-size: 12px; color: #4f8b7b; margin: 0; line-height: 1.55; }
.share-banner.empty-share .share-text p { color: #7a6a3a; }
.share-text a { color: #078c78; font-weight: 700; }
.share-url { display: flex; gap: 8px; }
.share-url input { flex: 1; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 12px; font-family: ui-monospace, Menlo, monospace; background: #fff; }
@media (max-width: 800px) { .share-banner { grid-template-columns: 1fr; } }
</style>
