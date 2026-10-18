<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';

const route = useRoute();
const token = route.params.token;
const patient = ref(null);
const prescriptions = ref([]);
const loading = ref(true);
const error = ref('');
const feedbackState = ref({});

async function load() {
  try {
    const [p, pr] = await Promise.all([
      api.get(`/patient-portal/${token}`),
      api.get(`/patient-portal/${token}/prescriptions`)
    ]);
    patient.value = p.data.patient;
    prescriptions.value = pr.data.prescriptions;
    
    // Initialize feedback state
    prescriptions.value.forEach(pr => {
      pr.items.forEach(it => {
        feedbackState.value[it.id] = { is_taking: it.patient_is_taking, side_effects: it.patient_side_effects || '', saving: false, saved: false };
      });
    });
  } catch (e) {
    error.value = e.response?.data?.error || 'This link is invalid or has been revoked.';
  } finally {
    loading.value = false;
  }
}

async function submitFeedback(itemId) {
  const state = feedbackState.value[itemId];
  state.saving = true;
  state.saved = false;
  try {
    await api.post(`/patient-portal/${token}/feedback`, {
      item_id: itemId,
      is_taking: state.is_taking,
      side_effects: state.side_effects
    });
    state.saved = true;
    setTimeout(() => state.saved = false, 3000);
  } catch (e) {
    alert('Could not save feedback. Please try again.');
  } finally {
    state.saving = false;
  }
}

function statusClass(s) {
  return s === 'DISPENSED' ? 'green' : s === 'CANCELLED' ? 'gray' : 'amber';
}

onMounted(load);
</script>

<template>
  <div class="portal">
    <header class="portal-head">
      <div class="brand"><span class="brand-mark small">✚</span><div><strong>MediFlow</strong><small>PATIENT PORTAL</small></div></div>
    </header>
    <main class="portal-main">
      <div v-if="loading" class="empty">Loading…</div>
      <div v-else-if="error" class="error-card"><h2>Link not available</h2><p>{{ error }}</p></div>
      <template v-else>
        <section class="welcome-card">
          <h1>Hello, {{ patient.full_name.split(' ')[0] }}</h1>
          <p class="muted">This is your personal page from <strong>{{ patient.pharmacy_name }}</strong>. Below you can see your prescriptions and tell your pharmacist how you are doing.</p>
        </section>
        
        <section class="prescriptions-section">
          <h2>Your prescriptions</h2>
          <article v-for="pr in prescriptions" :key="pr.id" class="prescription-card">
            <header class="pr-head">
              <div><h3>Prescription #{{ pr.id }}</h3><p class="muted">Issued {{ pr.issued_at }}</p></div>
              <span class="pill" :class="statusClass(pr.status)">{{ pr.status }}</span>
            </header>
            
            <div class="medicines">
              <div v-for="it in pr.items" :key="it.id" class="medicine-item">
                <div class="med-head">
                  <strong>{{ it.medicine_full_name || it.medicine_name }}</strong>
                  <span class="qty">{{ it.quantity }} units</span>
                </div>
                <div class="med-dosage">
                  <span class="dosage-icon">◷</span>
                  <span><strong>How to take:</strong> {{ it.dosage || 'As directed by your pharmacist' }}</span>
                </div>
                
                <!-- PATIENT FEEDBACK FORM -->
                <div class="feedback-box">
                  <p class="fb-title">Are you taking this medicine?</p>
                  <div class="fb-radios">
                    <label><input type="radio" :value="true" v-model="feedbackState[it.id].is_taking"> Yes</label>
                    <label><input type="radio" :value="false" v-model="feedbackState[it.id].is_taking"> No</label>
                  </div>
                  
                  <p class="fb-title" style="margin-top:10px;">Did you have any bad side effects?</p>
                  <textarea v-model="feedbackState[it.id].side_effects" placeholder="e.g. Stomach ache, rash, feeling dizzy (leave blank if none)"></textarea>
                  
                  <div class="fb-actions">
                    <button @click="submitFeedback(it.id)" :disabled="feedbackState[it.id].saving" class="primary small">
                      {{ feedbackState[it.id].saving ? 'Saving…' : 'Send to Pharmacist' }}
                    </button>
                    <span v-if="feedbackState[it.id].saved" class="saved-msg">✓ Thank you, the pharmacy has been notified.</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.portal { min-height: 100vh; background: #f4f8fa; color: #1c3a4c; }
.portal-head { padding: 20px 32px; background: #fff; border-bottom: 1px solid #e5ecef; }
.brand { display: flex; align-items: center; gap: 10px; }
.brand strong { display: block; font: 800 16px Manrope, sans-serif; color: #142f43; }
.brand small { font-size: 9px; letter-spacing: 2px; color: #6c8290; }
.portal-main { max-width: 720px; margin: 0 auto; padding: 28px 20px 60px; }
.welcome-card { background: #fff; border: 1px solid #e5ecef; border-radius: 16px; padding: 26px; margin-bottom: 16px; }
.welcome-card h1 { font: 800 26px Manrope, sans-serif; color: #142f43; margin: 0 0 8px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; line-height: 1.6; }
.prescriptions-section h2 { font: 800 18px Manrope, sans-serif; color: #142f43; margin: 24px 0 14px; }
.prescription-card { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 20px; margin-bottom: 14px; }
.pr-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.pr-head h3 { font: 700 15px Manrope, sans-serif; color: #17384b; margin: 0 0 4px; }
.medicines { display: flex; flex-direction: column; gap: 16px; }
.medicine-item { background: #f9fcfb; border: 1px solid #e5ecef; border-radius: 10px; padding: 16px; }
.med-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.med-head strong { font: 700 14px Manrope, sans-serif; color: #17384b; }
.qty { font-size: 11px; color: #94a1a8; }
.med-dosage { display: flex; gap: 8px; font-size: 13px; color: #334d5a; margin-bottom: 16px; }
.dosage-icon { display: inline-flex; width: 20px; height: 20px; border-radius: 50%; background: #e2f7ed; color: #07836c; align-items: center; justify-content: center; font-size: 12px; }
.feedback-box { background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; }
.fb-title { font-size: 12px; font-weight: 700; color: #354a58; margin: 0 0 6px; }
.fb-radios { display: flex; gap: 16px; font-size: 13px; margin-bottom: 10px; }
.fb-radios label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
textarea { width: 100%; padding: 10px; border: 1px solid #dce5e9; border-radius: 8px; font-family: inherit; font-size: 12px; resize: vertical; min-height: 60px; }
.fb-actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
.primary.small { padding: 8px 14px; font-size: 12px; background: #078c78; color: #fff; border: 0; border-radius: 8px; font-weight: 700; cursor: pointer; }
.saved-msg { color: #07836c; font-size: 12px; font-weight: 700; }
.pill { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
.pill.green { background: #e2f7ed; color: #07836c; }
.pill.gray { background: #eef4f6; color: #6c8290; }
.pill.amber { background: #fff4db; color: #a9791b; }
.error-card { background: #fff; border: 1px solid #f5c6cb; border-radius: 16px; padding: 40px 24px; text-align: center; }
.error-card h2 { color: #b8404b; margin: 0 0 10px; }
.empty { text-align: center; padding: 30px; color: #8b9ba3; }
</style>
