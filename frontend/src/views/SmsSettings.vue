<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import AppLayout from '../components/AppLayout.vue';

const loading = ref(true);
const busy = ref(false);
const notice = ref('');
const error = ref('');
const testPhone = ref('');
const testResult = ref(null);

const form = ref({
  SMS_PROVIDER: 'africastalking',
  AT_SANDBOX: 'false',
  AT_USERNAME: '',
  AT_API_KEY: '',
  AT_SENDER_ID: ''
});

const keyLength = ref(0);
const autoForm = ref({ auto_sms_reminders: true, sms_start_offset_minutes: 5 });

async function load() {
  loading.value = true;
  try {
    const r = await api.get('/settings/sms');
    form.value.SMS_PROVIDER = r.data.SMS_PROVIDER || 'africastalking';
    form.value.AT_SANDBOX = r.data.AT_SANDBOX || 'false';
    form.value.AT_USERNAME = r.data.AT_USERNAME || '';
    form.value.AT_SENDER_ID = r.data.AT_SENDER_ID || '';
    form.value.AT_API_KEY = ''; // never prefill
    keyLength.value = r.data.at_api_key_length || 0;
    try {
      const a = await api.get('/settings/auto-sms');
      autoForm.value = {
        auto_sms_reminders: !!a.data.auto_sms_reminders,
        sms_start_offset_minutes: a.data.sms_start_offset_minutes ?? 5
      };
    } catch {}
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load settings.';
  } finally { loading.value = false; }
}

async function save() {
  busy.value = true;
  notice.value = '';
  error.value = '';
  try {
    const payload = {
      SMS_PROVIDER: form.value.SMS_PROVIDER,
      AT_SANDBOX: form.value.AT_SANDBOX,
      AT_USERNAME: form.value.AT_USERNAME || null,
      AT_SENDER_ID: form.value.AT_SENDER_ID || null
    };
    if (form.value.AT_API_KEY && form.value.AT_API_KEY.trim().length > 10) {
      payload.AT_API_KEY = form.value.AT_API_KEY.trim();
    }
    await api.post('/settings/sms', payload);
    notice.value = 'Settings saved.';
    form.value.AT_API_KEY = '';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not save settings.';
  } finally { busy.value = false; }
}

async function saveAuto() {
  busy.value = true;
  notice.value = '';
  try {
    await api.post('/settings/auto-sms', autoForm.value);
    notice.value = 'Auto-send settings saved.';
  } catch (e) { error.value = e.response?.data?.error || 'Could not save.'; }
  finally { busy.value = false; }
}

async function testSms() {
  testResult.value = null;
  error.value = '';
  if (!testPhone.value.trim()) { error.value = 'Enter a phone number.'; return; }
  busy.value = true;
  try {
    const r = await api.post('/settings/sms/test', { to: testPhone.value.trim() });
    testResult.value = r.data;
    if (r.data.ok) notice.value = 'Test SMS sent successfully.';
  } catch (e) {
    testResult.value = { ok: false, error: e.response?.data?.error || 'Test failed.' };
  } finally { busy.value = false; }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <template #title>SMS Settings</template>

    <div v-if="notice" class="notice">{{ notice }}</div>
    <div v-if="error" class="notice error-notice">{{ error }}</div>
    <div v-if="loading" class="empty">Loading…</div>

    <template v-else>
      <section class="panel">
        <div class="panel-head">
          <h4>Africa's Talking credentials</h4>
          <p class="muted">Enter your production API key from africastalking.com → Settings → API Keys.</p>
        </div>
        <div class="form-body">
          <div class="status-row">
            <span class="status-label">Current API key:</span>
            <span v-if="keyLength >= 40" class="pill green">Set ({{ keyLength }} chars)</span>
            <span v-else class="pill red">Not set</span>
          </div>

          <label>SMS Provider</label>
          <select v-model="form.SMS_PROVIDER">
            <option value="africastalking">Africa's Talking (live)</option>
            <option value="console">Console (dev — writes to log, doesn't send)</option>
          </select>

          <label>Environment</label>
          <select v-model="form.AT_SANDBOX">
            <option value="false">Production (sends to real phones)</option>
            <option value="true">Sandbox (test only)</option>
          </select>

          <label>AT Username *</label>
          <input v-model="form.AT_USERNAME" placeholder="Your AT username (usually your signup email)" autocomplete="off">

          <label>AT API Key *</label>
          <input v-model="form.AT_API_KEY" type="password" placeholder="Paste new key here to change it. Leave blank to keep the current one." autocomplete="new-password">

          <label>Sender ID (optional)</label>
          <input v-model="form.AT_SENDER_ID" placeholder="Leave blank for AT default sender" autocomplete="off">

          <div class="actions">
            <button class="primary" :disabled="busy" @click="save">
              {{ busy ? 'Saving…' : 'Save settings' }}
            </button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h4>Send a test SMS</h4>
          <p class="muted">Confirm everything works before scheduling reminders.</p>
        </div>
        <div class="form-body">
          <label>Phone number to test</label>
          <input v-model="testPhone" type="tel" placeholder="+250788xxxxxx">
          <div class="actions">
            <button class="secondary" :disabled="busy" @click="testSms">
              {{ busy ? 'Sending…' : 'Send test SMS' }}
            </button>
          </div>

          <div v-if="testResult" class="test-result" :class="testResult.ok ? 'ok' : 'err'">
            <strong>{{ testResult.ok ? '✓ Test successful' : '✗ Test failed' }}</strong>
            <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
          </div>
        </div>
      </section>
    <!-- Auto-send reminders -->
      <section class="panel">
        <div class="panel-head">
          <h4>Automatic reminders</h4>
          <p class="muted">When a prescription is created for a patient with a phone number, schedule SMS automatically.</p>
        </div>
        <div class="form-body">
          <label class="toggle-label">
            <input type="checkbox" v-model="autoForm.auto_sms_reminders">
            <span>
              Send SMS reminders automatically
              <small>Every prescription with dosage text creates the reminders without any clicks.</small>
            </span>
          </label>

          <label>Start first dose this many minutes after the prescription is created</label>
          <input type="number" min="1" max="1440" v-model.number="autoForm.sms_start_offset_minutes">

          <div class="actions">
            <button class="primary" :disabled="busy" @click="saveAuto">
              {{ busy ? 'Saving…' : 'Save auto-send settings' }}
            </button>
          </div>
        </div>
      </section>
    </template>
  </AppLayout>
</template>

<style scoped>
.panel { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; overflow: hidden; margin-bottom: 20px; }
.panel-head { padding: 18px 22px 14px; border-bottom: 1px solid #eef4f6; }
.panel-head h4 { font: 700 14px Manrope, sans-serif; color: #1c3a4c; margin: 0 0 4px; }
.panel-head .muted { font-size: 12px; margin: 0; color: #7d8e99; }
.form-body { padding: 20px 22px 24px; display: flex; flex-direction: column; gap: 4px; }
label { font-size: 12px; font-weight: 700; color: #354a58; margin-top: 12px; margin-bottom: 6px; display: block; }
input, select { width: 100%; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 9px; font-size: 13px; font-family: inherit; background: #fff; }
input:focus, select:focus { outline: none; border-color: #0d9c85; box-shadow: 0 0 0 3px rgba(13,156,133,0.08); }
.status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.status-label { font-size: 12px; color: #7d8e99; }
.pill { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.red { background: #ffebed; color: #c14956; }
.actions { margin-top: 18px; display: flex; gap: 10px; }
.primary { border: 0; border-radius: 10px; padding: 11px 20px; font-size: 13px; font-weight: 700; background: #078c78; color: #fff; cursor: pointer; font-family: inherit; }
.primary:hover { background: #067563; }
.primary:disabled { opacity: 0.6; cursor: wait; }
.secondary { border: 1px solid #d3ebe4; background: #e9f5f2; color: #087b6b; border-radius: 10px; padding: 11px 20px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.secondary:disabled { opacity: 0.6; cursor: wait; }
.test-result { margin-top: 16px; padding: 14px 16px; border-radius: 10px; font-size: 13px; }
.test-result.ok { background: #e4f7ef; color: #087762; border: 1px solid #cceee1; }
.test-result.err { background: #ffebed; color: #b8404b; border: 1px solid #f5c6cb; }
.test-result pre { margin: 8px 0 0; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
.notice { margin: 15px 0; padding: 11px 14px; background: #e4f7ef; color: #087762; border: 1px solid #cceee1; border-radius: 9px; font-size: 12px; }
.error-notice { background: #ffebed; color: #b8404b; border-color: #f5c6cb; }
.empty { padding: 30px; text-align: center; color: #8b9ba3; font-size: 13px; }
.toggle-label { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; cursor: pointer; font-weight: 500; margin-top: 0; }
.toggle-label input[type="checkbox"] { width: 20px; height: 20px; margin: 2px 0 0; }
.toggle-label small { display: block; color: #94a1a8; font-size: 12px; font-weight: 400; margin-top: 4px; line-height: 1.5; }
</style>
