import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loaded: false
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    isOwner: (s) => s.user?.role === 'OWNER',
    isPharmacist: (s) => s.user?.role === 'PHARMACIST',
    isStaff: (s) => s.user?.role === 'STAFF',
    mustChangePassword: (s) => !!s.user?.mustChangePassword
  },
  actions: {
    async refresh() {
      try {
        const r = await api.get('/auth/me');
        this.user = r.data.user;
        if (this.user) await this.enrichWithProfile();
      } catch {
        this.user = null;
      } finally {
        this.loaded = true;
      }
      return this.user;
    },
    async enrichWithProfile() {
      try {
        const r = await api.get('/profile');
        if (r.data?.user) {
          this.user = {
            ...this.user,
            avatar_path: r.data.user.avatar_path || null,
            job_title: r.data.user.job_title || null,
            pharmacy_name: r.data.pharmacy?.name || null
          };
        }
      } catch {}
    },
    async login(email, password, expectedRole = null) {
      const body = { email, password };
      if (expectedRole) body.expected_role = expectedRole;
      const r = await api.post('/auth/login', body);
      this.user = r.data.user;
      await this.enrichWithProfile();
      return this.user;
    },
    async logout() {
      try { await api.post('/auth/logout'); } catch {}
      this.user = null;
    },
    async changePassword(currentPassword, newPassword) {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      if (this.user) this.user.mustChangePassword = false;
    }
  }
});
