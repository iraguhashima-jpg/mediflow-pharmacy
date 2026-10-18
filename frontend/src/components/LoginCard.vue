<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  expectedRole: { type: String, default: null },
  variant:      { type: String, default: 'general' }, // 'admin' | 'staff' | 'general'
  title:        { type: String, default: 'Sign in' },
  subtitle:     { type: String, default: 'Use the account provided by your pharmacy administrator.' },
  backTo:       { type: String, default: '/' }
});

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    const user = await auth.login(email.value, password.value, props.expectedRole);
    if (auth.mustChangePassword) {
      router.push({ name: 'changePassword' });
    } else {
      router.push({ name: 'dashboard' });
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not sign in.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="login-screen" :class="variant">
    <div class="login-card">
      <router-link :to="backTo" class="brand-link">
        <span class="brand-mark small">✚</span>
        <span class="brand-name">MediFlow</span>
      </router-link>

      <div v-if="variant === 'admin'" class="entry-badge admin">ADMIN PORTAL</div>
      <div v-else-if="variant === 'staff'" class="entry-badge staff">STAFF PORTAL</div>

      <h1>{{ title }}</h1>
      <p class="muted">{{ subtitle }}</p>

      <form @submit.prevent="submit">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" required autocomplete="username" autofocus>

        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" required autocomplete="current-password">

        <p v-if="error" class="error">{{ error }}</p>

        <button class="primary full" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <div class="switch-links">
        <template v-if="variant === 'admin'">
          <p>Not the owner? <router-link to="/staff">Staff portal →</router-link></p>
          <p><router-link to="/">← Back to home</router-link></p>
        </template>
        <template v-else-if="variant === 'staff'">
          <p>Pharmacy owner? <router-link to="/admin">Admin portal →</router-link></p>
          <p><router-link to="/">← Back to home</router-link></p>
        </template>
        <template v-else>
          <p><router-link to="/">← Back to home</router-link></p>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at top right, #e0f7ef, transparent 38%), #f4f8fa;
}
.login-screen.admin { background: radial-gradient(circle at top right, #d6f2e9, transparent 40%), #eff8f5; }
.login-screen.staff { background: radial-gradient(circle at top right, #fff0d4, transparent 40%), #fdf9f0; }

.login-card {
  width: min(100%, 420px);
  background: #fff;
  padding: 38px;
  border: 1px solid #e5edf0;
  border-radius: 22px;
  box-shadow: 0 20px 70px rgba(21, 63, 85, 0.06);
}
.login-screen.admin .login-card { border-top: 5px solid #078c78; }
.login-screen.staff .login-card { border-top: 5px solid #f0a14b; }

.brand-link { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: #142f43; margin-bottom: 18px; }
.brand-name { font: 800 16px Manrope, sans-serif; letter-spacing: -0.4px; }

.entry-badge {
  display: inline-block;
  font-size: 10px; font-weight: 800; letter-spacing: 1.6px;
  padding: 5px 12px; border-radius: 20px;
  margin-bottom: 12px;
}
.entry-badge.admin { background: #e2f7ed; color: #07836c; }
.entry-badge.staff { background: #fff4db; color: #a9791b; }

h1 { font: 800 26px Manrope, sans-serif; color: #142f43; margin: 0 0 6px; }
.muted { color: #7d8e99; font-size: 13px; margin: 0 0 6px; line-height: 1.55; }

form { display: flex; flex-direction: column; margin-top: 22px; }
label { font-size: 12px; font-weight: 700; margin: 12px 0 7px; color: #354a58; }
input {
  width: 100%; padding: 12px 13px; border: 1px solid #dce5e9;
  border-radius: 9px; outline: none; background: #fff; color: #203645;
  font-family: inherit;
}
input:focus { border-color: #0d9c85; box-shadow: 0 0 0 3px rgba(13, 156, 133, 0.08); }
.full { width: 100%; margin-top: 18px; padding: 13px; }
.error { color: #c43c4c; font-size: 12px; margin: 10px 0 0; }

.switch-links { margin-top: 22px; font-size: 12px; text-align: center; color: #5a6c78; }
.switch-links p { margin: 6px 0; }
.switch-links a { color: #078c78; text-decoration: none; font-weight: 700; }

.primary {
  border: 0; border-radius: 10px; padding: 11px 16px;
  font-size: 13px; font-weight: 700;
  background: #078c78; color: #fff; cursor: pointer; font-family: inherit;
}
.primary:hover { background: #067563; }
.primary:disabled { opacity: 0.6; cursor: wait; }
</style>
