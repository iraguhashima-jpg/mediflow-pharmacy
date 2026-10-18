<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import AppLayout from '../components/AppLayout.vue';

const list = ref([]);
const insurances = ref([]);
const notice = ref('');
const error = ref('');
const busy = ref(false);
const showNew = ref(false);
const showDetail = ref(false);
const detail = ref(null);
const preview = ref(null);

const money = (n) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 })
    .format(Number(n || 0));

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const form = ref({
  insurance_id: '',
  period_start: firstOfMonth(),
  period_end: todayISO(),
  reference_number: '',
  notes: ''
});

const activeInsurances = computed(() => insurances.value.filter((i) => i.active));

async function load() {
  try {
    const [c, i] = await Promise.all([
      api.get('/insurance-claims'),
      api.get('/insurances')
    ]);
    list.value = c.data;
    insurances.value = i.data;
  } catch (e) { error.value = e.response?.data?.error || 'Could not load claims.'; }
}

async function runPreview() {
  preview.value = null;
  error.value = '';
  if (!form.value.insurance_id || !form.value.period_start || !form.value.period_end) return;
  busy.value = true;
  try {
    const r = await api.get('/insurance-claims/preview', {
      params: {
        insurance_id: form.value.insurance_id,
        period_start: form.value.period_start,
        period_end: form.value.period_end
      }
    });
    preview.value = r.data;
  } catch (e) { error.value = e.response?.data?.error || 'Could not preview.'; }
  finally { busy.value = false; }
}

async function createClaim() {
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const r = await api.post('/insurance-claims', {
      insurance_id: form.value.insurance_id,
      period_start: form.value.period_start,
      period_end: form.value.period_end,
      reference_number: form.value.reference_number || null,
      notes: form.value.notes || null
    });
    notice.value = `Claim created: ${r.data.line_count} line(s), ${money(r.data.total_claimed)}.`;
    showNew.value = false;
    preview.value = null;
    await load();
    await openDetail({ id: r.data.claim.id });
  } catch (e) { error.value = e.response?.data?.error || 'Could not create claim.'; }
  finally { busy.value = false; }
}

async function openDetail(c) {
  try {
    const r = await api.get(`/insurance-claims/${c.id}`);
    detail.value = r.data;
    showDetail.value = true;
  } catch (e) { error.value = e.response?.data?.error || 'Could not load claim.'; }
}

async function setStatus(claim, status, extra = {}) {
  try {
    await api.patch(`/insurance-claims/${claim.id}`, { status, ...extra });
    notice.value = `Claim marked ${status.toLowerCase()}.`;
    await load();
    if (showDetail.value && detail.value?.claim?.id === claim.id) {
      await openDetail(claim);
    }
  } catch (e) { error.value = e.response?.data?.error || 'Could not update claim.'; }
}

async function markPaid(claim) {
  const amount = Number(claim.claimed_amount);
  if (!confirm(`Mark claim as PAID in full (${money(amount)})?`)) return;
  await setStatus(claim, 'PAID', { paid_amount: amount });
}

async function markPartial(claim) {
  const input = prompt(`How much did the insurer pay? (claimed: ${money(claim.claimed_amount)})`);
  if (!input) return;
  const v = Number(input);
  if (isNaN(v) || v <= 0) { error.value = 'Invalid amount.'; return; }
  await setStatus(claim, 'PARTIALLY_PAID', { paid_amount: v });
}

async function markRejected(claim) {
  const reason = prompt('Reason for rejection (optional)');
  if (reason === null) return;
  await setStatus(claim, 'REJECTED', { rejection_reason: reason || null });
}

async function deleteClaim(claim) {
  if (!confirm('Delete this draft claim? Lines will be released back to PENDING.')) return;
  try {
    await api.delete(`/insurance-claims/${claim.id}`);
    notice.value = 'Claim deleted.';
    await load();
    if (showDetail.value) showDetail.value = false;
  } catch (e) { error.value = e.response?.data?.error || 'Could not delete.'; }
}

function printClaim() {
  window.print();
}

function statusClass(s) {
  return s === 'PAID' ? 'green'
    : s === 'PARTIALLY_PAID' ? 'amber'
    : s === 'REJECTED' ? 'red'
    : s === 'SUBMITTED' ? 'blue'
    : 'gray';
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Insurance claims</template>

    <div v-if="notice" class="notice">{{ notice }}</div>
    <div v-if="error" class="notice error-notice">{{ error }}</div>

    <div class="toolbar">
      <div>
        <h3>Insurance claims</h3>
        <p class="muted">Group PENDING insurance sales into a claim, submit it, and track payment.</p>
      </div>
      <button class="primary" @click="showNew = true">＋ New claim</button>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Insurer</th><th>Period</th><th>Lines</th>
              <th>Claimed</th><th>Paid</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in list" :key="c.id" class="row" @click="openDetail(c)">
              <td class="mono">#{{ c.id }}</td>
              <td><strong>{{ c.insurance_code }}</strong><small class="cell-sub">{{ c.insurance_name }}</small></td>
              <td>{{ c.period_start }} → {{ c.period_end }}</td>
              <td>{{ c.line_count }}</td>
              <td>{{ money(c.claimed_amount) }}</td>
              <td>{{ money(c.paid_amount) }}</td>
              <td><span class="pill" :class="statusClass(c.status)">{{ c.status }}</span></td>
              <td class="right"><button class="secondary small" @click.stop="openDetail(c)">Open</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!list.length" class="empty">
        No claims yet. Create one to bundle PENDING insurance sales for a period.
      </div>
    </section>

    <!-- New claim modal -->
    <div v-if="showNew" class="modal-backdrop" @click.self="showNew = false">
      <form class="modal" @submit.prevent="createClaim">
        <div class="modal-title">
          <h3>New claim</h3>
          <button type="button" @click="showNew = false">×</button>
        </div>
        <div class="form-grid">
          <div class="span-2">
            <label>Insurer *</label>
            <select v-model="form.insurance_id" @change="runPreview" required>
              <option value="" disabled>Select insurance</option>
              <option v-for="i in activeInsurances" :key="i.id" :value="i.id">{{ i.code }} · {{ i.name }}</option>
            </select>
          </div>
          <div>
            <label>Period start *</label>
            <input v-model="form.period_start" type="date" @change="runPreview" required>
          </div>
          <div>
            <label>Period end *</label>
            <input v-model="form.period_end" type="date" @change="runPreview" required>
          </div>
          <div class="span-2">
            <label>Reference number (optional)</label>
            <input v-model="form.reference_number" placeholder="Your internal ref or the insurer's">
          </div>
          <div class="span-2">
            <label>Notes</label>
            <textarea v-model="form.notes" rows="2"></textarea>
          </div>
        </div>

        <div v-if="preview" class="preview-box">
          <div class="preview-line">
            <span>{{ preview.line_count }} pending sale(s)</span>
            <strong>{{ money(preview.total_claimed) }}</strong>
          </div>
          <div v-if="preview.line_count === 0" class="preview-empty">
            No pending sales found for this period. Adjust the dates or sell with this insurer first.
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary" @click="showNew = false">Cancel</button>
          <button class="primary" :disabled="busy || !preview || preview.line_count === 0">
            {{ busy ? 'Creating…' : 'Create claim' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Detail modal (printable) -->
    <div v-if="showDetail && detail" class="modal-backdrop" @click.self="showDetail = false">
      <div class="modal wide">
        <div class="modal-title">
          <h3>Claim #{{ detail.claim.id }} — {{ detail.claim.insurance_code }}</h3>
          <button type="button" @click="showDetail = false">×</button>
        </div>

        <div class="printable" id="claim-print">
          <div class="claim-header">
            <div>
              <h2>Insurance claim</h2>
              <p><strong>{{ detail.claim.insurance_name }}</strong></p>
              <p v-if="detail.claim.insurance_phone">📞 {{ detail.claim.insurance_phone }}</p>
              <p v-if="detail.claim.insurance_email">✉ {{ detail.claim.insurance_email }}</p>
            </div>
            <div class="claim-meta">
              <p><strong>Claim #:</strong> {{ detail.claim.id }}</p>
              <p v-if="detail.claim.reference_number"><strong>Reference:</strong> {{ detail.claim.reference_number }}</p>
              <p><strong>Period:</strong> {{ detail.claim.period_start }} → {{ detail.claim.period_end }}</p>
              <p><strong>Status:</strong> {{ detail.claim.status }}</p>
              <p v-if="detail.claim.submitted_at"><strong>Submitted:</strong> {{ new Date(detail.claim.submitted_at).toLocaleDateString() }}</p>
              <p v-if="detail.claim.paid_at"><strong>Paid:</strong> {{ new Date(detail.claim.paid_at).toLocaleDateString() }}</p>
            </div>
          </div>

          <table class="claim-lines">
            <thead>
              <tr>
                <th>Receipt</th><th>Date</th><th>Patient</th>
                <th>{{ detail.claim.insurance_member_id_label }}</th>
                <th>Medicine</th><th>Qty</th><th>Claimed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in detail.lines" :key="l.id">
                <td class="mono">{{ l.receipt_number }}</td>
                <td>{{ new Date(l.created_at).toLocaleDateString() }}</td>
                <td>{{ l.patient_name || '—' }}</td>
                <td class="mono">{{ l.insurance_member_number || '—' }}</td>
                <td>{{ l.medicine_name }}</td>
                <td>{{ l.quantity }}</td>
                <td><strong>{{ money(l.claimed_amount) }}</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="total-label">Total claimed</td>
                <td class="total-value">{{ money(detail.claim.claimed_amount) }}</td>
              </tr>
            </tfoot>
          </table>

          <div v-if="detail.claim.notes" class="claim-notes">
            <strong>Notes:</strong> {{ detail.claim.notes }}
          </div>
        </div>

        <div class="claim-actions no-print">
          <button class="secondary" @click="printClaim">🖨 Print / Save as PDF</button>
          <template v-if="detail.claim.status === 'DRAFT'">
            <button class="secondary danger" @click="deleteClaim(detail.claim)">Delete draft</button>
            <button class="primary" @click="setStatus(detail.claim, 'SUBMITTED')">Mark submitted</button>
          </template>
          <template v-else-if="detail.claim.status === 'SUBMITTED'">
            <button class="secondary" @click="markRejected(detail.claim)">Rejected</button>
            <button class="secondary" @click="markPartial(detail.claim)">Partial payment</button>
            <button class="primary" @click="markPaid(detail.claim)">Mark fully paid</button>
          </template>
          <template v-else-if="detail.claim.status === 'PARTIALLY_PAID'">
            <button class="primary" @click="markPaid(detail.claim)">Mark fully paid</button>
          </template>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 14px; gap: 16px; }
.toolbar h3 { font: 700 17px Manrope, sans-serif; color: #18384a; margin: 0 0 5px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 12px 17px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #edf1f3; }
td { padding: 13px 17px; font-size: 12px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.row { cursor: pointer; }
.row:hover { background: #f8fbfb; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #6c8290; }
.cell-sub { display: block; font-size: 10px; color: #94a1a8; margin-top: 2px; }
.right { text-align: right; white-space: nowrap; }
.small { font-size: 11px; padding: 6px 10px; }
.pill { display: inline-block; padding: 4px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.gray { background: #eef4f6; color: #6c8290; }
.pill.amber { background: #fff4db; color: #a9791b; }
.pill.red { background: #ffebed; color: #c14956; }
.pill.blue { background: #eef7ff; color: #1864ab; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 12px; }
.notice { margin-bottom: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.error-notice { background: #ffebed; color: #b8404b; border-color: #f5c6cb; }

.modal-backdrop { position: fixed; inset: 0; z-index: 5; background: rgba(16,45,64,0.6); display: grid; place-items: center; padding: 20px; overflow: auto; }
.modal { width: min(100%, 620px); background: #fff; border-radius: 16px; padding: 24px; max-height: 92vh; overflow: auto; }
.modal.wide { width: min(100%, 960px); }
.modal-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-title h3 { font: 800 18px Manrope, sans-serif; color: #18384a; margin: 0; }
.modal-title button { border: 0; background: transparent; font-size: 24px; color: #7c8f99; cursor: pointer; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #354a58; }
input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.preview-box { margin-top: 14px; background: #f5f8fa; border-radius: 10px; padding: 14px; }
.preview-line { display: flex; justify-content: space-between; font-size: 13px; color: #244a5c; }
.preview-line strong { font-size: 15px; color: #0a927b; }
.preview-empty { font-size: 12px; color: #94a1a8; margin-top: 8px; }

.claim-header { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
.claim-header h2 { font: 800 20px Manrope, sans-serif; color: #142f43; margin: 0 0 6px; }
.claim-header p { margin: 3px 0; font-size: 12px; color: #4a5c68; }
.claim-meta { text-align: right; }
.claim-lines { width: 100%; border-collapse: collapse; font-size: 12px; }
.claim-lines th { text-align: left; background: #f8fafb; color: #8999a2; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
.claim-lines td { padding: 8px 10px; border-bottom: 1px solid #f0f3f4; color: #334d5a; }
.claim-lines tfoot .total-label { text-align: right; font-weight: 700; }
.claim-lines tfoot .total-value { font-weight: 800; font-size: 14px; color: #17384b; }
.claim-notes { margin-top: 14px; font-size: 12px; color: #4a5c68; padding: 10px; background: #f8fafb; border-radius: 8px; }
.claim-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
.danger { color: #b8404b; border-color: #f5c6cb; background: #ffebed; }

@media print {
  .no-print { display: none !important; }
  .modal-backdrop { position: static; background: #fff; }
  .modal { max-height: none; width: 100%; box-shadow: none; }
}

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-grid .span-2 { grid-column: auto; }
  .claim-header { grid-template-columns: 1fr; }
  .claim-meta { text-align: left; }
}
</style>
