<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();

const profile = ref(null);
const pharmacy = ref(null);
const error = ref('');
const notice = ref('');
const busy = ref(false);

// Password change
const currentPassword = ref('');
const newPassword = ref('');
const confirm = ref('');
const pwError = ref('');
const pwOk = ref('');

// Profile edit
const profileForm = ref({ name: '', job_title: '', license_number: '', phone: '' });

// Pharmacy edit (OWNER only)
const pharmacyForm = ref({
  name: '', legal_name: '', address: '', city: '', country: 'Rwanda',
  phone: '', email: '', license_number: '', tax_id: ''
});

// Avatar
const avatarFile = ref(null);
const avatarPreview = ref(null);
const avatarBusy = ref(false);

const isOwner = computed(() => auth.user?.role === 'OWNER');

const avatarUrl = computed(() => {
  if (!profile.value?.avatar_path) return null;
  const base = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || '';
  return `${base}/${profile.value.avatar_path}`;
});

async function loadProfile() {
  try {
    const r = await api.get('/profile');
    profile.value = r.data.user;
    pharmacy.value = r.data.pharmacy;
    profileForm.value = {
      name: r.data.user.name || '',
      job_title: r.data.user.job_title || '',
      license_number: r.data.user.license_number || '',
      phone: r.data.user.phone || ''
    };
    if (r.data.pharmacy) {
      pharmacyForm.value = { ...r.data.pharmacy };
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load profile.';
  }
}

async function saveProfile() {
  busy.value = true;
  notice.value = '';
  try {
    await api.patch('/profile', profileForm.value);
    notice.value = 'Profile updated.';
    await loadProfile();
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not update profile.';
  } finally { busy.value = false; }
}

async function savePharmacy() {
  busy.value = true;
  notice.value = '';
  try {
    const r = await api.patch('/pharmacy', pharmacyForm.value);
    pharmacy.value = r.data.pharmacy;
    notice.value = 'Pharmacy details updated.';
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not update pharmacy.';
  } finally { busy.value = false; }
}

async function changeOwnPassword() {
  pwError.value = '';
  pwOk.value = '';
  if (newPassword.value !== confirm.value) {
    pwError.value = 'New password and confirmation do not match.';
    return;
  }
  busy.value = true;
  try {
    await api.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    });
    currentPassword.value = newPassword.value = confirm.value = '';
    pwOk.value = 'Password changed successfully.';
  } catch (e) {
    pwError.value = e.response?.data?.error || 'Could not change password.';
  } finally { busy.value = false; }
}

function pickAvatar(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  avatarFile.value = f;
  avatarPreview.value = URL.createObjectURL(f);
}

async function uploadAvatar() {
  if (!avatarFile.value) return;
  avatarBusy.value = true;
  notice.value = '';
  try {
    const fd = new FormData();
    fd.append('avatar', avatarFile.value);
    await api.post('/profile/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    avatarFile.value = null;
    avatarPreview.value = null;
    notice.value = 'Profile picture updated.';
    await loadProfile();
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not upload picture.';
  } finally { avatarBusy.value = false; }
}

async function removeAvatar() {
  if (!confirm('Remove your profile picture?')) return;
  avatarBusy.value = true;
  try {
    await api.delete('/profile/avatar');
    notice.value = 'Profile picture removed.';
    await loadProfile();
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not remove picture.';
  } finally { avatarBusy.value = false; }
}

onMounted(loadProfile);
</script>

<template>
  <AppLayout>
    <template #title>Account</template>

    <div v-if="notice" class="notice">{{ notice }}</div>
    <div v-if="error" class="notice error-notice">{{ error }}</div>
    <div v-if="!profile" class="empty">Loading…</div>

    <template v-else>
      <!-- Identity / avatar card -->
      <section class="panel identity-card">
        <div class="avatar-block">
          <div class="avatar-lg">
            <img v-if="avatarPreview || avatarUrl" :src="avatarPreview || avatarUrl" alt="Profile picture">
            <span v-else class="initial">{{ profile.name.slice(0,1).toUpperCase() }}</span>
          </div>
          <div class="avatar-actions">
            <label class="upload-btn">
              <input type="file" accept="image/png,image/jpeg,image/webp" @change="pickAvatar" hidden>
              Choose picture
            </label>
            <button v-if="avatarPreview" class="primary" :disabled="avatarBusy" @click="uploadAvatar">
              {{ avatarBusy ? 'Uploading…' : 'Save picture' }}
            </button>
            <button v-if="profile.avatar_path" class="secondary" :disabled="avatarBusy" @click="removeAvatar">
              Remove
            </button>
            <p class="hint">PNG, JPEG or WebP · max 2 MB</p>
          </div>
        </div>

        <div class="identity-info">
          <h3>{{ profile.name }}</h3>
          <p class="muted">{{ profile.email }}</p>
          <div class="id-pills">
            <span class="pill role">{{ profile.role }}</span>
            <span v-if="profile.job_title" class="pill">{{ profile.job_title }}</span>
            <span v-if="profile.license_number" class="pill">Lic. {{ profile.license_number }}</span>
          </div>
          <p v-if="pharmacy" class="workplace">
            <strong>Works at:</strong> {{ pharmacy.name }}
            <span v-if="pharmacy.city"> · {{ pharmacy.city }}</span>
          </p>
        </div>
      </section>

      <!-- Profile details -->
      <section class="panel">
        <div class="panel-head"><h4>Your details</h4></div>
        <form @submit.prevent="saveProfile" class="form-body">
          <div class="form-grid">
            <div>
              <label>Full name</label>
              <input class="input" v-model="profileForm.name" required minlength="2">
            </div>
            <div>
              <label>Job title</label>
              <input class="input" v-model="profileForm.job_title" placeholder="e.g. Senior Pharmacist">
            </div>
            <div>
              <label>Professional license number</label>
              <input class="input" v-model="profileForm.license_number" placeholder="e.g. RPC-2024-00123">
            </div>
            <div>
              <label>Phone</label>
              <input class="input" v-model="profileForm.phone" type="tel" placeholder="+250 ...">
            </div>
          </div>
          <div class="form-actions">
            <button class="primary" :disabled="busy">Save details</button>
          </div>
        </form>
      </section>

      <!-- Pharmacy (OWNER only) -->
      <section v-if="isOwner" class="panel">
        <div class="panel-head">
          <h4>Pharmacy details</h4>
          <p class="muted">Shown on every user's profile and on printed receipts.</p>
        </div>
        <form @submit.prevent="savePharmacy" class="form-body">
          <div class="form-grid">
            <div>
              <label>Pharmacy name</label>
              <input class="input" v-model="pharmacyForm.name" required minlength="2">
            </div>
            <div>
              <label>Legal name (optional)</label>
              <input class="input" v-model="pharmacyForm.legal_name">
            </div>
            <div>
              <label>City</label>
              <input class="input" v-model="pharmacyForm.city">
            </div>
            <div>
              <label>Country</label>
              <input class="input" v-model="pharmacyForm.country">
            </div>
            <div class="span-2">
              <label>Address</label>
              <input class="input" v-model="pharmacyForm.address">
            </div>
            <div>
              <label>Pharmacy phone</label>
              <input class="input" v-model="pharmacyForm.phone" type="tel">
            </div>
            <div>
              <label>Pharmacy email</label>
              <input class="input" v-model="pharmacyForm.email" type="email">
            </div>
            <div>
              <label>License number</label>
              <input class="input" v-model="pharmacyForm.license_number">
            </div>
            <div>
              <label>Tax / TIN</label>
              <input class="input" v-model="pharmacyForm.tax_id">
            </div>
          </div>
          <div class="form-actions">
            <button class="primary" :disabled="busy">Save pharmacy</button>
          </div>
        </form>
      </section>

      <!-- Change password -->
      <section class="panel">
        <div class="panel-head"><h4>Change password</h4></div>
        <form @submit.prevent="changeOwnPassword" class="form-body">
          <div class="form-grid">
            <div class="span-2">
              <label>Current password</label>
              <input class="input" type="password" v-model="currentPassword" required>
            </div>
            <div>
              <label>New password</label>
              <input class="input" type="password" v-model="newPassword" required minlength="10">
            </div>
            <div>
              <label>Confirm new password</label>
              <input class="input" type="password" v-model="confirm" required minlength="10">
            </div>
          </div>
          <p v-if="pwError" class="error">{{ pwError }}</p>
          <p v-if="pwOk" class="ok">{{ pwOk }}</p>
          <div class="form-actions">
            <button class="primary" :disabled="busy">Update password</button>
          </div>
        </form>
      </section>
    </template>
  </AppLayout>
</template>

<style scoped>
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; margin-bottom: 18px; }
.panel-head { padding: 18px 20px 12px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0 0 3px; }
.panel-head .muted { font-size: 11px; margin: 0; }

.identity-card {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  padding: 24px;
  align-items: center;
}
@media (max-width: 720px) { .identity-card { grid-template-columns: 1fr; } }

.avatar-block { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.avatar-lg {
  width: 128px; height: 128px; border-radius: 50%;
  background: #e2f7ed;
  display: grid; place-items: center;
  overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 8px 24px rgba(15, 63, 85, 0.10);
}
.avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
.avatar-lg .initial { font: 800 44px Manrope, sans-serif; color: #078c78; }
.avatar-actions { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
.upload-btn {
  display: inline-block; text-align: center;
  background: #e9f5f2; color: #087b6b;
  border: 1px solid #d3ebe4; border-radius: 9px;
  padding: 9px 14px; font-size: 12px; font-weight: 700;
  cursor: pointer;
}
.upload-btn:hover { background: #d9ede8; }
.identity-info h3 { font: 800 22px Manrope, sans-serif; color: #17384b; margin: 0 0 4px; }
.identity-info .muted { font-size: 13px; margin: 0 0 10px; }
.id-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.pill {
  background: #f0f5f7; color: #4a5c68;
  font-size: 11px; font-weight: 700;
  padding: 4px 10px; border-radius: 20px;
}
.pill.role { background: #e2f7ed; color: #07836c; }
.workplace { font-size: 13px; color: #4a5c68; margin: 0; }
.workplace strong { color: #1c3a4c; }

.form-body { padding: 16px 20px 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-grid .span-2 { grid-column: span 2; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .form-grid .span-2 { grid-column: auto; } }
label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #354a58; }
.input {
  width: 100%; padding: 11px 13px; border: 1px solid #dce5e9;
  border-radius: 9px; font-size: 13px; color: #203645;
}
.input:focus { border-color: #0d9c85; box-shadow: 0 0 0 3px rgba(13, 156, 133, 0.08); outline: none; }
.form-actions { margin-top: 16px; display: flex; justify-content: flex-end; }
.error { color: #c43c4c; font-size: 12px; margin-top: 10px; }
.ok { color: #07836c; font-size: 12px; margin-top: 10px; }
.notice { margin: 0 0 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.error-notice { background: #ffebed; color: #b8404b; border-color: #f5c6cb; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 12px; }
</style>
