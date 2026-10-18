<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const list = ref([]);
const patients = ref([]);
const medicines = ref([]);
const statusFilter = ref('');
const notice = ref('');
const error = ref('');
const busy = ref(false);
const showNew = ref(false);
const showDetail = ref(false);
const detail = ref(null);

const form = ref({
  patient_id: '', prescriber_name: '', prescriber_license: '', notes: '', issued_at: '',
  items: [ { medicine_id: '', medicine_name: '', dosage: '', quantity: 1, notes: '' } ]
});

const schedForm = ref({ phone: '', start_at: '', interval_hours: 8, total_doses: 21 });
const schedNotice = ref('');

const canWrite = computed(() => auth.user?.role === 'OWNER' || auth.user?.role === 'PHARMACIST');

async function load() {
  try {
    const r = await api.get('/prescriptions', { params: { status: statusFilter.value } });
    list.value = r.data;
  } catch (e) { error.value = e.response?.data?.error || 'Could not load prescriptions.'; }
}

async function loadRefs() {
  try {
    const [p, m] = await Promise.all([api.get('/patients'), api.get('/medicines')]);
    patients.value = p.data;
    medicines.value = m.data;
  } catch {}
}

function addItem() {
  form.value.items.push({ medicine_id: '', medicine_name: '', dosage: '', quantity: 1, notes: '' });
}
function removeItem(i) {
  form.value.items.splice(i, 1);
  if (form.value.items.length === 0) addItem();
}
function pickMedicine(item) {
  const m = medicines.value.find(x => String(x.id) === String(item.medicine_id));
  if (m) item.medicine_name = m.name;
}

async function create() {
  busy.value = true;
  try {
    const payload = {
      patient_id: form.value.patient_id,
      prescriber_name: form.value.prescriber_name || null,
      prescriber_license: form.value.prescriber_license || null,
      notes: form.value.notes || null,
      issued_at: form.value.issued_at || undefined,
      items: form.value.items.map(i => ({
        medicine_id: i.medicine_id || null,
        medicine_name: i.medicine_name,
        dosage: i.dosage || null,
        quantity: i.quantity,
        notes: i.notes || null
      }))
    };
    await api.post('/prescriptions', payload);
    showNew.value = false;
    form.value = { patient_id: '', prescriber_name: '', prescriber_license: '', notes: '', issued_at: '',
      items: [{ medicine_id: '', medicine_name: '', dosage: '', quantity: 1, notes: '' }] };
    notice.value = 'Prescription created.';
    await load();
  } catch (e) { error.value = e.response?.data?.error || 'Could not create prescription.'; }
  finally { busy.value = false; }
}

async function open(pr) {
  try {
    const r = await api.get(`/prescriptions/${pr.id}`);
    detail.value = r.data;
    showDetail.value = true;
    schedNotice.value = '';
    schedForm.value = { phone: '', start_at: '', interval_hours: 8, total_doses: 21 };
  } catch (e) { error.value = e.response?.data?.error || 'Could not load prescription.'; }
}

async function setStatus(pr, status) {
  try {
    await api.patch(`/prescriptions/${pr.id}`, { status });
    notice.value = `Prescription marked ${status.toLowerCase()}.`;
    if (showDetail.value) await open({ id: pr.id });
    await load();
  } catch (e) { error.value = e.response?.data?.error || 'Could not update.'; }
}

async function scheduleSms() {
  schedNotice.value = '';
  if (!schedForm.value.phone || !schedForm.value.start_at) {
    alert('Please fill in phone and start time.'); return;
  }
  try {
    await api.post('/reminders', {
      patient_id: detail.value.prescription.patient_id,
      prescription_id: detail.value.prescription.id,
      medicine_name: detail.value.items[0]?.medicine_name || 'Medicine',
      dosage_instructions: detail.value.items[0]?.dosage || 'As directed',
      phone: schedForm.value.phone,
      first_dose_at: new Date(schedForm.value.start_at).toISOString(),
      interval_minutes: schedForm.value.interval_hours * 60,
      total_doses: schedForm.value.total_doses
    });
    schedNotice.value = '✓ Reminders scheduled successfully!';
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to schedule');
  }
}

onMounted(async () => {
  await loadRefs();
  await load();
  if (route.query.patient_id) {
    form.value.patient_id = String(route.query.patient_id);
    showNew.value = true;
  }
});
</script>

<template>
  <AppLayout>
    <template #title>Prescriptions</template>

    <div v-if="notice" class="notice">{{ notice }}</div>
    <div v-if="error" class="notice error-notice">{{ error }}</div>

    <div class="toolbar">
      <div><h3>Prescriptions</h3><p class="muted">Track prescriber orders and dispense status.</p></div>
      <button v-if="canWrite" class="primary" @click="showNew = true">＋ New prescription</button>
    </div>

    <div class="filter-row">
      <select v-model="statusFilter" @change="load">
        <option value="">All statuses</option>
        <option value="OPEN">Open</option>
        <option value="DISPENSED">Dispensed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <span>{{ list.length }} results</span>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Patient</th><th>Prescriber</th><th>Issued</th><th>Status</th><th>Created by</th><th></th></tr></thead>
          <tbody>
            <tr v-for="pr in list" :key="pr.id" class="row" @click="open(pr)">
              <td class="mono">#{{ pr.id }}</td>
              <td><strong>{{ pr.patient_name }}</strong></td>
              <td>{{ pr.prescriber_name || '—' }}</td>
              <td>{{ pr.issued_at }}</td>
              <td>
                <span class="pill" :class="pr.status === 'DISPENSED' ? 'green' : pr.status === 'CANCELLED' ? 'gray' : 'amber'">{{ pr.status }}</span>
              </td>
              <td>{{ pr.created_by_name || '—' }}</td>
              <td class="right">
                <button v-if="canWrite && pr.status === 'OPEN'" class="secondary small" @click.stop="setStatus(pr, 'DISPENSED')">Mark dispensed</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!list.length" class="empty">No prescriptions recorded.</div>
    </section>

    <!-- New prescription -->
    <div v-if="showNew" class="modal-backdrop" @click.self="showNew = false">
      <form class="modal" @submit.prevent="create">
        <div class="modal-title">
          <h3>New prescription</h3>
          <button type="button" @click="showNew = false">×</button>
        </div>
        <div class="form-grid">
          <div class="span-2">
            <label>Patient *</label>
            <select v-model="form.patient_id" required>
              <option value="" disabled>Select patient</option>
              <option v-for="p in patients" :key="p.id" :value="p.id">{{ p.full_name }} · {{ p.phone || 'no phone' }}</option>
            </select>
          </div>
          <div><label>Prescriber name</label><input v-model="form.prescriber_name"></div>
          <div><label>Prescriber license</label><input v-model="form.prescriber_license"></div>
          <div><label>Issued date</label><input v-model="form.issued_at" type="date"></div>
          <div class="span-2"><label>Notes</label><textarea v-model="form.notes" rows="2"></textarea></div>
        </div>

        <div class="items-head">
          <strong>Medicines</strong>
          <button type="button" class="secondary small" @click="addItem">+ Add line</button>
        </div>
        <div class="items-list">
          <div v-for="(it, i) in form.items" :key="i" class="item-row">
            <select v-model="it.medicine_id" @change="pickMedicine(it)">
              <option value="">— (free text)</option>
              <option v-for="m in medicines" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <input v-model="it.medicine_name" placeholder="Medicine name" required>
            <input v-model="it.dosage" placeholder="Dosage (e.g. 500mg 3x/day)">
            <input v-model.number="it.quantity" type="number" min="1" placeholder="Qty" required>
            <button type="button" class="icon-btn" @click="removeItem(i)" title="Remove">×</button>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary" @click="showNew = false">Cancel</button>
          <button class="primary" :disabled="busy">Create</button>
        </div>
      </form>
    </div>

    <!-- Detail -->
    <div v-if="showDetail && detail" class="modal-backdrop" @click.self="showDetail = false">
      <div class="modal">
        <div class="modal-title">
          <h3>Prescription #{{ detail.prescription.id }}</h3>
          <button type="button" @click="showDetail = false">×</button>
        </div>
        <div class="detail-grid">
          <div><span class="k">Patient</span><span>{{ detail.prescription.patient_name }}</span></div>
          <div><span class="k">Prescriber</span><span>{{ detail.prescription.prescriber_name || '—' }}</span></div>
          <div><span class="k">Issued</span><span>{{ detail.prescription.issued_at }}</span></div>
          <div><span class="k">Status</span>
            <span class="pill" :class="detail.prescription.status === 'DISPENSED' ? 'green' : detail.prescription.status === 'CANCELLED' ? 'gray' : 'amber'">{{ detail.prescription.status }}</span>
          </div>
          <div class="span-2" v-if="detail.prescription.notes"><span class="k">Notes</span><span>{{ detail.prescription.notes }}</span></div>
        </div>

        <h4 class="subhead">Items</h4>
        <table class="items-table">
          <thead><tr><th>Medicine</th><th>Dosage</th><th>Qty</th></tr></thead>
          <tbody>
            <tr v-for="i in detail.items" :key="i.id">
              <td>
                {{ i.medicine_name }} <small v-if="i.medicine_sku" class="mono">{{ i.medicine_sku }}</small>
                <div v-if="i.patient_side_effects" class="fb-alert">⚠️ Patient reported: {{ i.patient_side_effects }}</div>
                <div v-if="i.patient_is_taking === false" class="fb-alert">🚫 Patient reported they are NOT taking this.</div>
                <div v-if="i.patient_is_taking === true" class="fb-ok">✓ Patient confirmed they are taking this.</div>
              </td>
              <td>{{ i.dosage || '—' }}</td>
              <td>{{ i.quantity }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="canWrite" class="sched-box">
          <h4>📱 Schedule SMS Reminders</h4>
          <p class="muted">Send automatic SMS messages to the patient's phone.</p>
          <div class="sched-grid">
            <div><label>Phone Number</label><input v-model="schedForm.phone" placeholder="+25078..."></div>
            <div><label>Start Time</label><input type="datetime-local" v-model="schedForm.start_at"></div>
            <div><label>Every (Hours)</label><input type="number" v-model.number="schedForm.interval_hours" min="1"></div>
            <div><label>Total Doses</label><input type="number" v-model.number="schedForm.total_doses" min="1"></div>
          </div>
          <button class="primary" style="margin-top:10px" @click="scheduleSms">Schedule Reminders</button>
          <p v-if="schedNotice" class="ok-msg">{{ schedNotice }}</p>
        </div>

        <div class="modal-actions" v-if="canWrite && detail.prescription.status === 'OPEN'">
          <button class="secondary" @click="setStatus(detail.prescription, 'CANCELLED'); showDetail = false">Cancel prescription</button>
          <button class="primary" @click="setStatus(detail.prescription, 'DISPENSED'); showDetail = false">Mark dispensed</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin: 27px 0 19px; gap: 16px; }
.toolbar h3 { font: 700 17px Manrope, sans-serif; color: #18384a; margin: 0 0 5px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.filter-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 12px; }
.filter-row select { padding: 9px 12px; border: 1px solid #dce5e9; border-radius: 9px; background: #fff; font-size: 12px; }
.filter-row span { color: #8c9ba3; font-size: 11px; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 12px 17px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #edf1f3; }
td { padding: 13px 17px; font-size: 12px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.row { cursor: pointer; }
.row:hover { background: #f8fbfb; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #6c8290; }
.right { text-align: right; }
.pill { display: inline-block; padding: 4px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.gray { background: #eef4f6; color: #6c8290; }
.pill.amber { background: #fff4db; color: #a9791b; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 12px; }
.notice { margin-bottom: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.error-notice { background: #ffebed; color: #b8404b; border-color: #f5c6cb; }

.modal-backdrop { position: fixed; inset: 0; z-index: 5; background: rgba(16,45,64,0.6); display: grid; place-items: center; padding: 20px; overflow: auto; }
.modal { width: min(100%, 760px); background: #fff; border-radius: 16px; padding: 24px; max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-title h3 { font: 800 18px Manrope, sans-serif; color: #18384a; margin: 0; }
.modal-title button { border: 0; background: transparent; font-size: 24px; color: #7c8f99; cursor: pointer; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #354a58; }
input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; }

.items-head { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; font-size: 13px; color: #1c3a4c; }
.items-list { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.item-row { display: grid; grid-template-columns: 1.2fr 1.4fr 1.4fr 80px 32px; gap: 8px; align-items: center; }
.icon-btn { border: 0; background: #ffebed; color: #b8404b; border-radius: 8px; font-size: 16px; cursor: pointer; height: 36px; }
.small { font-size: 11px; padding: 6px 10px; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 16px; }
.detail-grid .span-2 { grid-column: span 2; }
.k { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a1a8; margin-bottom: 2px; }
.subhead { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 12px 0 8px; }
.items-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.items-table th { text-align: left; background: #f8fafb; color: #8999a2; padding: 8px 12px; font-size: 10px; text-transform: uppercase; }
.items-table td { padding: 10px 12px; border-bottom: 1px solid #f0f3f4; }

.fb-alert { margin-top: 6px; font-size: 11px; background: #ffebed; color: #b8404b; padding: 4px 8px; border-radius: 4px; font-weight: 600; }
.fb-ok { margin-top: 6px; font-size: 11px; background: #e2f7ed; color: #07836c; padding: 4px 8px; border-radius: 4px; font-weight: 600; }

.sched-box { background: #eafaf3; border: 1px solid #cceee1; border-radius: 12px; padding: 16px; margin-top: 20px; }
.sched-box h4 { color: #0a7a63; margin: 0 0 4px; font-size: 14px; }
.sched-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.sched-grid label { font-size: 11px; font-weight: 700; color: #354a58; display: block; margin-bottom: 4px; }
.sched-grid input { width: 100%; padding: 8px 10px; border: 1px solid #dce5e9; border-radius: 8px; font-size: 12px; }
.ok-msg { color: #07836c; font-weight: bold; font-size: 12px; margin-top: 10px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.primary { border: 0; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 700; background: #078c78; color: #fff; cursor: pointer; font-family: inherit; }
.secondary { border: 1px solid #d3ebe4; background: #e9f5f2; color: #087b6b; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-grid .span-2 { grid-column: auto; }
  .item-row { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .detail-grid .span-2 { grid-column: auto; }
  .sched-grid { grid-template-columns: 1fr; }
}
</style>
