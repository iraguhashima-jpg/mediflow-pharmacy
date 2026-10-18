<script setup>
defineProps({ data: Object, money: Function, timeAgo: Function, activityIcon: Function });
</script>
<template>
  <div>
    <section class="hero-block pharm">
      <div class="role-pill pharm">PHARMACIST</div>
      <h2>Pharmacist dashboard</h2>
      <p class="muted">Catalogue, stock, prescriptions, patients and sales. Financial reporting and staff management are for the owner.</p>
    </section>

    <section class="kpi-grid">
      <article class="kpi">
        <div class="kpi-head"><span>Sales today</span><i>↗</i></div>
        <strong>{{ money(data.metrics.salesToday) }}</strong>
        <small>{{ data.metrics.transactionsToday }} transactions</small>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span>Near expiry</span><i>◷</i></div>
        <strong>{{ data.metrics.nearExpiry }}</strong>
        <small>Next 90 days</small>
      </article>
      <article class="kpi warning">
        <div class="kpi-head"><span>Low stock</span><i>⚠</i></div>
        <strong>{{ data.metrics.lowStock }}</strong>
        <small>{{ data.metrics.outOfStock }} out of stock</small>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span>Patients</span><i>☺</i></div>
        <strong>{{ data.staffExtras?.activePatients || 0 }}</strong>
        <small>Active on file</small>
      </article>
    </section>

    <section class="quick-actions">
      <router-link to="/prescriptions" class="quick-action primary">℞ New prescription</router-link>
      <router-link to="/inventory" class="quick-action">▣ Receive stock</router-link>
      <router-link to="/medicines" class="quick-action">▤ Manage catalogue</router-link>
      <router-link to="/patients" class="quick-action">☺ Patients</router-link>
    </section>

    <section class="charts">
      <div class="chart-card">
        <div class="chart-head"><h4>7-day sales trend</h4></div>
        <div class="chart-body"><canvas id="trend-canvas"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-head"><h4>Top medicines this month</h4></div>
        <div class="chart-body"><canvas id="top-canvas"></canvas></div>
      </div>
    </section>

    <section class="bottom-grid">
      <div class="panel">
        <div class="panel-head"><h4>Near expiry</h4></div>
        <div v-if="data.nearExpiry.length" class="alert-list">
          <div v-for="b in data.nearExpiry" :key="b.id" class="alert-row">
            <span class="alert-icon amber">◷</span>
            <div class="alert-info"><strong>{{ b.medicine_name }}</strong><small>Batch {{ b.batch_number }} · {{ b.quantity }} units</small></div>
            <span class="expiry">{{ b.expiry_date }}</span>
          </div>
        </div>
        <div v-else class="empty">No batches expiring soon.</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h4>Recent sales</h4></div>
        <div v-if="data.recentSales.length" class="table-wrap">
          <table><thead><tr><th>Receipt</th><th>Medicine</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody><tr v-for="s in data.recentSales" :key="s.id"><td class="mono">{{ s.receipt_number }}</td><td>{{ s.medicine_name }}</td><td>{{ s.quantity }}</td><td>{{ money(s.total) }}</td></tr></tbody>
          </table>
        </div>
        <div v-else class="empty">No sales yet.</div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.hero-block.pharm { background: linear-gradient(135deg, #1c7ed6, #0b5fa5); color: #fff; border-radius: 16px; padding: 22px 26px; margin-bottom: 18px; }
.role-pill { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 10px; border-radius: 20px; margin-bottom: 10px; }
.hero-block h2 { font: 800 22px Manrope, sans-serif; margin: 0 0 6px; color: #fff; }
.hero-block .muted { color: rgba(255,255,255,0.85); font-size: 12px; margin: 0; max-width: 560px; line-height: 1.5; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 14px; margin-bottom: 18px; }
.kpi { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 18px 20px; }
.kpi-head { display: flex; justify-content: space-between; font-size: 11px; color: #7b8d97; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
.kpi-head i { font-style: normal; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: #eef7ff; color: #1c7ed6; font-size: 14px; }
.kpi.warning .kpi-head i { background: #fff2d8; color: #bd8219; }
.kpi strong { display: block; font: 800 24px Manrope, sans-serif; color: #17384b; margin: 10px 0 4px; }
.kpi small { font-size: 11px; color: #94a1a8; }
.quick-actions { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 10px; margin-bottom: 18px; }
.quick-action { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 12px; border: 1px solid #e5ecef; background: #fff; color: #244a5c; font-size: 13px; font-weight: 600; text-decoration: none; }
.quick-action.primary { background: linear-gradient(135deg,#1c7ed6,#0b5fa5); color: #fff; border-color: transparent; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
.chart-card { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 18px 20px 12px; }
.chart-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0; }
.chart-body { height: 240px; }
.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; }
.panel-head { padding: 18px 20px 12px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0; }
.alert-list { padding: 0 18px 12px; }
.alert-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-top: 1px solid #f0f3f4; }
.alert-icon.amber { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: #fff4d9; color: #bb871f; font-weight: 800; }
.alert-info { flex: 1; } .alert-info strong { display: block; font-size: 12px; } .alert-info small { font-size: 10px; color: #94a1a8; }
.expiry { font-size: 10px; color: #9b6e1c; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 10px 14px; text-transform: uppercase; }
td { padding: 11px 14px; font-size: 12px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6c8290; }
.empty { padding: 22px; text-align: center; color: #8b9ba3; font-size: 12px; }
@media (max-width: 900px) { .charts, .bottom-grid { grid-template-columns: 1fr; } }
</style>
