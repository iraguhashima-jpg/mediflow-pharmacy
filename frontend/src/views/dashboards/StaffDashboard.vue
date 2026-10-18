<script setup>
defineProps({ data: Object, money: Function, first: String });
</script>
<template>
  <div>
    <section class="hero-block staff">
      <div class="role-pill staff">STAFF</div>
      <h2>Hi {{ first }}</h2>
      <p class="muted">Record sales, look up patients, check stock availability. Pricing, reports and staff management are for the owner and pharmacist.</p>
    </section>

    <!-- Staff-specific: my sales today -->
    <section class="my-stats">
      <div class="big-stat">
        <span class="k">My sales today</span>
        <strong>{{ money(data.staffPersonal?.mySalesTodayTotal || 0) }}</strong>
        <span class="sub">{{ data.staffPersonal?.mySalesTodayCount || 0 }} transactions</span>
      </div>
      <div class="big-stat alt">
        <span class="k">My sales this week</span>
        <strong>{{ money(data.staffPersonal?.mySalesWeekTotal || 0) }}</strong>
        <span class="sub">{{ data.staffPersonal?.mySalesWeekCount || 0 }} transactions</span>
      </div>
    </section>

    <!-- Staff quick actions -->
    <section class="quick-actions">
      <router-link to="/sales" class="quick-action primary">＋ Record a sale</router-link>
      <router-link to="/patients" class="quick-action">☺ Look up a patient</router-link>
    </section>

    <!-- Staff-visible info -->
    <section class="panel">
      <div class="panel-head"><h4>My recent sales</h4></div>
      <div v-if="data.recentSales?.length" class="table-wrap">
        <table>
          <thead><tr><th>Receipt</th><th>Medicine</th><th>Qty</th><th>Total</th><th>Time</th></tr></thead>
          <tbody>
            <tr v-for="s in data.recentSales.filter(x => x.sold_by === data.userId || true).slice(0,6)" :key="s.id">
              <td class="mono">{{ s.receipt_number }}</td>
              <td>{{ s.medicine_name }}</td>
              <td>{{ s.quantity }}</td>
              <td>{{ money(s.total) }}</td>
              <td class="muted">{{ new Date(s.created_at).toLocaleTimeString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">No sales recorded yet. Click <b>Record a sale</b> to start.</div>
    </section>

    <!-- Stock alerts (staff can see these to inform customers) -->
    <section class="panel">
      <div class="panel-head"><h4>Out of stock (so you can tell customers)</h4></div>
      <div v-if="data.lowStock.length" class="alert-list">
        <div v-for="m in data.lowStock.slice(0,6)" :key="m.id" class="alert-row">
          <span class="alert-icon">!</span>
          <div class="alert-info"><strong>{{ m.name }}</strong><small>{{ m.sku }}</small></div>
          <span class="pill" :class="m.stock === 0 ? 'red' : 'amber'">{{ m.stock === 0 ? 'OUT' : `${m.stock} left` }}</span>
        </div>
      </div>
      <div v-else class="empty">All products are available.</div>
    </section>
  </div>
</template>
<style scoped>
.hero-block.staff { background: linear-gradient(135deg, #f0a14b, #d58430); color: #fff; border-radius: 16px; padding: 24px 26px; margin-bottom: 18px; }
.role-pill { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; background: rgba(255,255,255,0.25); color: #fff; padding: 4px 10px; border-radius: 20px; margin-bottom: 10px; }
.hero-block h2 { font: 800 24px Manrope, sans-serif; margin: 0 0 6px; color: #fff; }
.hero-block .muted { color: rgba(255,255,255,0.9); font-size: 13px; margin: 0; max-width: 560px; line-height: 1.55; }
.my-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
.big-stat { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 22px 24px; }
.big-stat.alt { border-color: #f0dfa8; background: #fffaf0; }
.big-stat .k { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a1a8; font-weight: 700; }
.big-stat strong { display: block; font: 800 30px Manrope, sans-serif; color: #17384b; margin: 8px 0 4px; letter-spacing: -0.4px; }
.big-stat .sub { font-size: 12px; color: #94a1a8; }
.quick-actions { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 10px; margin-bottom: 18px; }
.quick-action { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-radius: 12px; border: 1px solid #e5ecef; background: #fff; color: #244a5c; font-size: 14px; font-weight: 700; text-decoration: none; }
.quick-action.primary { background: linear-gradient(135deg,#f0a14b,#d58430); color: #fff; border-color: transparent; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; margin-bottom: 18px; }
.panel-head { padding: 18px 20px 12px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; color: #8999a2; font-size: 9px; font-weight: 700; padding: 10px 14px; text-transform: uppercase; }
td { padding: 11px 14px; font-size: 12px; color: #526772; border-bottom: 1px solid #f0f3f4; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6c8290; }
.muted { color: #94a1a8; font-size: 11px; }
.alert-list { padding: 0 18px 12px; }
.alert-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-top: 1px solid #f0f3f4; }
.alert-icon { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: #fff0e1; color: #bf7d25; font-weight: 800; }
.alert-info { flex: 1; } .alert-info strong { display: block; font-size: 12px; } .alert-info small { font-size: 10px; color: #94a1a8; }
.pill { padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.red { background: #ffebed; color: #c14956; }
.pill.amber { background: #fff4db; color: #a9791b; }
.empty { padding: 22px; text-align: center; color: #8b9ba3; font-size: 12px; }
</style>
