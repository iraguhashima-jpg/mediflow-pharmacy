<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const currentPassword = ref('');
const newPassword = ref('');
const confirm = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  if (newPassword.value !== confirm.value) {
    error.value = 'New password and confirmation do not match.';
    return;
  }
  busy.value = true;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    router.push({ name: 'dashboard' });
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not change password.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="login-screen">
    <div class="login-card">
      <h1>Choose a new password</h1>
      <p class="muted">Your account was created with a temporary password. Set a permanent one to continue.</p>
      <form @submit.prevent="submit">
        <label>Current (temporary) password</label>
        <input v-model="currentPassword" type="password" required autocomplete="current-password">
        <label>New password</label>
        <input v-model="newPassword" type="password" required minlength="10" autocomplete="new-password">
        <label>Confirm new password</label>
        <input v-model="confirm" type="password" required minlength="10" autocomplete="new-password">
        <p class="hint">At least 10 characters, must contain a letter and a digit.</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary full" :disabled="busy">{{ busy ? 'Updating…' : 'Update password' }}</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-screen {
  min-height: 100vh; display: grid; place-items: center; padding: 24px;
  background: radial-gradient(circle at top right, #e0f7ef, transparent 38%), #f4f8fa;
}
.login-card {
  width: min(100%, 460px); background: #fff; padding: 38px;
  border: 1px solid #e5edf0; border-radius: 22px;
  box-shadow: 0 20px 70px rgba(21, 63, 85, 0.06);
}
h1 { font: 800 24px Manrope, sans-serif; color: #142f43; margin: 0 0 6px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0; }
form { display: flex; flex-direction: column; margin-top: 22px; }
label { font-size: 12px; font-weight: 700; margin: 12px 0 7px; color: #354a58; }
input {
  width: 100%; padding: 12px 13px; border: 1px solid #dce5e9;
  border-radius: 9px; outline: none; background: #fff; color: #203645;
}
input:focus { border-color: #0d9c85; box-shadow: 0 0 0 3px rgba(13, 156, 133, 0.08); }
.hint { color: #7d8e99; font-size: 11px; margin-top: 12px; }
.error { color: #c43c4c; font-size: 12px; margin: 10px 0 0; }
.full { width: 100%; margin-top: 18px; padding: 13px; }
</style>
