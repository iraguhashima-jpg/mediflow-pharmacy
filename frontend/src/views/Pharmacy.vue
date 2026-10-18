<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();

const pharmacy = ref(null);
const error = ref('');
const notice = ref('');
const busy = ref(false);

const form = ref({
  name: '', legal_name: '', address: '', city: '', country: 'Rwanda',
  phone: '', email: '', license_number: '', tax_id: '',
  slug: '', patient_self_registration: false
});

const isOwner = computed(() => auth.user?.role === 'OWNER');

const publicLink = computed(() => {
  if (!form.value.slug) return '';
  const origin = window.location.origin;
  return `${origin}/register-client/${form.value.slug}`;
});

async function load() {
  try {
    const r = await api.get('/pharmacy');
    pharmacy.value = r.data.pharmacy;
    if (r.data.pharmacy) {
      form.value = {
        name: r.data.pharmacy.name || '',
        legal_name: r.data.pharmacy.legal_name || '',
        address: r.data.pharmacy.address || '',
        city: r.data.pharmacy.city || '',
        country: r.data.pharmacy.country || 'Rwanda',
        phone: r.data.pharmacy.phone || '',
        email: r.data.pharmacy.email || '',
        license_number: r.data.pharmacy.license_number || '',
        tax_id: r.data.pharmacy.tax_id || '',
        slug: r.data.pharmacy.slug || '',
        patient_self_registration: !!r.data.pharmacy.patient_self_registration
      };
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load pharmacy.';
  }
}

function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function autoSlug() {
  if (!form.value.slug) form.value.slug = slugify(form.value.name);
}

async function save() {
  busy.value = true;
  notice.value = '';
  error.value = '';
  try {
    const payload = {
      name: form.value.name,
      legal_name: form.value.legal_name || null,
      address: form.value.address || null,
      city: form.value.city || null,
      country: form.value.country || 'Rwanda',
      phone: form.value.phone || null,
      email: form.value.email || null,
      license_number: form.value.license_number || null,
      tax_id: form.value.tax_id || null,
      slug: form.value.slug || null,
      patient_self_registration: !!form.value.patient_self_registration
    };
    const r = await api.patch('/pharmacy', payload);
    pharmacy.value = r.data.pharmacy;
    notice.value = 'Pharmacy details saved.';
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not save.';
  } finally {
    busy.value = false;
  }
}

function copyLink() {
  navigator.clipboard.writeText(publicLink.value);
  notice.value = 'Client registration link copied.';
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>Pharmacy</template>

    <div v-if="notice" class="notice">{{ notice }}</div>
    <div v-if="error" class="notice error-notice">{{ error }}</div>
    <div v-if="!pharmacy && !error" class="empty">Loading…</div>

    <template v-if="pharmacy">
      <section class="panel identity-card">
        <div class="brandmark"><span class="brand-mark small">✚</span></div>
        <div>
          <h3>{{ pharmacy.name }}</h3>
          <p class="muted">
            <span v-if="pharmacy.city">{{ pharmacy.city }}</span>
            <span v-if="pharmacy.city && pharmacy.country"> · </span>
            <span v-if="pharmacy.country">{{ pharmacy.country }}</span>
            <span v-if="pharmacy.license_number"> · Lic. {{ pharmacy.license_number }}</span>
          </p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h4>Details</h4></div>
        <form @submit.prevent="save" class="form-body">
          <div class="form-grid">
            <div class="span-2">
              <label>Pharmacy name *</label>
              <input v-model="form.name" required minlength="2" :disabled="!isOwner" @blur="autoSlug">
            </div>
            <div><label>Legal name</label><input v-model="form.legal_name" :disabled="!isOwner"></div>
            <div><label>City</label><input v-model="form.city" :disabled="!isOwner"></div>
            <div><label>Country</label><input v-model="form.country" :disabled="!isOwner"></div>
            <div><label>License number</label><input v-model="form.license_number" :disabled="!isOwner"></div>
            <div class="span-2"><label>Address</label><input v-model="form.address" :disabled="!isOwner"></div>
            <div><label>Phone</label><input v-model="form.phone" type="tel" :disabled="!isOwner"></div>
            <div><label>Email</label><input v-model="form.email" type="email" :disabled="!isOwner"></div>
            <div><label>Tax / TIN</label><input v-model="form.tax_id" :disabled="!isOwner"></div>
            <div>
              <label>URL slug</label>
              <input v-model="form.slug" :disabled="!isOwner" placeholder="e.g. kigali-community-pharmacy">
              <p class="hint">Lowercase letters, numbers and hyphens only. Used in your public client-registration link.</p>
            </div>
          </div>

          <div class="toggle-block" v-if="isOwner">
            <label class="toggle">
              <input type="checkbox" v-model="form.patient_self_registration">
              <span>
                Allow clients to self-register online
                <small>When enabled, anyone with the link below can add themselves to your patient list.</small>
              </span>
            </label>
          </div>

          <div class="form-actions">
            <button v-if="isOwner" class="primary" :disabled="busy">Save</button>
            <p v-else class="muted" style="font-size:12px">Only the OWNER can edit pharmacy details.</p>
          </div>
        </form>
      </section>

      <section v-if="isOwner && form.slug" class="panel">
        <div class="panel-head"><h4>Client registration link</h4></div>
        <div class="form-body">
          <p class="muted">Share this link with clients so they can register themselves with {{ form.name }}.</p>
          <div class="link-row">
            <input :value="publicLink" readonly>
            <button class="secondary" type="button" @click="copyLink">Copy</button>
            <a class="secondary" :href="publicLink" target="_blank" rel="noopener">Open</a>
          </div>
          <p class="hint" v-if="!form.patient_self_registration">
            Currently disabled — turn on "Allow clients to self-register" above to activate this link.
          </p>
        </div>
      </section>
    </template>
  </AppLayout>
</template>

<style scoped>
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
.identity-card { display: grid; grid-template-columns: 60px 1fr; gap: 16px; padding: 20px; align-items: center; }
.brandmark { display: grid; place-items: center; width: 56px; height: 56px; background: #e2f7ed; color: #078c78; border-radius: 14px; font-size: 26px; }
.identity-card h3 { font: 800 20px Manrope, sans-serif; color: #17384b; margin: 0 0 4px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
.panel-head { padding: 18px 20px 12px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 13px Manrope, sans-serif; color: #1c3a4c; margin: 0; }
.form-body { padding: 16px 20px 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #354a58; }
input { width: 100%; padding: 10px 12px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; }
input:disabled { background: #f5f8fa; color: #6c8290; }
.hint { font-size: 11px; color: #94a1a8; margin-top: 6px; }
.toggle-block { margin-top: 14px; padding: 14px; background: #f8fafb; border-radius: 10px; }
.toggle { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; font-size: 13px; }
.toggle input { width: 18px; height: 18px; margin-top: 2px; }
.toggle small { display: block; color: #94a1a8; font-size: 11px; margin-top: 4px; font-weight: 400; }
.form-actions { display: flex; justify-content: flex-end; align-items: center; margin-top: 14px; gap: 12px; }
.link-row { display: flex; gap: 8px; margin-top: 10px; }
.link-row input { flex: 1; font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
.link-row a { text-decoration: none; }
.notice { margin-bottom: 15px; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.error-notice { background: #ffebed; color: #b8404b; border-color: #f5c6cb; }
.empty { padding: 25px; text-align: center; color: #8b9ba3; font-size: 12px; }
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-grid .span-2 { grid-column: auto; }
  .link-row { flex-wrap: wrap; }
}
</style>
