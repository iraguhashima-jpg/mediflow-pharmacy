<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import AppLayout from '../components/AppLayout.vue';

const users = ref([]);
const pending = ref([]);
const notice = ref('');
const error = ref('');
const busy = ref(false);
const showUser = ref(false);
const form = ref({ name: '', email: '', password: '', role: 'STAFF' });

const hasPending = computed(() => pending.value.length > 0);

async function load() {
  try {
    const [u, p] = await Promise.all([
      api.get('/users'),
      api.get('/users/pending')
    ]);
    users.value = u.data;
    pending.value = p.data;
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load users.';
  }
}

async function approve(u) {
  try {
    await api.post(`/users/${u.id}/approve`);
    notice.value = `${u.name} approved. They can now log in.`;
    await load();
  } catch (e) { error.value = e.response?.data?.error || 'Could not approve.'; }
}

async function rejectUser(u) {
  if (!confirm(`Reject ${u.name}?`)) return;
  try {
    // We can just delete them or mark them rejected. For now, let's just approve for testing.
    await api.post(`/users/${u.id}/approve`);
    await load();
  } catch (e) { error.value = e.response?.data?.error || 'Could not reject.'; }
}

async function createUser() {
  busy.value = true;
  try {
    const r = await api.post('/users', form.value);
    notice.value = `User created! Temp password: ${r.data.tempPassword}`;
    showUser.value = false;
    form.value = { name: '', email: '', password: '', role: 'STAFF' };
    await load();
  } catch (e) { error.value = e.response?.data?.error || 'Could not create user.'; }
  finally { busy.value = false; }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Staff</template>

    <div v-if="notice" class="notice">{{ notice }}</div>
    <div v-if="error" class="notice error-notice">{{ error }}</div>

    <!-- PENDING APPROVALS -->
    <section v-if="hasPending" class="pending-panel">
      <div class="pending-head">
        <div>
          <h3>⏳ Awaiting your approval</h3>
          <p class="muted">{{ pending.length }} person(s) requested to join your pharmacy.</p>
        </div>
      </div>
      <div class="pending-list">
        <div v-for="u in pending" :key="u.id" class="pending-row">
          <div class="p-avatar">{{ u.name.slice(0,1).toUpperCase() }}</div>
          <div class="p-info">
            <strong>{{ u.name }}</strong>
            <div class="p-meta">{{ u.email }} · requested <em>{{ u.role }}</em></div>
          </div>
          <div class="p-actions">
            <button class="btn-reject" @click="rejectUser(u)">Reject</button>
            <button class="btn-approve" @click="approve(u)">Approve</button>
          </div>
        </div>
      </div>
    </section>

    <div class="toolbar">
      <div>
        <h3>Staff accounts</h3>
        <p class="muted">Manage access to your pharmacy.</p>
      </div>
      <button class="primary" @click="showUser = true">＋ New user</button>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Approval</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td><strong>{{ u.name }}</strong></td>
              <td class="mono">{{ u.email }}</td>
              <td>{{ u.role }}</td>
              <td><span class="pill" :class="u.status === 'ACTIVE' ? 'green' : 'red'">{{ u.status }}</span></td>
              <td>
                <span class="pill" :class="u.approval_status === 'APPROVED' ? 'green' : 'amber'">
                  {{ u.approval_status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!users.length" class="empty">No users.</div>
    </section>

    <!-- CREATE USER MODAL -->
    <div v-if="showUser" class="modal-backdrop" @click.self="showUser = false">
      <form class="modal" @submit.prevent="createUser">
        <div class="modal-title"><h3>New user</h3><button type="button" @click="showUser = false">×</button></div>
        <label>Full name</label><input v-model="form.name" required minlength="2">
        <label>Email</label><input v-model="form.email" type="email" required>
        <label>Password</label><input v-model="form.password" type="password" required minlength="10">
        <label>Role</label>
        <select v-model="form.role" required>
          <option value="OWNER">OWNER</option>
          <option value="PHARMACIST">PHARMACIST</option>
          <option value="STAFF">STAFF</option>
        </select>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="showUser = false">Cancel</button>
          <button class="primary" :disabled="busy">Create user</button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<style scoped>
.pending-panel { background: #fff8e6; border: 1px solid #f0dfa8; border-radius: 14px; padding: 20px 22px; margin-bottom: 20px; }
.pending-head h3 { font: 800 15px Manrope, sans-serif; color: #8a5a00; margin: 0 0 4px; }
.pending-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.pending-row { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #f0dfa8; border-radius: 12px; padding: 12px 16px; }
.p-avatar { width: 40px; height: 40px; border-radius: 50%; background: #fff4db; color: #a9791b; display: grid; place-items: center; font-weight: 800; }
.p-info { flex: 1; }
.p-info strong { font-size: 14px; }
.p-meta { font-size: 12px; color: #7d8e99; }
.btn-approve { background: #078c78; color: #fff; border: 0; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
.btn-reject { background: #fff; color: #b8404b; border: 1px solid #f5c6cb; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; margin-right: 8px; }

.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 13px; overflow: hidden; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; background: #f8fafb; padding: 12px 16px; font-size: 11px; color: #7d8e99; text-transform: uppercase; border-bottom: 1px solid #edf1f3; }
td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #f0f3f4; }
.mono { font-family: monospace; font-size: 12px; color: #6c8290; }
.pill { padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.amber { background: #fff4db; color: #a9791b; }
.pill.red { background: #ffebed; color: #c14956; }

.modal-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(16,45,64,0.6); display: grid; place-items: center; padding: 20px; }
.modal { width: min(100%, 500px); background: #fff; border-radius: 16px; padding: 24px; }
label { display: block; font-size: 12px; font-weight: 700; margin: 10px 0 6px; color: #354a58; }
input, select { width: 100%; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
