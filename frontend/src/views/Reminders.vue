<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import AppLayout from '../components/AppLayout.vue';

const reminders = ref([]);
const loading = ref(true);

async function load() {
  try {
    const r = await api.get('/reminders');
    reminders.value = r.data;
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Reminders</template>
    <div class="toolbar">
      <div><h3>SMS Reminders</h3><p class="muted">Automated messages sent to patients to remind them to take their medicine.</p></div>
    </div>

    <div v-if="loading" class="empty">Loading…</div>
    <section v-else class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Patient</th><th>Medicine</th><th>Phone</th><th>Schedule</th><th>Progress</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in reminders" :key="r.id">
              <td><strong>{{ r.patient_name }}</strong></td>
              <td>{{ r.medicine_name }}</td>
              <td class="mono">{{ r.phone }}</td>
              <td>
                Every {{ r.interval_minutes / 60 }}h<br>
                <small class="muted">Starts {{ new Date(r.first_dose_at).toLocaleString() }}</small>
              </td>
              <td>{{ r.doses_sent }} / {{ r.total_doses }} sent</td>
              <td><span class="pill" :class="r.status === 'ACTIVE' ? 'green' : 'gray'">{{ r.status }}</span></td>
            </tr>
            <tr v-if="!reminders.length"><td colspan="6" class="empty">No reminders scheduled yet. Go to a Prescription to add one.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </AppLayout>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; padding: 12px 16px; font-size: 11px; color: #7d8e99; text-transform: uppercase; border-bottom: 1px solid #edf1f3; }
td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid #f0f3f4; }
.mono { font-family: monospace; font-size: 12px; }
.pill { padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.gray { background: #eef4f6; color: #6c8290; }
.muted { color: #94a1a8; font-size: 11px; }
.empty { padding: 30px; text-align: center; color: #8b9ba3; }
</style>
