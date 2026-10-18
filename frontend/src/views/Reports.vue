<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import AppLayout from '../components/AppLayout.vue';

const medicines = ref([]);
const notice = ref('');

const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n || 0));
const total = computed(() => medicines.value.reduce((s, m) => s + Number(m.stock_value || 0), 0));

async function load() {
  try {
    const r = await api.get('/reports/stock');
    medicines.value = r.data;
  } catch (e) { notice.value = e.response?.data?.error || 'Could not load report.'; }
}
onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Reports</template>

    <div v-if="notice" class="notice">{{ notice }}</div>

    <div class="toolbar">
      <div><h3>Stock valuation</h3><p class="muted">Quantities and cost value.</p></div>
      <button class="secondary" @click="load">↻ Refresh</button>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Medicine</th><th>SKU</th><th>Qty</th><th>Reorder at</th><th>Stock value</th></tr></thead>
          <tbody><tr v-for="m in medicines" :key="m.id">
            <td><strong>{{ m.name }}</strong></td><td class="mono">{{ m.sku }}</td>
            <td>{{ m.stock }}</td><td>{{ m.reorder_level }}</td><td>{{ money(m.stock_value) }}</td>
          </tr></tbody>
        </table>
      </div>
      <div class="report-total">Total cost value <strong>{{ money(total) }}</strong></div>
    </section>
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
.report-total { display: flex; justify-content: space-between; padding: 17px 20px; color: #72848e; font-size: 11px; border-top: 1px solid #edf1f3; }
.report-total strong { color: #18384a; font-size: 13px; }
.notice { margin-top: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 11px; }
</style>
