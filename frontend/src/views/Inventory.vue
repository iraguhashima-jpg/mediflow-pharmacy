<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const batches = ref([]);
const catalogue = ref([]);
const search = ref('');
const notice = ref('');
const busy = ref(false);
const showBatch = ref(false);
const showSale = ref(false);
const batchForm = ref({ medicine_id: '', batch_number: '', quantity: 0, expiry_date: '', cost_price: 0, selling_price: 0 });
const saleForm = ref({ batch_id: '', quantity: 1 });

const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n || 0));

const expiryFilter = computed(() => {
  const v = route.query.expiry;
  return (v === '30' || v === '60' || v === '90') ? Number(v) : null;
});

const today = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

const visibleBatches = computed(() => {
  if (!expiryFilter.value) return batches.value;
  const from = today();
  const to = daysFromNow(expiryFilter.value);
  const prev = expiryFilter.value === 60 ? 30 : expiryFilter.value === 90 ? 60 : null;
  const lower = prev ? daysFromNow(prev) : from;
  return batches.value.filter((b) => {
    if (b.quantity <= 0) return false;
    if (b.expiry_date < from) return false;
    return b.expiry_date >= lower && b.expiry_date <= to;
  });
});

async function load() {
  try {
    const r = await api.get('/batches', { params: { q: search.value } });
    batches.value = r.data;
  } catch (e) { notice.value = e.response?.data?.error || 'Could not load batches.'; }
}

async function openBatch() {
  try {
    const r = await api.get('/medicines');
    catalogue.value = r.data;
    showBatch.value = true;
  } catch { notice.value = 'Could not load catalogue.'; }
}

async function openSale() {
  await load();
  showSale.value = true;
}

async function receive() {
  busy.value = true;
  try {
    await api.post('/batches', batchForm.value);
    showBatch.value = false;
    batchForm.value = { medicine_id: '', batch_number: '', quantity: 0, expiry_date: '', cost_price: 0, selling_price: 0 };
    notice.value = 'Stock received.';
    await load();
  } catch (e) { notice.value = e.response?.data?.error || 'Could not receive stock.'; }
  finally { busy.value = false; }
}

async function sell() {
  busy.value = true;
  try {
    const r = await api.post('/sales', saleForm.value);
    showSale.value = false;
    notice.value = `Sale recorded. Receipt ${r.data.receipt_number} — ${money(r.data.total)}`;
    await load();
  } catch (e) { notice.value = e.response?.data?.error || 'Could not record sale.'; }
  finally { busy.value = false; }
}

function clearExpiryFilter() {
  router.replace({ name: 'inventory' });
}

// React to ?expiry= from the dashboard radar buttons
watch(() => route.query.expiry, () => {}, { immediate: true });

onMounted(() => {
  load();
  if (route.query.action === 'receive' && (auth.user?.role === 'OWNER' || auth.user?.role === 'PHARMACIST')) {
    openBatch();
  }
});
</script>

<template>
  <AppLayout>
    <template #title>Inventory</template>

    <div v-if="notice" class="notice">{{ notice }}</div>

    <div class="toolbar">
      <div><h3>Batch inventory</h3><p class="muted">Quantities, prices, expiry per batch.</p></div>
      <div class="actions">
        <button class="secondary" @click="openSale">＋ Record sale</button>
        <button v-if="auth.user?.role === 'OWNER' || auth.user?.role === 'PHARMACIST'" class="primary" @click="openBatch">＋ Receive stock</button>
      </div>
    </div>

    <div v-if="expiryFilter" class="filter-banner">
      Showing batches expiring within
      <strong>{{ expiryFilter }} days</strong>
      · {{ visibleBatches.length }} matching
      <button class="filter-clear" @click="clearExpiryFilter">Clear filter</button>
    </div>
    <div class="search-row">
      <input v-model="search" placeholder="Search medicine or batch…" @input="load">
      <span>{{ visibleBatches.length }} batches</span>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Expiry</th><th>Cost</th><th>Sell</th><th>Status</th></tr></thead>
          <tbody><tr v-for="b in visibleBatches" :key="b.id">
            <td><strong>{{ b.medicine_name }}</strong><small class="cell-sub">{{ b.sku }}</small></td>
            <td class="mono">{{ b.batch_number }}</td><td>{{ b.quantity }}</td><td>{{ b.expiry_date }}</td>
            <td>{{ money(b.cost_price) }}</td><td>{{ money(b.selling_price) }}</td>
            <td><span class="pill" :class="b.expiry_date < new Date().toISOString().slice(0,10) ? 'red' : b.expiry_date <= new Date(Date.now()+90*86400000).toISOString().slice(0,10) ? 'amber' : 'green'">
              {{ b.expiry_date < new Date().toISOString().slice(0,10) ? 'Expired' : b.expiry_date <= new Date(Date.now()+90*86400000).toISOString().slice(0,10) ? 'Near expiry' : 'Good' }}
            </span></td>
          </tr></tbody>
        </table>
      </div>
      <div v-if="!visibleBatches.length" class="empty">No batches.</div>
    </section>

    <div v-if="showBatch" class="modal-backdrop" @click.self="showBatch = false">
      <form class="modal" @submit.prevent="receive">
        <div class="modal-title"><h3>Receive stock</h3><button type="button" @click="showBatch = false">×</button></div>
        <label>Medicine</label>
        <select v-model="batchForm.medicine_id" required>
          <option value="" disabled>Select medicine</option>
          <option v-for="m in catalogue" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <label>Batch number</label><input v-model="batchForm.batch_number" required>
        <label>Quantity</label><input v-model.number="batchForm.quantity" type="number" min="0" required>
        <label>Expiry date</label><input v-model="batchForm.expiry_date" type="date" required>
        <div class="form-grid">
          <div><label>Cost price</label><input v-model.number="batchForm.cost_price" type="number" min="0" step="1" required></div>
          <div><label>Selling price</label><input v-model.number="batchForm.selling_price" type="number" min="0" step="1" required></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="showBatch = false">Cancel</button>
          <button class="primary" :disabled="busy">Receive stock</button>
        </div>
      </form>
    </div>

    <div v-if="showSale" class="modal-backdrop" @click.self="showSale = false">
      <form class="modal" @submit.prevent="sell">
        <div class="modal-title"><h3>Record sale</h3><button type="button" @click="showSale = false">×</button></div>
        <label>Available batch</label>
        <select v-model="saleForm.batch_id" required>
          <option value="" disabled>Select batch</option>
          <option v-for="b in batches.filter(x => x.quantity > 0 && x.expiry_date >= new Date().toISOString().slice(0,10))" :key="b.id" :value="b.id">
            {{ b.medicine_name }} · {{ b.batch_number }} ({{ b.quantity }} available)
          </option>
        </select>
        <label>Quantity sold</label><input v-model.number="saleForm.quantity" type="number" min="1" required>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="showSale = false">Cancel</button>
          <button class="primary" :disabled="busy">Record sale</button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 14px; gap: 16px; }
.toolbar h3 { font: 700 17px Manrope, sans-serif; color: #18384a; margin: 0 0 5px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.actions { display: flex; gap: 8px; }
.search-row { display: flex; align-items: center; gap: 15px; margin-bottom: 14px; }
.search-row input { max-width: 330px; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 11px; }
.search-row span { font-size: 10px; color: #8c9ba3; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 12px 17px; border-bottom: 1px solid #edf1f3; }
td { padding: 13px 17px; font-size: 11px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.cell-sub { display: block; font-size: 9px; color: #96a4ab; margin-top: 4px; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6c8290; }
.pill { display: inline-block; padding: 5px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; }
.pill.red { background: #ffebed; color: #c14956; }
.pill.amber { background: #fff4db; color: #a9791b; }
.pill.green { background: #e2f7ed; color: #07836c; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 11px; }
.notice { margin-top: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 11px; }
.modal-backdrop { position: fixed; inset: 0; z-index: 5; background: rgba(16,45,64,0.66); display: grid; place-items: center; padding: 20px; }
.modal { width: min(100%, 500px); background: #fff; border-radius: 16px; padding: 24px; }
.modal-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-title h3 { font: 800 18px Manrope, sans-serif; color: #18384a; margin: 0; }
.modal-title button { border: 0; background: transparent; font-size: 24px; color: #7c8f99; cursor: pointer; }
.modal label { display: block; font-size: 12px; font-weight: 700; margin: 12px 0 7px; color: #354a58; }
.modal input, .modal select { width: 100%; padding: 12px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 25px; }
/* Expiry filter banner */
.filter-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff8e6;
  border: 1px solid #f0dfa8;
  color: #8a5a00;
  padding: 10px 14px;
  border-radius: 9px;
  font-size: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.filter-clear {
  margin-left: auto;
  border: 0;
  background: rgba(0,0,0,0.06);
  color: inherit;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
}
/* Expiry filter banner */
.filter-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff8e6;
  border: 1px solid #f0dfa8;
  color: #8a5a00;
  padding: 10px 14px;
  border-radius: 9px;
  font-size: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.filter-clear {
  margin-left: auto;
  border: 0;
  background: rgba(0,0,0,0.06);
  color: inherit;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
