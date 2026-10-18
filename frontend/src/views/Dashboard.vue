<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Chart from 'chart.js/auto';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';


const auth = useAuthStore();
const router = useRouter();

const data = ref(null);
const error = ref('');
const now = ref(new Date());
let clockTimer = null;
let trendChart = null;
let topChart = null;
const trendCanvas = ref(null);
const topCanvas = ref(null);

const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n || 0));
const compact = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return String(v);
};
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const greeting = computed(() => {
  const h = now.value.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
});
const firstName = computed(() => (auth.user?.name || '').split(' ')[0] || 'there');
const role = computed(() => auth.user?.role || 'STAFF');
const roleLabel = computed(() => ({ OWNER: 'Owner', PHARMACIST: 'Pharmacist', STAFF: 'Staff' }[role.value]));
const roleWelcome = computed(() => ({
  OWNER: "Here is today's overview. You can manage staff, stock and pricing from here.",
  PHARMACIST: "Here is today's overview. You can manage the catalogue, stock and sales.",
  STAFF: 'Record sales and check stock availability from here.'
}[role.value]));

const quickActions = computed(() => {
  const actions = [
    { label: 'Record a sale', icon: '↗', to: { name: 'sales' }, primary: true, roles: ['OWNER', 'PHARMACIST', 'STAFF'] },
    { label: 'View inventory', icon: '▣', to: { name: 'inventory' }, roles: ['OWNER', 'PHARMACIST', 'STAFF'] },
    { label: 'Add medicine', icon: '＋', to: { name: 'medicines' }, roles: ['OWNER', 'PHARMACIST'] },
    { label: 'Manage users', icon: '◉', to: { name: 'users' }, roles: ['OWNER'] }
  ];
  return actions.filter((a) => a.roles.includes(role.value)).slice(0, 4);
});

const activityIcon = (a) => ({ LOGIN: '→', LOGOUT: '←', SALE: '↗', CREATE: '＋', UPDATE: '✎', DELETE: '🗑', RECEIVE_STOCK: '⬇', CHANGE_PASSWORD: '🔑' }[a] || '•');
const trendArrow = (d) => ({ cls: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', glyph: d > 0 ? '▲' : d < 0 ? '▼' : '—' });

async function load() {
  try {
    const r = await api.get('/dashboard');
    data.value = r.data;
    await nextTick();
    buildCharts();
  } catch (e) {
    error.value = e.response?.data?.error || 'Unable to load dashboard.';
  }
}

function buildCharts() {
  if (trendCanvas.value && data.value?.salesTrend) {
    trendChart?.destroy();
    const hasAny = data.value.salesTrend.some((d) => Number(d.revenue) > 0);
    if (hasAny) {
      trendChart = new Chart(trendCanvas.value, {
        type: 'line',
        data: {
          labels: data.value.salesTrend.map((d) => new Date(d.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })),
          datasets: [{ label: 'Revenue', data: data.value.salesTrend.map((d) => d.revenue), borderColor: '#078c78', backgroundColor: 'rgba(7,140,120,0.10)', fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: '#078c78', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eef4f6' }, ticks: { callback: compact } } } }
      });
    }
  }
  if (topCanvas.value && data.value?.topMedicines?.length) {
    topChart?.destroy();
    topChart = new Chart(topCanvas.value, {
      type: 'bar',
      data: { labels: data.value.topMedicines.map((m) => m.name), datasets: [{ label: 'Units', data: data.value.topMedicines.map((m) => m.units), backgroundColor: '#0d9c85', borderRadius: 6, barThickness: 18 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: '#eef4f6' } }, y: { grid: { display: false } } } }
    });
  }
}

onMounted(async () => {
  await load();
  clockTimer = setInterval(() => { now.value = new Date(); }, 30_000);
});
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
  trendChart?.destroy(); topChart?.destroy();
});
</script>

<template>
  <AppLayout>
    <template #title>Home</template>

    <div v-if="error" class="notice error-notice">{{ error }}</div>
    <div v-else-if="!data" class="skeleton-grid"><div v-for="i in 6" :key="i" class="skeleton-tile"></div></div>

    <template v-else>
      
      

      <section class="greeting">
        <div>
          <h3>{{ greeting }}, {{ firstName }} 👋</h3>
          <p class="muted">{{ roleWelcome }}</p>
        </div>
        <div class="greeting-meta">
          <span class="role-pill">{{ roleLabel }}</span>
          <span class="date-pill">{{ now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) }} · {{ now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}</span>
        </div>
      </section>

      <section class="quick-actions">
        <router-link v-for="a in quickActions" :key="a.label" :to="a.to" class="quick-action" :class="{ primary: a.primary }">
          <span class="qa-icon">{{ a.icon }}</span><span class="qa-label">{{ a.label }}</span>
        </router-link>
      </section>

      <section class="kpi-grid">
        <article class="kpi"><div class="kpi-head"><span>Today's sales</span><i>↗</i></div><strong>{{ money(data.metrics.salesToday) }}</strong><small>{{ data.metrics.transactionsToday }} transactions</small></article>
        <article class="kpi"><div class="kpi-head"><span>Total medicines</span><i>▤</i></div><strong>{{ data.metrics.medicineCount }}</strong><small>In catalogue</small></article>
        <article class="kpi warning"><div class="kpi-head"><span>Low stock</span><i>⚠</i></div><strong>{{ data.metrics.lowStock }}</strong><small>Need reordering</small></article>
      </section>

      <section class="charts">
        <div class="chart-card"><div class="chart-head"><h4>7-day sales trend</h4></div><div class="chart-body"><canvas ref="trendCanvas"></canvas><div v-if="!(data.salesTrend || []).some(d => Number(d.revenue) > 0)" class="chart-empty">No sales recorded yet.</div></div></div>
        <div class="chart-card"><div class="chart-head"><h4>Top medicines</h4></div><div class="chart-body"><canvas ref="topCanvas"></canvas><div v-if="!data.topMedicines?.length" class="chart-empty">No sales recorded yet.</div></div></div>
      </section>

      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head"><h4>Stock attention</h4></div>
          <div v-if="data.lowStock?.length" class="alert-list"><div v-for="m in data.lowStock" :key="m.id" class="alert-row"><span class="alert-icon">!</span><div class="alert-info"><strong>{{ m.name }}</strong><small>{{ m.sku }}</small></div><span class="pill red">{{ m.stock === 0 ? 'Out' : `${m.stock} left` }}</span></div></div>
          <div v-else class="empty">All products above reorder level.</div>
        </div>
        <div class="panel">
          <div class="panel-head"><h4>Live activity</h4></div>
          <ul v-if="data.activity?.length" class="activity-list"><li v-for="a in data.activity" :key="a.id" class="activity-item"><span class="activity-icon">{{ activityIcon(a.action) }}</span><div class="activity-body"><div class="activity-line"><strong>{{ a.user_name || 'System' }}</strong> <span class="activity-action">{{ a.action.toLowerCase() }}</span></div><div class="activity-time">{{ timeAgo(a.created_at) }}</div></div></li></ul>
          <div v-else class="empty">No activity yet.</div>
        </div>
      </section>
    </template>
  </AppLayout>
</template>

<style scoped>
.greeting { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 27px 0 20px; flex-wrap: wrap; }
.greeting h3 { font: 800 22px Manrope, sans-serif; color: #15364a; margin: 0 0 4px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.greeting-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.role-pill { background: #e2f7ed; color: #07836c; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 20px; }
.date-pill { background: #fff; border: 1px solid #e2eaed; border-radius: 20px; padding: 6px 12px; color: #71838e; font-size: 11px; }

.quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px; }
.quick-action { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 12px; border: 1px solid #e5ecef; background: #fff; color: #244a5c; font-size: 12px; font-weight: 600; text-decoration: none; }
.quick-action.primary { background: linear-gradient(135deg, #078c78, #0d9c85); color: #fff; border-color: transparent; }
.qa-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: rgba(0,0,0,0.05); }
.quick-action.primary .qa-icon { background: rgba(255,255,255,0.18); }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 20px; }
.kpi { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 18px 20px; }
.kpi-head { display: flex; justify-content: space-between; font-size: 11px; color: #7b8d97; text-transform: uppercase; font-weight: 700; }
.kpi-head i { font-style: normal; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: #e3f7ef; color: #078c78; }
.kpi.warning .kpi-head i { background: #fff2d8; color: #bd8219; }
.kpi > strong { display: block; font: 800 26px Manrope, sans-serif; color: #17384b; margin: 10px 0 4px; }
.kpi > small { font-size: 11px; color: #94a1a8; }

.charts { display: grid; grid-template-columns: 1.35fr 1fr; gap: 14px; margin-bottom: 20px; }
.chart-card { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 18px 20px 12px; }
.chart-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0 0 8px; }
.chart-body { height: 240px; position: relative; }
.chart-empty { position: absolute; inset: 0; display: grid; place-items: center; color: #94a1a8; font-size: 12px; }

.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; }
.panel-head { padding: 18px 20px 12px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0; }
.alert-list { padding: 0 18px 12px; }
.alert-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-top: 1px solid #f0f3f4; }
.alert-icon { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: #fff0e1; color: #bf7d25; font-weight: 800; }
.alert-info { flex: 1; } .alert-info strong { display: block; font-size: 12px; } .alert-info small { font-size: 10px; color: #94a1a8; }
.pill.red { background: #ffebed; color: #c14956; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.activity-list { list-style: none; margin: 0; padding: 0 18px 12px; }
.activity-item { display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid #f0f3f4; }
.activity-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; background: #eef7ff; color: #1c7ed6; font-size: 14px; }
.activity-line { display: flex; gap: 6px; font-size: 12px; }
.activity-action { color: #078c78; font-weight: 700; }
.activity-time { font-size: 10px; color: #94a1a8; margin-top: 3px; }
.empty { padding: 22px; text-align: center; color: #8b9ba3; font-size: 12px; }
</style>
