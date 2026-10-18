<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();
const list = ref([]);
const notice = ref('');
const busy = ref(false);
const showNew = ref(false);
const editing = ref(null);

const canWrite = computed(() => ['OWNER','PHARMACIST'].includes(auth.user?.role));

const emptyForm = () => ({
  code: '', name: '', contact_phone: '', contact_email: '',
  billing_model: 'SPLIT_AT_COUNTER', coverage_percent: 80,
  member_id_label: 'Member number', notes: '', active: true
});
const form = ref(emptyForm());

const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n || 0));

async function load() {
  try {
    const r = await api.get('/insurances');
    list.value = r.data;
  } catch (e) { notice.value = e.response?.data?.error || 'Could not load insurances.'; }
}

function openNew() { form.value = emptyForm(); editing.value = null; showNew.value = true; }
function openEdit(i) { form.value = { ...i }; editing.value = i.id; showNew.value = true; }

async function save() {
  busy.value = true;
  notice.value = '';
  try {
    const payload = {
      code: form.value.code.toUpperCase(),
      name: form.value.name,
      contact_phone: form.value.contact_phone || null,
      contact_email: form.value.contact_email || null,
      billing_model: form.value.billing_model,
      coverage_percent: Number(form.value.coverage_percent),
      member_id_label: form.value.member_id_label,
      notes: form.value.notes || null,
      active: !!form.value.active
    };
    if (editing.value) {
      await api.patch(`/insurances/${editing.value}`, payload);
      notice.value = 'Insurance updated.';
    } else {
      await api.post('/insurances', payload);
      notice.value = 'Insurance created.';
    }
    showNew.value = false;
    await load();
  } catch (e) { notice.value = e.response?.data?.error || 'Could not save.'; }
  finally { busy.value = false; }
}

async function toggleActive(i) {
  try {
    await api.patch(`/insurances/${i.id}`, { active: !i.active });
    notice.value = i.active ? 'Deactivated.' : 'Activated.';
    await load();
  } catch (e) { notice.value = e.response?.data?.error || 'Could not update.'; }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Insurances</template>

    <div v-if="notice" class="notice">{{ notice }}</div>

    <div class="toolbar">
      <div>
        <h3>Insurance providers</h3>
        <p class="muted">The insurance companies and schemes your clients use.</p>
      </div>
      <button v-if="canWrite" class="primary" @click="openNew">＋ Add insurance</button>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Billing</th><th>Coverage</th>
              <th>Member ID label</th><th>Contact</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in list" :key="i.id">
              <td><span class="code">{{ i.code }}</span></td>
              <td><strong>{{ i.name }}</strong></td>
              <td>{{ i.billing_model.replaceAll('_',' ').toLowerCase() }}</td>
              <td>{{ i.coverage_percent }}%</td>
              <td>{{ i.member_id_label }}</td>
              <td>
                <div v-if="i.contact_phone">📞 {{ i.contact_phone }}</div>
                <div v-if="i.contact_email" class="mono">{{ i.contact_email }}</div>
              </td>
              <td><span class="pill" :class="i.active ? 'green' : 'gray'">{{ i.active ? 'ACTIVE' : 'INACTIVE' }}</span></td>
              <td class="right">
                <button v-if="canWrite" class="secondary small" @click="openEdit(i)">Edit</button>
                <button v-if="canWrite" class="secondary small" @click="toggleActive(i)">
                  {{ i.active ? 'Deactivate' : 'Activate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!list.length" class="empty">No insurance providers yet. Add the ones you work with (RSSB, RAMA, MMI, or a private insurer).</div>
    </section>

    <div v-if="showNew" class="modal-backdrop" @click.self="showNew = false">
      <form class="modal" @submit.prevent="save">
        <div class="modal-title">
          <h3>{{ editing ? 'Edit insurance' : 'Add insurance' }}</h3>
          <button type="button" @click="showNew = false">×</button>
        </div>
        <div class="form-grid">
          <div>
            <label>Short code *</label>
            <input v-model="form.code" required maxlength="30" placeholder="e.g. RSSB" :disabled="!!editing">
          </div>
          <div>
            <label>Full name *</label>
            <input v-model="form.name" required placeholder="e.g. Rwanda Social Security Board">
          </div>
          <div>
            <label>Contact phone</label>
            <input v-model="form.contact_phone" type="tel">
          </div>
          <div>
            <label>Contact email</label>
            <input v-model="form.contact_email" type="email">
          </div>
          <div>
            <label>Billing model *</label>
            <select v-model="form.billing_model">
              <option value="SPLIT_AT_COUNTER">Patient pays copay · we bill insurer</option>
              <option value="INSURER_PAYS_ALL">Insurer pays everything</option>
              <option value="PATIENT_PAYS_ALL">Patient pays everything · they claim back</option>
            </select>
          </div>
          <div>
            <label>Default coverage (%) *</label>
            <input v-model.number="form.coverage_percent" type="number" min="0" max="100" step="0.01" required>
          </div>
          <div>
            <label>Member ID label</label>
            <input v-model="form.member_id_label" placeholder="e.g. Insurance number, Policy number, Member number">
          </div>
          <div>
            <label>Status</label>
            <select v-model="form.active">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </div>
          <div class="span-2">
            <label>Notes</label>
            <textarea v-model="form.notes" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="showNew = false">Cancel</button>
          <button class="primary" :disabled="busy">{{ editing ? 'Save' : 'Create' }}</button>
        </div>
      </form>
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
.code { font-family: ui-monospace, Menlo, monospace; background: #e2f7ed; color: #07836c; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #6c8290; }
.right { text-align: right; white-space: nowrap; }
.small { font-size: 11px; padding: 6px 10px; margin-left: 4px; }
.pill { display: inline-block; padding: 4px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.gray { background: #eef4f6; color: #6c8290; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 12px; }
.notice { margin-bottom: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.modal-backdrop { position: fixed; inset: 0; z-index: 5; background: rgba(16,45,64,0.6); display: grid; place-items: center; padding: 20px; overflow: auto; }
.modal { width: min(100%, 620px); background: #fff; border-radius: 16px; padding: 24px; max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-title h3 { font: 800 18px Manrope, sans-serif; color: #18384a; margin: 0; }
.modal-title button { border: 0; background: transparent; font-size: 24px; color: #7c8f99; cursor: pointer; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #354a58; }
input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .form-grid .span-2 { grid-column: auto; } }
</style>
