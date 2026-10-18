<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import AppLayout from '../components/AppLayout.vue';

const sales = ref([]);
const batches = ref([]);
const notice = ref('');
const busy = ref(false);
const showSale = ref(false);
const saleForm = ref({ batch_id: '', quantity: 1, patient_id: '', payment_method: 'CASH', insurance_id: '', insurance_member_number: '' });
const insurances = ref([]);
const patients = ref([]);

const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n || 0));

async function load() {
  try {
    const r = await api.get('/sales');
    sales.value = r.data;
  } catch (e) { notice.value = e.response?.data?.error || 'Could not load sales.'; }
}

async function openSale() {
  const [b, p, i] = await Promise.all([
    api.get('/batches'),
    api.get('/patients'),
    api.get('/insurances')
  ]);
  batches.value = b.data;
  patients.value = p.data;
  insurances.value = i.data.filter(x => x.active);
  showSale.value = true;
}

async function sell() {
  busy.value = true;
  try {
    const payload = {
      ...saleForm.value,
      patient_id: saleForm.value.patient_id || null,
      insurance_id: saleForm.value.payment_method === 'INSURANCE' ? saleForm.value.insurance_id || null : null,
      insurance_member_number: saleForm.value.payment_method === 'INSURANCE' ? (saleForm.value.insurance_member_number || null) : null
    };
    const r = await api.post('/sales', payload);
    showSale.value = false;
    notice.value = `Sale recorded. Receipt ${r.data.receipt_number} — ${money(r.data.total)}`;
    await load();
  } catch (e) { notice.value = e.response?.data?.error || 'Could not record sale.'; }
  finally { busy.value = false; }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Sales</template>

    <div v-if="notice" class="notice">{{ notice }}</div>

    <div class="toolbar">
      <div><h3>Sales ledger</h3><p class="muted">Receipts and history.</p></div>
      <button class="primary" @click="openSale">＋ Record sale</button>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Receipt</th><th>Medicine</th><th>Qty</th><th>Unit price</th><th>Total</th><th>Sold by</th><th>Date</th></tr></thead>
          <tbody><tr v-for="s in sales" :key="s.id">
            <td class="mono">{{ s.receipt_number }}</td><td>{{ s.medicine_name }}</td>
            <td>{{ s.quantity }}</td><td>{{ money(s.unit_price) }}</td>
            <td><strong>{{ money(s.total) }}</strong></td>
            <td>{{ s.sold_by_name || '—' }}</td><td>{{ s.created_at }}</td>
          </tr></tbody>
        </table>
      </div>
      <div v-if="!sales.length" class="empty">No sales recorded.</div>
    </section>

    <div v-if="showSale" class="modal-backdrop" @click.self="showSale = false">
      <form class="modal" @submit.prevent="sell">
        <div class="modal-title"><h3>Record sale</h3><button type="button" @click="showSale = false">×</button></div>
        <label>Batch</label>
        <select v-model="saleForm.batch_id" required>
          <option value="" disabled>Select batch</option>
          <option v-for="b in batches.filter(x => x.quantity > 0 && x.expiry_date >= new Date().toISOString().slice(0,10))" :key="b.id" :value="b.id">
            {{ b.medicine_name }} · {{ b.batch_number }} ({{ b.quantity }})
          </option>
        </select>
        <label>Quantity</label><input v-model.number="saleForm.quantity" type="number" min="1" required>
        <label>Patient (optional)</label>
        <select v-model="saleForm.patient_id">
          <option value="">— Walk-in / not recorded —</option>
          <option v-for="p in patients" :key="p.id" :value="p.id">{{ p.full_name }} · {{ p.phone || 'no phone' }}</option>
        </select>
        <label>Payment method</label>
        <select v-model="saleForm.payment_method">
          <option value="CASH">Cash</option>
          <option value="MOBILE_MONEY">Mobile money (MoMo)</option>
          <option value="CARD">Card</option>
          <option value="INSURANCE">Insurance</option>
        </select>
        <template v-if="saleForm.payment_method === 'INSURANCE'">
          <label>Insurance provider *</label>
          <select v-model="saleForm.insurance_id" required>
            <option value="" disabled>Select insurance</option>
            <option v-for="i in insurances" :key="i.id" :value="i.id">{{ i.code }} · {{ i.name }}</option>
          </select>
          <label>Member / policy number</label>
          <input v-model="saleForm.insurance_member_number" placeholder="Number on the member's card">
          <p class="hint">The price is split automatically based on the insurance settings.</p>
        </template>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="showSale = false">Cancel</button>
          <button class="primary" :disabled="busy">Record sale</button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 14px; }
.toolbar h3 { font: 700 17px Manrope, sans-serif; color: #18384a; margin: 0 0 5px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 12px 17px; border-bottom: 1px solid #edf1f3; }
td { padding: 13px 17px; font-size: 11px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6c8290; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 11px; }
.notice { margin-top: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 11px; }
.modal-backdrop { position: fixed; inset: 0; z-index: 5; background: rgba(16,45,64,0.66); display: grid; place-items: center; padding: 20px; }
.modal { width: min(100%, 500px); background: #fff; border-radius: 16px; padding: 24px; }
.modal-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-title h3 { font: 800 18px Manrope, sans-serif; color: #18384a; margin: 0; }
.modal-title button { border: 0; background: transparent; font-size: 24px; color: #7c8f99; cursor: pointer; }
.modal label { display: block; font-size: 12px; font-weight: 700; margin: 12px 0 7px; color: #354a58; }
.modal input, .modal select { width: 100%; padding: 12px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 25px; }
</style>
