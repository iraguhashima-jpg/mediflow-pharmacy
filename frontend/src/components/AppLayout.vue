<script setup>
import { computed, watch, nextTick, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const NAV = [
  { name: 'dashboard',       label: 'Home',           icon: '▦' },
  { name: 'sales',           label: 'Sales',          icon: '↗', roles: ['OWNER','PHARMACIST','STAFF'] },
  { name: 'patients',        label: 'Patients',       icon: '☺', roles: ['OWNER','PHARMACIST','STAFF'] },
  { name: 'prescriptions',   label: 'Prescriptions',  icon: '℞', roles: ['OWNER','PHARMACIST'] },
  { name: 'reminders',       label: 'Reminders',      icon: '✉', roles: ['OWNER','PHARMACIST'] },
  { name: 'medicines',       label: 'Medicines',      icon: '▤', roles: ['OWNER','PHARMACIST'] },
  { name: 'inventory',       label: 'Inventory',      icon: '▣', roles: ['OWNER','PHARMACIST'] },
  { name: 'reports',         label: 'Reports',        icon: '▥', roles: ['OWNER','PHARMACIST'] },
  { name: 'insurances',      label: 'Insurances',     icon: '☂', roles: ['OWNER'] },
  { name: 'insuranceClaims', label: 'Claims',         icon: '⎙', roles: ['OWNER','PHARMACIST'] },
  { name: 'users',           label: 'Staff',          icon: '◉', roles: ['OWNER'] },
  { name: 'pharmacy',        label: 'Pharmacy',       icon: '⚕', roles: ['OWNER'] },
  { name: 'account',         label: 'Account',        icon: '⚙' }
];

const visibleNav = computed(() => NAV.filter((n) => !n.roles || n.roles.includes(auth.user?.role)));

// --- Notification Bell Logic ---
const alerts = ref([]);
const showNotifications = ref(false);
let alertTimer = null;

async function loadAlerts() {
  try {
    const r = await api.get('/alerts');
    alerts.value = r.data;
  } catch (e) { alerts.value = []; }
}

onMounted(() => {
  loadAlerts();
  alertTimer = setInterval(loadAlerts, 30000); // Refresh every 30s
});

onBeforeUnmount(() => {
  if (alertTimer) clearInterval(alertTimer);
});

function toggleNotifications() {
  showNotifications.value = !showNotifications.value;
}

function avatarBase(p) {
  const base = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || '';
  return base + '/' + p;
}

async function logout() {
  await auth.logout();
  router.push({ name: 'login' });
}

// Scroll to top on page change
watch(() => route.fullPath, async () => {
  await nextTick();
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.querySelectorAll('.main, .app-shell, body, html').forEach((el) => {
    if (el) el.scrollTop = 0;
  });
});
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark small">✚</span>
        <div><strong>MediFlow</strong><small>PHARMACY</small></div>
      </div>
      <p class="side-label">WORKSPACE</p>
      <div class="role-chip" :class="auth.user?.role?.toLowerCase()">{{ auth.user?.role }}</div>

      <router-link
        v-for="n in visibleNav"
        :key="n.name"
        :to="{ name: n.name }"
        class="nav-item"
        active-class="active">
        <span>{{ n.icon }}</span>{{ n.label }}
      </router-link>

      <div class="sidebar-bottom">
        <div class="profile-dot">
          <img v-if="auth.user?.avatar_path" :src="avatarBase(auth.user.avatar_path)" alt="">
          <span v-else>{{ auth.user?.name?.slice(0, 1) }}</span>
        </div>
        <div class="profile-text">
          <strong>{{ auth.user?.name }}</strong>
          <small>{{ auth.user?.pharmacy_name || auth.user?.role }}</small>
        </div>
        <button class="logout" title="Sign out" @click="logout">↪</button>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <p class="eyebrow">PHARMACY MANAGEMENT</p>
          <h2><slot name="title">Workspace</slot></h2>
        </div>
        
        <div class="top-right">
          <!-- NOTIFICATION BELL -->
          <div class="notif-wrapper">
            <button class="notif-bell" @click="toggleNotifications" :class="{ 'has-alerts': alerts.length > 0 }">
              🔔
              <span v-if="alerts.length > 0" class="notif-badge">{{ alerts.length }}</span>
            </button>
            
            <div v-if="showNotifications" class="notif-dropdown">
              <div class="notif-head">
                <strong>Patient Alerts</strong>
                <button @click="showNotifications = false">×</button>
              </div>
              <div v-if="alerts.length === 0" class="notif-empty">No new alerts.</div>
              <div v-for="(a, i) in alerts" :key="i" class="notif-item">
                <div class="notif-title"><strong>{{ a.patient_name }}</strong> ({{ a.medicine_name }})</div>
                <div class="notif-body">"{{ a.patient_side_effects }}"</div>
              </div>
            </div>
          </div>

          <span class="status-dot"></span><span>System online</span>
          <div class="avatar">
            <img v-if="auth.user?.avatar_path" :src="avatarBase(auth.user.avatar_path)" alt="">
            <span v-else>{{ auth.user?.name?.slice(0, 1) }}</span>
          </div>
        </div>
      </header>

      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell { min-height: 100vh; display: flex; }
.sidebar {
  width: 230px; background: #102d40; color: #b7c9d2; padding: 24px 15px;
  display: flex; flex-direction: column; flex-shrink: 0;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 20px; color: #fff; }
.brand strong { display: block; font: 800 16px Manrope, sans-serif; letter-spacing: -0.5px; }
.brand small { font-size: 9px; letter-spacing: 2px; color: #8aa6b3; }
.side-label { font-size: 9px; letter-spacing: 1.5px; color: #72909e; font-weight: 800; padding: 0 13px; margin-bottom: 8px; }
.role-chip {
  display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 1px;
  padding: 4px 10px; border-radius: 12px; margin: 0 13px 12px;
  text-transform: uppercase; width: fit-content;
}
.role-chip.owner { background: #0d9c85; color: #fff; }
.role-chip.pharmacist { background: #1c7ed6; color: #fff; }
.role-chip.staff { background: #f0a14b; color: #fff; }
.nav-item {
  display: flex; align-items: center; gap: 12px; width: 100%;
  color: #adc1cb; padding: 11px 13px; border-radius: 9px; text-align: left;
  font-size: 12px; margin: 2px 0; text-decoration: none;
}
.nav-item span { width: 18px; text-align: center; font-size: 16px; }
.nav-item:hover, .nav-item.active { background: #1d4555; color: #fff; }
.nav-item.active { box-shadow: inset 3px 0 #24c6a5; }
.sidebar-bottom {
  margin-top: auto; padding: 20px 5px 0; border-top: 1px solid #284858;
  display: flex; align-items: center; gap: 9px;
}
.profile-dot, .avatar {
  width: 34px; height: 34px; display: grid; place-items: center;
  border-radius: 50%; background: #d4f1e6; color: #087a69; font-weight: 800;
  overflow: hidden;
}
.profile-dot img, .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.profile-text { min-width: 0; flex: 1; }
.profile-text strong, .profile-text small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-text strong { font-size: 11px; color: white; }
.profile-text small { font-size: 10px; color: #86a1ae; margin-top: 4px; }
.logout { border: 0; background: transparent; color: #a7c0ca; font-size: 20px; cursor: pointer; }
.main { flex: 1; min-width: 0; padding: 0 32px 40px; max-width: 1800px; margin: auto; }
.topbar {
  height: 94px; border-bottom: 1px solid #e5ecef;
  display: flex; justify-content: space-between; align-items: center;
}
.topbar .eyebrow { margin: 0 0 4px; font-size: 9px; }
.topbar h2 { font: 800 23px Manrope, sans-serif; color: #15364a; margin: 0; }
.top-right { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #7c8f99; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #17b890; }
.avatar { margin-left: 4px; width: 32px; height: 32px; }

/* Notification Bell */
.notif-wrapper { position: relative; margin-right: 12px; }
.notif-bell { background: none; border: none; font-size: 20px; cursor: pointer; position: relative; padding: 4px; }
.notif-bell.has-alerts { animation: swing 1s infinite alternate; }
@keyframes swing { from { transform: rotate(10deg); } to { transform: rotate(-10deg); } }
.notif-badge { position: absolute; top: -2px; right: -4px; background: #e63946; color: white; font-size: 10px; font-weight: 800; padding: 2px 5px; border-radius: 10px; }
.notif-dropdown { position: absolute; top: 40px; right: 0; width: 320px; background: white; border: 1px solid #e5ecef; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 100; overflow: hidden; }
.notif-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafb; border-bottom: 1px solid #e5ecef; }
.notif-head strong { color: #c53030; font-size: 13px; }
.notif-head button { border: none; background: none; font-size: 18px; cursor: pointer; color: #7d8e99; }
.notif-empty { padding: 16px; text-align: center; font-size: 12px; color: #94a1a8; }
.notif-item { padding: 12px 16px; border-bottom: 1px solid #f0f3f4; }
.notif-item:last-child { border-bottom: none; }
.notif-title { font-size: 12px; color: #333; margin-bottom: 4px; }
.notif-body { font-size: 12px; color: #c53030; font-style: italic; background: #fff5f5; padding: 6px 10px; border-radius: 6px; }

@media (max-width: 900px) {
  .sidebar { width: 190px; }
  .main { padding: 0 20px 30px; }
}
@media (max-width: 640px) {
  .app-shell { display: block; }
  .sidebar { width: 100%; padding: 12px; }
  .side-label, .sidebar-bottom, .role-chip { display: none; }
  .nav-item { display: inline-flex; width: auto; padding: 9px 10px; margin: 0 2px; }
  .main { padding: 0 13px 25px; }
  .top-right span:not(.status-dot) { display: none; }
}
</style>
