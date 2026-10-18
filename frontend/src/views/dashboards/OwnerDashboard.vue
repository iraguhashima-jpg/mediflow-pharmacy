<script setup>
defineProps({ data: Object, money: Function, timeAgo: Function, activityIcon: Function, trendArrow: Function });

import api from '../../api';

async function approve(u) {
  if (!confirm(`Approve ${u.name} (${u.role})?`)) return;
  try {
    await api.post(`/users/${u.id}/approve`);
    window.dispatchEvent(new CustomEvent('mediflow-staff-approved'));
  } catch (e) { alert(e.response?.data?.error || 'Could not approve.'); }
}
async function reject(u) {
  const reason = prompt(`Reject ${u.name}? Reason (optional)`);
  if (reason === null) return;
  try {
    await api.post(`/users/${u.id}/reject`, { reason: reason || undefined });
    window.dispatchEvent(new CustomEvent('mediflow-staff-approved'));
  } catch (e) { alert(e.response?.data?.error || 'Could not reject.'); }
}
</script>
<template>
  <div class="owner-dash">
    <section class="hero-block owner">
      <div class="hero-left">
        <div class="role-pill owner">OWNER</div>
        <h2>Owner dashboard</h2>
        <p class="muted">Full control: revenue, staff, finance, stock, and insurance. Everything below is scoped to your pharmacy.</p>
      </div>
      <div class="hero-stats">
        <div class="mini-stat">
          <span class="k">Today's revenue</span>
          <strong>{{ money(data.metrics.salesToday) }}</strong>
          <span class="delta" :class="trendArrow(data.metrics.salesTodayDeltaPct).cls">
            {{ trendArrow(data.metrics.salesTodayDeltaPct).glyph }} {{ Math.abs(data.metrics.salesTodayDeltaPct) }}% vs yesterday
          </span>
        </div>
        <div class="mini-stat">
          <span class="k">This week</span>
          <strong>{{ money(data.metrics.salesThisWeek) }}</strong>
          <span class="delta" :class="trendArrow(data.metrics.salesThisWeekDeltaPct).cls">
            {{ trendArrow(data.metrics.salesThisWeekDeltaPct).glyph }} {{ Math.abs(data.metrics.salesThisWeekDeltaPct) }}% vs last week
          </span>
        </div>
      </div>
    </section>

    <!-- Owner KPIs -->
    <section class="kpi-grid owner">
      <article class="kpi owner">
        <div class="kpi-head"><span>Revenue today</span><i>₣</i></div>
        <strong>{{ money(data.metrics.salesToday) }}</strong>
        <small>{{ data.metrics.transactionsToday }} transactions</small>
      </article>
      <article class="kpi owner">
        <div class="kpi-head"><span>Stock value (cost)</span><i>◈</i></div>
        <strong>{{ money(data.metrics.stockCostValue) }}</strong>
        <small>Retail {{ money(data.metrics.stockRetailValue) }} · margin {{ money(data.metrics.potentialMargin) }}</small>
      </article>
      <article v-if="data.staffExtras?.pendingApprovals" class="kpi warning owner-alert">
        <div class="kpi-head"><span>Staff awaiting approval</span><i>⏳</i></div>
        <strong>{{ data.staffExtras.pendingApprovals }}</strong>
        <small>Go to <b>Staff</b> page to approve</small>
      </article>
      <article v-if="data.staffExtras?.pendingClaimsCount" class="kpi danger">
        <div class="kpi-head"><span>Insurance owed</span><i>⎙</i></div>
        <strong>{{ money(data.staffExtras.pendingClaimsOwed) }}</strong>
        <small>{{ data.staffExtras.pendingClaimsCount }} open claim(s)</small>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span>Active patients</span><i>☺</i></div>
        <strong>{{ data.staffExtras?.activePatients || 0 }}</strong>
        <small>On file at your pharmacy</small>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span>Active reminders</span><i>✉</i></div>
        <strong>{{ data.staffExtras?.activeReminders || 0 }}</strong>
        <small>Scheduled SMS</small>
      </article>
    </section>

    <!-- Live pending staff requests -->
    <section v-if="data.staffExtras?.pendingStaff?.length" class="live-pending-panel">
      <div class="live-head">
        <div>
          <h3><span class="pulse-dot"></span> Staff waiting for approval</h3>
          <p class="muted">{{ data.staffExtras.pendingStaff.length }} request(s). Approve or reject from the list below.</p>
        </div>
        <router-link to="/users" class="text-link">Manage all →</router-link>
      </div>
      <div class="live-list">
        <div v-for="u in data.staffExtras.pendingStaff" :key="u.id" class="live-row">
          <div class="avatar-circle">{{ u.name.slice(0,1).toUpperCase() }}</div>
          <div class="live-info">
            <strong>{{ u.name }}</strong>
            <div class="live-meta">
              <span>{{ u.email }}</span>
              <span v-if="u.phone"> · {{ u.phone }}</span>
              <span> · requested <em>{{ u.role }}</em></span>
            </div>
          </div>
          <div class="live-actions">
            <button class="btn-approve" @click="approve(u)">Approve</button>
            <button class="btn-reject" @click="reject(u)">Reject</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Owner quick actions -->
    <section class="quick-actions owner">
      <router-link to="/users" class="quick-action primary">⏳ Approve staff requests</router-link>
      <router-link to="/reports" class="quick-action">▥ Financial reports</router-link>
      <router-link to="/insuranceClaims" class="quick-action">⎙ Insurance claims</router-link>
      <router-link to="/pharmacy" class="quick-action">⚕ Pharmacy settings</router-link>
    </section>

    <!-- Charts -->
    <section class="charts">
      <div class="chart-card">
        <div class="chart-head"><div><h4>7-day revenue</h4><p class="muted">Every sale in your pharmacy</p></div></div>
        <div class="chart-body"><canvas id="trend-canvas"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-head"><div><h4>Top medicines</h4><p class="muted">By units sold this month</p></div></div>
        <div class="chart-body"><canvas id="top-canvas"></canvas></div>
      </div>
    </section>

    <!-- Activity + attention -->
    <section class="bottom-grid">
      <div class="panel">
        <div class="panel-head"><h4>Live staff activity</h4></div>
        <ul v-if="data.activity.length" class="activity-list">
          <li v-for="a in data.activity" :key="a.id" class="activity-item">
            <span class="activity-icon">{{ activityIcon(a.action) }}</span>
            <div class="activity-body">
              <div class="activity-line"><strong>{{ a.user_name || 'System' }}</strong> <span class="activity-action">{{ a.action.toLowerCase().replace('_',' ') }}</span> <span class="activity-entity">{{ a.entity }}</span></div>
              <div class="activity-time">{{ timeAgo(a.created_at) }}</div>
            </div>
          </li>
        </ul>
        <div v-else class="empty">No activity yet.</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h4>Stock attention</h4></div>
        <div v-if="data.lowStock.length" class="alert-list">
          <div v-for="m in data.lowStock" :key="m.id" class="alert-row">
            <span class="alert-icon">!</span>
            <div class="alert-info"><strong>{{ m.name }}</strong><small>{{ m.sku }} · reorder {{ m.reorder_level }}</small></div>
            <span class="pill red">{{ m.stock === 0 ? 'Out' : `${m.stock} left` }}</span>
          </div>
        </div>
        <div v-else class="empty">All products above reorder level.</div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.hero-block.owner { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; background: linear-gradient(135deg, #0d9c85, #078c78); color: #fff; border-radius: 16px; padding: 24px 28px; margin-bottom: 18px; }
.role-pill { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 10px; border-radius: 20px; margin-bottom: 10px; }
.hero-block h2 { font: 800 22px Manrope, sans-serif; margin: 0 0 6px; color: #fff; }
.hero-block .muted { color: rgba(255,255,255,0.85); font-size: 12px; margin: 0; max-width: 480px; line-height: 1.5; }
.hero-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mini-stat { background: rgba(255,255,255,0.14); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
.mini-stat .k { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
.mini-stat strong { font: 800 22px Manrope, sans-serif; }
.mini-stat .delta { font-size: 10px; opacity: 0.9; }
.kpi-grid.owner { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 14px; margin-bottom: 18px; }
.kpi.owner { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 18px 20px; }
.kpi.owner .kpi-head { display: flex; justify-content: space-between; font-size: 11px; color: #7b8d97; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
.kpi.owner .kpi-head i { font-style: normal; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: #e2f7ed; color: #078c78; font-size: 14px; }
.kpi.owner strong { display: block; font: 800 24px Manrope, sans-serif; color: #17384b; margin: 10px 0 4px; }
.kpi.owner small { font-size: 11px; color: #94a1a8; }
.kpi.owner-alert { border-color: #f0dfa8; background: #fff8e6; }
.kpi.owner-alert .kpi-head i { background: #fff4db; color: #a9791b; }
.kpi.danger { background: #fff; border: 1px solid #f5c6cb; }
.kpi.danger .kpi-head i { background: #ffebed; color: #c74956; }
.quick-actions.owner { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 10px; margin-bottom: 18px; }
.quick-action { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 12px; border: 1px solid #e5ecef; background: #fff; color: #244a5c; font-size: 13px; font-weight: 600; text-decoration: none; }
.quick-action.primary { background: linear-gradient(135deg,#078c78,#0d9c85); color: #fff; border-color: transparent; }
.charts { display: grid; grid-template-columns: 1.35fr 1fr; gap: 14px; margin-bottom: 18px; }
.chart-card { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 18px 20px 12px; }
.chart-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0 0 3px; }
.chart-body { height: 240px; }
.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; }
.panel-head { padding: 18px 20px 12px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0; }
.activity-list { list-style: none; margin: 0; padding: 8px 18px 12px; }
.activity-item { display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid #f0f3f4; }
.activity-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; background: #eef7ff; color: #1c7ed6; font-size: 14px; flex-shrink: 0; }
.activity-line { display: flex; gap: 6px; font-size: 12px; flex-wrap: wrap; }
.activity-action { color: #078c78; font-weight: 700; }
.activity-entity { color: #94a1a8; }
.activity-time { font-size: 10px; color: #94a1a8; margin-top: 3px; }
.alert-list { padding: 0 18px 12px; }
.alert-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-top: 1px solid #f0f3f4; }
.alert-icon { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: #fff0e1; color: #bf7d25; font-weight: 800; }
.alert-info { flex: 1; } .alert-info strong { display: block; font-size: 12px; } .alert-info small { font-size: 10px; color: #94a1a8; }
.pill.red { background: #ffebed; color: #c14956; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.empty { padding: 22px; text-align: center; color: #8b9ba3; font-size: 12px; }
.delta.up { color: #c8ffe8; } .delta.down { color: #ffd7dc; }
@media (max-width: 900px) { .hero-block.owner, .charts, .bottom-grid { grid-template-columns: 1fr; } }
/* Live pending panel */
.live-pending-panel {
  background: linear-gradient(135deg, #fff8e6, #fffbf0);
  border: 1px solid #f0dfa8;
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 18px;
  animation: slideIn 0.35s ease;
}
@keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.live-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.live-head h3 { font: 800 15px Manrope, sans-serif; color: #8a5a00; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
.live-head .muted { font-size: 12px; color: #7a6a3a; margin: 0; }
.pulse-dot {
  display: inline-block; width: 9px; height: 9px; border-radius: 50%;
  background: #e6a700; box-shadow: 0 0 0 0 rgba(230, 167, 0, 0.7);
  animation: pulse 1.8s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(230,167,0,0.7); }
  70% { box-shadow: 0 0 0 12px rgba(230,167,0,0); }
  100% { box-shadow: 0 0 0 0 rgba(230,167,0,0); }
}
.text-link { color: #8a5a00; font-size: 12px; font-weight: 700; text-decoration: none; }
.live-list { display: flex; flex-direction: column; gap: 10px; }
.live-row {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border: 1px solid #f0dfa8; border-radius: 12px; padding: 12px 16px;
}
.avatar-circle {
  width: 40px; height: 40px; border-radius: 50%;
  background: #fff4db; color: #a9791b; display: grid; place-items: center;
  font: 800 16px Manrope, sans-serif; flex-shrink: 0;
}
.live-info { flex: 1; min-width: 0; }
.live-info strong { display: block; font: 700 14px Manrope, sans-serif; color: #17384b; margin-bottom: 2px; }
.live-meta { font-size: 12px; color: #7d8e99; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-meta em { font-style: normal; font-weight: 700; color: #8a5a00; }
.live-actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-approve {
  background: #078c78; color: #fff; border: 0; border-radius: 8px;
  padding: 9px 16px; font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: inherit;
}
.btn-approve:hover { background: #067563; }
.btn-reject {
  background: #fff; color: #b8404b; border: 1px solid #f5c6cb; border-radius: 8px;
  padding: 9px 16px; font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: inherit;
}
.btn-reject:hover { background: #ffebed; }
@media (max-width: 700px) {
  .live-row { flex-wrap: wrap; }
  .live-actions { width: 100%; justify-content: flex-end; }
}
</style>
