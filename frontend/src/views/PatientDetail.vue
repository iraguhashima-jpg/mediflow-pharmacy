<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import QRCode from 'qrcode';
import AppLayout from '../components/AppLayout.vue';

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const data = ref(null);
const insurances = ref([]);
const portalToken = ref('');
const showSendSms = ref(false);
const smsBody = ref('');
const smsBusy = ref(false);
const smsNotice = ref('');
const smsError = ref('');
const messages = ref([]);
const qrDataUrl = ref('');
const showPatientCard = ref(false);
const portalBusy = ref(false);
const error = ref('');
const notice = ref('');
const editing = ref(false);
const form = ref({});

const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n || 0));

async function load() {
  try {
    const [r, ins] = await Promise.all([
      api.get(`/patients/${id}`),
      api.get('/insurances')
    ]);
    data.value = r.data;
    insurances.value = ins.data.filter(x => x.active);
    form.value = { ...r.data.patient };
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load patient.';
  }
}

async function save() {
  try {
    await api.patch(`/patients/${id}`, {
      full_name: form.value.full_name, phone: form.value.phone, email: form.value.email,
      national_id: form.value.national_id, date_of_birth: form.value.date_of_birth || null,
      gender: form.value.gender, address: form.value.address,
      allergies: form.value.allergies, chronic_conditions: form.value.chronic_conditions,
      notes: form.value.notes, status: form.value.status,
      insurance_id: form.value.insurance_id || null,
      insurance_member_number: form.value.insurance_member_number || null,
      insurance_expires_at: form.value.insurance_expires_at || null
    });
    notice.value = 'Patient updated.';
    editing.value = false;
    await load();
  } catch (e) {
    notice.value = e.response?.data?.error || 'Could not update.';
  }
}

async function archive() {
  if (!confirm('Archive this patient? They will no longer show in the active list.')) return;
  try {
    await api.patch(`/patients/${id}`, { status: 'ARCHIVED' });
    notice.value = 'Patient archived.';
    await load();
  } catch (e) { notice.value = e.response?.data?.error || 'Could not archive.'; }
}

async function generatePortalLink() {
  portalBusy.value = true;
  try {
    const r = await api.post(`/patients/${id}/portal-link`);
    portalToken.value = r.data.token;
    await buildQr();
    notice.value = 'Portal link generated. Print the card or send the link.';
  } catch (e) { notice.value = e.response?.data?.error || 'Could not generate link.'; }
  finally { portalBusy.value = false; }
}
async function revokePortalLink() {
  if (!confirm('Revoke the current link?')) return;
  portalBusy.value = true;
  try {
    await api.delete(`/patients/${id}/portal-link`);
    portalToken.value = '';
    notice.value = 'Portal link revoked.';
  } catch (e) { notice.value = e.response?.data?.error || 'Could not revoke.'; }
  finally { portalBusy.value = false; }
}
function portalUrl() { return window.location.origin + '/patient/' + portalToken.value; }
function copyPortalUrl() { navigator.clipboard.writeText(portalUrl()); notice.value = 'Copied.'; }


async function buildQr() {
  if (!portalToken.value) return;
  const url = portalUrl();
  qrDataUrl.value = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#102d40', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });
}

function openPatientCard() {
  if (!qrDataUrl.value) return;
  showPatientCard.value = true;
}

function closePatientCard() {
  showPatientCard.value = false;
}

function printPatientCard() {
  window.print();
}


function openSendSms() {
  smsNotice.value = '';
  smsError.value = '';
  const first = (data.value?.patient?.full_name || '').split(' ')[0] || 'there';
  smsBody.value =
    `Hello ${first}, this is ${data.value?.patient?.pharmacy_name || 'your pharmacy'}. ` +
    `Your prescription is ready. Please come to collect it. Reply or call if you need help.`;
  showSendSms.value = true;
}

async function sendSmsToPatient() {
  smsError.value = '';
  smsNotice.value = '';
  if (!smsBody.value.trim()) {
    smsError.value = 'Type a message first.';
    return;
  }
  smsBusy.value = true;
  try {
    const r = await api.post(`/patients/${id}/send-sms`, { message: smsBody.value.trim() });
    smsNotice.value = 'SMS sent. Provider ID: ' + (r.data.message_id || '—');
    await loadMessages();
    setTimeout(() => { showSendSms.value = false; smsNotice.value = ''; }, 2000);
  } catch (e) {
    smsError.value = e.response?.data?.error || 'Could not send.';
  } finally { smsBusy.value = false; }
}

async function loadMessages() {
  try {
    const r = await api.get(`/patients/${id}/messages`);
    messages.value = r.data;
  } catch { messages.value = []; }
}

onMounted(async () => { await load(); await loadMessages(); });
</script>

<template>
  <AppLayout>
    <template #title>Patient</template>

    <div v-if="error" class="notice error-notice">{{ error }}</div>
    <div v-if="notice" class="notice">{{ notice }}</div>
    <div v-if="!data" class="empty">Loading…</div>

    <template v-else>
      <div class="breadcrumb">
        <router-link :to="{ name: 'patients' }">← All patients</router-link>
      </div>

      <section class="panel header-panel">
        <div class="avatar">{{ data.patient.full_name.slice(0,1).toUpperCase() }}</div>
        <div class="head-info">
          <h3>{{ data.patient.full_name }}</h3>
          <div class="meta">
            <span v-if="data.patient.phone">📞 {{ data.patient.phone }}</span>
            <span v-if="data.patient.email">✉ {{ data.patient.email }}</span>
            <span v-if="data.patient.date_of_birth">🎂 {{ data.patient.date_of_birth }}</span>
            <span class="pill" :class="data.patient.status === 'ACTIVE' ? 'green' : 'gray'">{{ data.patient.status }}</span>
          </div>
          <div v-if="data.patient.allergies" class="alert-inline">
            <strong>Allergies:</strong> {{ data.patient.allergies }}
          </div>
          <div v-if="data.patient.chronic_conditions" class="alert-inline soft">
            <strong>Chronic:</strong> {{ data.patient.chronic_conditions }}
          </div>
          <div v-if="data.patient.insurance_code" class="insurance-line">
            <strong>Insurance:</strong> {{ data.patient.insurance_code }} · {{ data.patient.insurance_name }}
            <span v-if="data.patient.insurance_member_number"> · member {{ data.patient.insurance_member_number }}</span>
            <span v-if="data.patient.insurance_expires_at" class="exp"> · expires {{ data.patient.insurance_expires_at }}</span>
          </div>
        </div>
        <div class="head-actions">
          <button class="primary" @click="openSendSms" :disabled="!data.patient.phone">✉ Send SMS</button>
          <button class="secondary" @click="editing = !editing">{{ editing ? 'Cancel' : 'Edit' }}</button>
          <button v-if="data.patient.status === 'ACTIVE'" class="secondary danger" @click="archive">Archive</button>
        </div>
      </section>

      <!-- Patient portal -->
      <section class="panel portal-panel">
        <div class="panel-head">
          <h4>Patient portal link</h4>
          <p class="muted">Give this to the patient so they can see their medicines and instructions.</p>
        </div>
        <div class="portal-body">
          <div v-if="!portalToken" class="portal-empty">
            <p class="muted">No link yet. Generate one and send it by SMS or WhatsApp.</p>
            <button class="primary" :disabled="portalBusy" @click="generatePortalLink">
              {{ portalBusy ? 'Generating…' : '🔗 Generate portal link' }}
            </button>
          </div>
          <div v-else class="portal-ready">
            <div class="portal-qr-row">
              <div v-if="qrDataUrl" class="qr-preview">
                <img :src="qrDataUrl" alt="QR code for patient portal">
                <p class="qr-caption">Patient scans this QR code to open their page</p>
              </div>
              <div class="portal-actions-col">
                <div class="portal-url-row">
                  <input :value="portalUrl()" readonly @focus="$event.target.select()">
                  <button class="primary" @click="copyPortalUrl">Copy link</button>
                </div>
                <div class="portal-btn-row">
                  <a class="secondary" :href="portalUrl()" target="_blank" rel="noopener">Test the link</a>
                  <button class="primary" @click="openPatientCard">🖨 Print patient card</button>
                  <button class="secondary danger" :disabled="portalBusy" @click="revokePortalLink">Revoke</button>
                </div>
                <p class="hint">
                  Print the card and give it to the patient, or send the link by SMS or WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Edit form -->
      <section v-if="editing" class="panel">
        <div class="panel-head"><h4>Edit details</h4></div>
        <form @submit.prevent="save" class="form-body">
          <div class="form-grid">
            <div class="span-2"><label>Full name</label><input v-model="form.full_name" required></div>
            <div><label>Phone</label><input v-model="form.phone"></div>
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
            <div class="span-2"><label>Allergies</label><input v-model="form.allergies"></div>
            <div class="span-2"><label>Chronic conditions</label><input v-model="form.chronic_conditions" list="chronic-diseases" placeholder="Select or type"></div>
            <div><label>Insurance</label>
              <select v-model="form.insurance_id">
                <option :value="null">— None —</option>
                <option v-for="i in insurances" :key="i.id" :value="i.id">{{ i.code }} · {{ i.name }}</option>
              </select>
            </div>
            <div><label>Member / policy number</label>
              <input v-model="form.insurance_member_number">
            </div>
            <div class="span-2"><label>Insurance expires</label>
              <input v-model="form.insurance_expires_at" type="date">
            </div>
            <div class="span-2"><label>Notes</label><textarea v-model="form.notes" rows="2"></textarea></div>
          </div>
          <div class="form-actions"><button class="primary">Save</button></div>
        </form>
      </section>

      <!-- Prescriptions -->
      <section class="panel">
        <div class="panel-head">
          <h4>Prescriptions</h4>
          <router-link class="text-link" :to="{ name: 'prescriptions', query: { patient_id: id } }">Manage →</router-link>
        </div>
        <div v-if="data.prescriptions.length" class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Prescriber</th><th>Issued</th><th>Items</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="pr in data.prescriptions" :key="pr.id">
                <td class="mono">#{{ pr.id }}</td>
                <td>{{ pr.prescriber_name || '—' }}</td>
                <td>{{ pr.issued_at }}</td>
                <td>{{ pr.item_count }}</td>
                <td><span class="pill" :class="pr.status === 'DISPENSED' ? 'green' : pr.status === 'CANCELLED' ? 'gray' : 'amber'">{{ pr.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">No prescriptions on file.</div>
      </section>

      <!-- SMS history -->
      <section class="panel">
        <div class="panel-head">
          <h4>Messages sent</h4>
          <button class="secondary small" @click="openSendSms" :disabled="!data.patient.phone">✉ Send another</button>
        </div>
        <div v-if="messages.length" class="msg-list">
          <div v-for="m in messages" :key="m.id" class="msg-item">
            <div class="msg-head">
              <span class="pill" :class="m.status === 'SENT' ? 'green' : 'red'">{{ m.status }}</span>
              <span class="msg-meta">to {{ m.phone }} · {{ new Date(m.created_at).toLocaleString() }}</span>
              <span class="msg-meta">by {{ m.sent_by_name || '—' }}</span>
            </div>
            <div class="msg-body">{{ m.body }}</div>
            <div v-if="m.error" class="msg-error">Error: {{ m.error }}</div>
          </div>
        </div>
        <div v-else class="empty">No messages sent to this patient yet.</div>
      </section>

      <!-- Purchases -->
      <section class="panel">
        <div class="panel-head"><h4>Purchase history</h4></div>
        <div v-if="data.purchases.length" class="table-wrap">
          <table>
            <thead><tr><th>Receipt</th><th>Medicine</th><th>Qty</th><th>Total</th><th>Sold by</th><th>Date</th></tr></thead>
            <tbody>
              <tr v-for="s in data.purchases" :key="s.id">
                <td class="mono">{{ s.receipt_number }}</td>
                <td>{{ s.medicine_name }}</td>
                <td>{{ s.quantity }}</td>
                <td>{{ money(s.total) }}</td>
                <td>{{ s.sold_by_name || '—' }}</td>
                <td>{{ s.created_at }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">No purchases recorded yet.</div>
      </section>
    </template>
  
    <!-- Printable patient card -->
    <div v-if="showPatientCard" class="card-overlay">
      <div class="card-actions no-print">
        <button class="secondary" @click="closePatientCard">← Back</button>
        <button class="primary" @click="printPatientCard">🖨 Print this card</button>
      </div>
      <div class="patient-card">
        <div class="pc-header">
          <div class="pc-brand">✚ MediFlow</div>
          <div class="pc-title">Your medicines, on your phone</div>
        </div>

        <div class="pc-pharmacy">
          <strong>{{ data.patient.pharmacy_name || 'Your Pharmacy' }}</strong>
        </div>

        <div class="pc-body">
          <p class="pc-patient-name">{{ data.patient.full_name }}</p>
          <p class="pc-intro">Scan this code with your phone camera to see how to take your medicine.</p>

          <div class="pc-qr">
            <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code">
          </div>

          <p class="pc-link-label">Or open this address in your browser:</p>
          <p class="pc-link">{{ portalUrl() }}</p>
        </div>

        <div class="pc-instructions">
          <p class="pc-section-title">What you'll see:</p>
          <ul>
            <li>Each medicine you were given</li>
            <li>How much to take and how often</li>
            <li>How many days to take it</li>
            <li>Your allergies and health notes</li>
          </ul>
        </div>

        <div class="pc-help">
          <p class="pc-section-title">Questions? Call the pharmacy</p>
          <p class="pc-phone" v-if="data.patient.pharmacy_phone">📞 {{ data.patient.pharmacy_phone }}</p>
          <p class="pc-phone" v-else>Come back and ask us — we're happy to explain.</p>
        </div>

        <div class="pc-footer">
          <p>This card is personal to you. Keep it and use it any time.</p>
          <p>No app to install — no login needed.</p>
        </div>
      </div>
    </div>

    <!-- Send SMS modal -->
    <div v-if="showSendSms" class="modal-backdrop" @click.self="showSendSms = false">
      <form class="modal" @submit.prevent="sendSmsToPatient">
        <div class="modal-title">
          <h3>Send SMS to {{ data.patient.full_name }}</h3>
          <button type="button" @click="showSendSms = false">×</button>
        </div>
        <p class="modal-sub">
          Will be sent to <strong>{{ data.patient.phone || 'no phone on file' }}</strong>
        </p>

        <label>Message</label>
        <textarea v-model="smsBody" rows="5" maxlength="480" required placeholder="Type your message…"></textarea>
        <p class="char-count">{{ smsBody.length }} / 480</p>

        <p v-if="smsError" class="error-msg">{{ smsError }}</p>
        <p v-if="smsNotice" class="ok-msg">{{ smsNotice }}</p>

        <div class="modal-actions">
          <button type="button" class="secondary" @click="showSendSms = false">Cancel</button>
          <button class="primary" :disabled="smsBusy || !data.patient.phone">
            {{ smsBusy ? 'Sending…' : 'Send SMS' }}
          </button>
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
.breadcrumb { margin: 20px 0 12px; font-size: 12px; }
.breadcrumb a { color: #078c78; text-decoration: none; font-weight: 600; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
.header-panel { display: grid; grid-template-columns: 72px 1fr auto; gap: 20px; padding: 22px; align-items: center; }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: #e2f7ed; color: #078c78; display: grid; place-items: center; font: 800 28px Manrope, sans-serif; }
.head-info h3 { font: 800 20px Manrope, sans-serif; color: #17384b; margin: 0 0 6px; }
.meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: #6c8290; align-items: center; margin-bottom: 6px; }
.alert-inline { font-size: 12px; color: #b8404b; margin-top: 4px; }
.alert-inline.soft { color: #bd8219; }
.head-actions { display: flex; gap: 8px; flex-direction: column; align-items: flex-end; }
.panel-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px 12px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0; }
.text-link { color: #078c78; font-size: 11px; font-weight: 700; text-decoration: none; }
.form-body { padding: 16px 20px 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #354a58; }
input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; }
.form-actions { margin-top: 14px; display: flex; justify-content: flex-end; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 12px 17px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #edf1f3; }
td { padding: 13px 17px; font-size: 12px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #6c8290; }
.pill { display: inline-block; padding: 4px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.gray { background: #eef4f6; color: #6c8290; }
.pill.amber { background: #fff4db; color: #a9791b; }
.danger { color: #b8404b; border-color: #f5c6cb; background: #ffebed; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 12px; }
.notice { margin-bottom: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.error-notice { background: #ffebed; color: #b8404b; border-color: #f5c6cb; }
@media (max-width: 720px) {
  .header-panel { grid-template-columns: 1fr; }
  .head-actions { flex-direction: row; }
}
.insurance-line { font-size: 12px; color: #1864ab; margin-top: 6px; }
.insurance-line .exp { color: #94a1a8; }
.portal-panel { margin-bottom: 16px; }
.portal-body { padding: 16px 20px 20px; }
.portal-empty { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.portal-ready { display: flex; flex-direction: column; gap: 10px; }
.portal-url-row { display: flex; gap: 8px; }
.portal-url-row input { flex: 1; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 12px; font-family: ui-monospace, Menlo, monospace; background: #fff; }
.portal-url-row a { text-decoration: none; display: inline-flex; align-items: center; }
.small { font-size: 11px; padding: 7px 12px; align-self: flex-start; }
/* QR preview + printable card */
.portal-qr-row { display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: start; }
@media (max-width: 640px) { .portal-qr-row { grid-template-columns: 1fr; } }
.qr-preview { text-align: center; }
.qr-preview img { width: 100%; max-width: 200px; border: 1px solid #e5ecef; border-radius: 10px; padding: 8px; background: #fff; }
.qr-caption { font-size: 11px; color: #7d8e99; margin: 8px 0 0; }
.portal-actions-col { display: flex; flex-direction: column; gap: 10px; }
.portal-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
.portal-btn-row a, .portal-btn-row button { text-decoration: none; }

.card-overlay {
  position: fixed; inset: 0; z-index: 20;
  background: #eef4f6;
  padding: 24px;
  overflow: auto;
  display: flex; flex-direction: column; align-items: center; gap: 18px;
}
.card-actions { display: flex; gap: 10px; }

.patient-card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: 0 20px 60px rgba(15, 47, 67, 0.12);
  border: 1px solid #e5ecef;
  color: #1c3a4c;
}
.pc-header { text-align: center; padding-bottom: 16px; border-bottom: 2px dashed #e5ecef; margin-bottom: 16px; }
.pc-brand { font: 800 18px Manrope, sans-serif; color: #078c78; letter-spacing: -0.3px; margin-bottom: 6px; }
.pc-title { font: 700 14px Manrope, sans-serif; color: #17384b; }
.pc-pharmacy { text-align: center; margin-bottom: 20px; }
.pc-pharmacy strong { font: 800 16px Manrope, sans-serif; color: #142f43; }

.pc-body { text-align: center; margin-bottom: 20px; }
.pc-patient-name { font: 800 22px Manrope, sans-serif; color: #17384b; margin: 0 0 6px; }
.pc-intro { font-size: 13px; color: #5a6c78; margin: 0 0 18px; line-height: 1.5; }
.pc-qr {
  display: inline-block;
  padding: 14px;
  background: #fff;
  border: 2px solid #102d40;
  border-radius: 14px;
  margin-bottom: 16px;
}
.pc-qr img { display: block; width: 220px; height: 220px; }
.pc-link-label { font-size: 11px; color: #94a1a8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; }
.pc-link { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #244a5c; word-break: break-all; margin: 0; }

.pc-instructions { background: #f8fafb; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; }
.pc-section-title { font: 800 11px Manrope, sans-serif; color: #0a927b; text-transform: uppercase; letter-spacing: 1.2px; margin: 0 0 10px; }
.pc-instructions ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.pc-instructions li { font-size: 13px; color: #334d5a; padding-left: 22px; position: relative; line-height: 1.45; }
.pc-instructions li::before { content: '✓'; position: absolute; left: 0; color: #078c78; font-weight: 700; }

.pc-help { background: #eafaf3; border: 1px solid #cceee1; border-radius: 12px; padding: 14px 20px; margin-bottom: 16px; text-align: center; }
.pc-help .pc-section-title { color: #0a7a63; }
.pc-phone { font: 800 18px Manrope, sans-serif; color: #078c78; margin: 0; }

.pc-footer { text-align: center; padding-top: 14px; border-top: 2px dashed #e5ecef; }
.pc-footer p { font-size: 11px; color: #94a1a8; margin: 3px 0; }

@media print {
  .no-print { display: none !important; }
  .card-overlay { position: static; padding: 0; background: #fff; }
  .patient-card { box-shadow: none; border: 1px solid #ccc; max-width: 100%; page-break-inside: avoid; }
  body * { visibility: hidden; }
  .patient-card, .patient-card * { visibility: visible; }
  .patient-card { position: absolute; left: 0; top: 0; width: 100%; }
}
/* Send SMS */
.modal-sub { font-size: 12px; color: #7d8e99; margin: 0 0 12px; }
.char-count { font-size: 11px; color: #94a1a8; margin-top: 4px; text-align: right; }
.error-msg { color: #c43c4c; font-size: 12px; margin-top: 8px; }
.ok-msg { color: #07836c; font-size: 12px; margin-top: 8px; }
.msg-list { padding: 10px 18px 16px; }
.msg-item { padding: 12px 0; border-top: 1px solid #f0f3f4; }
.msg-item:first-child { border-top: 0; }
.msg-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.msg-meta { font-size: 11px; color: #94a1a8; }
.msg-body { font-size: 13px; color: #244a5c; background: #f8fafb; padding: 10px 12px; border-radius: 8px; line-height: 1.55; }
.msg-error { font-size: 11px; color: #b8404b; margin-top: 6px; }
.pill { display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.red { background: #ffebed; color: #c14956; }
.small { font-size: 11px; padding: 7px 12px; }
.primary { border: 0; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; background: #078c78; color: #fff; cursor: pointer; font-family: inherit; }
.primary:hover { background: #067563; }
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.secondary { border: 1px solid #d3ebe4; background: #e9f5f2; color: #087b6b; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.modal-backdrop { position: fixed; inset: 0; z-index: 10; background: rgba(16,45,64,0.6); display: grid; place-items: center; padding: 20px; }
.modal { width: min(100%, 520px); background: #fff; border-radius: 16px; padding: 24px; }
.modal-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.modal-title h3 { font: 800 18px Manrope, sans-serif; color: #18384a; margin: 0; }
.modal-title button { border: 0; background: transparent; font-size: 24px; color: #7c8f99; cursor: pointer; }
label { display: block; font-size: 12px; font-weight: 700; margin: 10px 0 6px; color: #354a58; }
textarea { width: 100%; padding: 12px 14px; border: 1px solid #dce5e9; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
</style>
