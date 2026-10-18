<script setup>
defineProps({ alerts: { type: Array, default: () => [] } });
</script>

<template>
  <section v-if="alerts.length > 0" class="alert-panel">
    <h3>🚨 Patient Feedback Alerts</h3>
    <p>Patients have reported side effects or issues with their medicine.</p>
    <div class="alert-list">
      <div v-for="(fb, i) in alerts" :key="i" class="alert-item">
        <div class="alert-head">
          <strong>{{ fb.patient_name }}</strong> reported an issue with <strong>{{ fb.medicine_name }}</strong>
        </div>
        <div class="alert-body">"{{ fb.patient_side_effects }}"</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.alert-panel { background: #fff5f5; border: 1px solid #feb2b2; border-radius: 12px; padding: 20px; margin-top: 24px; }
.alert-panel h3 { color: #c53030; margin: 0 0 4px; font-size: 16px; font-weight: 800; }
.alert-panel p { color: #742a2a; font-size: 13px; margin: 0 0 16px; }
.alert-list { display: flex; flex-direction: column; gap: 10px; }
.alert-item { background: #fff; border-left: 4px solid #f56565; padding: 12px 16px; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.alert-head { font-size: 13px; margin-bottom: 6px; color: #333; }
.alert-body { font-size: 14px; color: #c53030; font-style: italic; font-weight: 600; }
</style>
