<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();
const onlyOwnerCanAdd = computed(() => auth.user?.role === 'OWNER');
const medicines = ref([]);
const search = ref('');
const notice = ref('');
const busy = ref(false);
const showMedicine = ref(false);
const form = ref({ name: '', sku: '', category: 'General', unit: 'tablet', reorder_level: 10 });

const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n || 0));

async function load() {
  try {
    const r = await api.get('/medicines', { params: { q: search.value } });
    medicines.value = r.data;
  } catch (e) {
    notice.value = e.response?.data?.error || 'Could not load medicines.';
  }
}

async function save() {
  if (!onlyOwnerCanAdd.value) {
    notice.value = 'Only the pharmacy owner can add new medicines.';
    return;
  }
  busy.value = true;
  try {
    await api.post('/medicines', form.value);
    showMedicine.value = false;
    form.value = { name: '', sku: '', category: 'General', unit: 'tablet', reorder_level: 10 };
    notice.value = 'Medicine added.';
    await load();
  } catch (e) {
    notice.value = e.response?.data?.error || 'Could not save medicine.';
  } finally { busy.value = false; }
}

async function remove(m) {
  if (!confirm(`Delete ${m.name}?`)) return;
  try {
    await api.delete(`/medicines/${m.id}`);
    notice.value = 'Deleted.';
    await load();
  } catch (e) {
    notice.value = e.response?.data?.error || 'Could not delete.';
  }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Medicines</template>

    <div v-if="notice" class="notice">{{ notice }}</div>

    <div v-if="!onlyOwnerCanAdd" class="readonly-banner">
      <span class="lock">🔒</span>
      <div>
        <strong>Read-only view</strong>
        <p>Only the pharmacy owner can add or remove medicines.</p>
      </div>
    </div>

    <div class="toolbar">
      <div><h3>Medicine catalogue</h3><p class="muted">Manage products and reorder levels.</p></div>
      <button
        v-if="onlyOwnerCanAdd"
        class="primary" @click="showMedicine = true">＋ Add medicine</button>
    </div>

    <div class="search-row">
      <input v-model="search" placeholder="Search name or SKU…" @input="load">
      <span>{{ medicines.length }} results</span>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Medicine</th><th>SKU</th><th>Category</th><th>Unit</th><th>Stock</th><th>Reorder at</th><th></th></tr></thead>
          <tbody><tr v-for="m in medicines" :key="m.id">
            <td><strong>{{ m.name }}</strong></td>
            <td class="mono">{{ m.sku }}</td><td>{{ m.category }}</td><td>{{ m.unit }}</td>
            <td><span class="pill" :class="m.stock <= m.reorder_level ? 'red' : 'green'">{{ m.stock }}</span></td>
            <td>{{ m.reorder_level }}</td>
            <td><button v-if="auth.user?.role === 'OWNER'" class="delete-button" @click="remove(m)">Delete</button></td>
          </tr></tbody>
        </table>
      </div>
      <div v-if="!medicines.length" class="empty">No medicines found.</div>
    </section>

    <div v-if="showMedicine" class="modal-backdrop" @click.self="showMedicine = false">
      <form class="modal" @submit.prevent="save">
        <div class="modal-title"><h3>Add medicine</h3><button type="button" @click="showMedicine = false">×</button></div>
        <label>Name</label><input v-model="form.name" required minlength="2">
        <label>SKU</label><input v-model="form.sku" required pattern="[A-Za-z0-9_-]+">
        <label>Category</label><input v-model="form.category" required>
        <div class="form-grid">
          <div><label>Unit</label><input v-model="form.unit" required></div>
          <div><label>Reorder level</label><input v-model.number="form.reorder_level" type="number" min="0" required></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="showMedicine = false">Cancel</button>
          <button class="primary" :disabled="busy">Save</button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 14px; }
.toolbar h3 { font: 700 17px Manrope, sans-serif; color: #18384a; margin: 0 0 5px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.search-row { display: flex; align-items: center; gap: 15px; margin-bottom: 14px; }
.search-row input { max-width: 330px; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 11px; }
.search-row span { font-size: 10px; color: #8c9ba3; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 12px 17px; border-bottom: 1px solid #edf1f3; }
td { padding: 13px 17px; font-size: 11px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6c8290; }
.pill { display: inline-block; padding: 5px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; }
.pill.red { background: #ffebed; color: #c14956; }
.pill.green { background: #e2f7ed; color: #07836c; }
.delete-button { border: 0; background: #fff0f1; color: #b8404b; border-radius: 6px; padding: 6px 8px; font-size: 10px; }
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
.readonly-banner { display: flex; align-items: flex-start; gap: 14px; background: #eef7ff; border: 1px solid #cbe3f7; border-radius: 12px; padding: 14px 18px; margin: 20px 0 6px; }
.readonly-banner .lock { font-size: 22px; line-height: 1; }
.readonly-banner strong { display: block; font: 700 13px Manrope, sans-serif; color: #1864ab; margin-bottom: 3px; }
.readonly-banner p { font-size: 12px; color: #4a5c68; margin: 0; line-height: 1.5; }
</style>
