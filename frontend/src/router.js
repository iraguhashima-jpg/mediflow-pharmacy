import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';

const routes = [
  { path: '/',           name: 'home',      component: () => import('./views/Landing.vue'),  meta: { public: true } },
  { path: '/login',      name: 'login',     component: () => import('./views/Login.vue'),    meta: { public: true } },
  { path: '/change-password', name: 'changePassword', component: () => import('./views/ChangePassword.vue'), meta: { requiresAuth: true, skipMustChange: true } },

  { path: '/dashboard',  name: 'dashboard', component: () => import('./views/Dashboard.vue'),  meta: { requiresAuth: true } },
  { path: '/medicines',  name: 'medicines', component: () => import('./views/Medicines.vue'),  meta: { requiresAuth: true } },
  { path: '/inventory',  name: 'inventory', component: () => import('./views/Inventory.vue'),  meta: { requiresAuth: true } },
  { path: '/sales',      name: 'sales',     component: () => import('./views/Sales.vue'),      meta: { requiresAuth: true } },
  { path: '/reports',    name: 'reports',   component: () => import('./views/Reports.vue'),    meta: { requiresAuth: true, roles: ['OWNER', 'PHARMACIST'] } },
  { path: '/users',      name: 'users',     component: () => import('./views/Users.vue'),      meta: { requiresAuth: true, roles: ['OWNER'] } },
  { path: '/account',    name: 'account',   component: () => import('./views/Account.vue'),    meta: { requiresAuth: true } },

  { path: '/register-client/:slug', name: 'registerClient', component: () => import('./views/RegisterClient.vue'), meta: { public: true } },
  { path: '/patients',     name: 'patients',     component: () => import('./views/Patients.vue'),     meta: { requiresAuth: true } },
  { path: '/patients/:id', name: 'patient',      component: () => import('./views/PatientDetail.vue'), meta: { requiresAuth: true } },
  { path: '/prescriptions',name: 'prescriptions',component: () => import('./views/Prescriptions.vue'), meta: { requiresAuth: true } },
  { path: '/pharmacy',     name: 'pharmacy',     component: () => import('./views/Pharmacy.vue'),     meta: { requiresAuth: true } },
  { path: '/register',   name: 'register',  component: () => import('./views/Register.vue'), meta: { public: true } },
  { path: '/insurances', name: 'insurances', component: () => import('./views/Insurances.vue'), meta: { requiresAuth: true, roles: ['OWNER','PHARMACIST'] } },
  { path: '/reminders',  name: 'reminders',  component: () => import('./views/Reminders.vue'),  meta: { requiresAuth: true } },
  { path: '/insurance-claims', name: 'insuranceClaims', component: () => import('./views/InsuranceClaims.vue'), meta: { requiresAuth: true, roles: ['OWNER','PHARMACIST'] } },
  { path: '/patient/:token', name: 'patientPortal', component: () => import('./views/PatientPortal.vue'), meta: { public: true } },
  { path: '/join', name: 'join', component: () => import('./views/JoinPharmacy.vue'), meta: { public: true } },
  { path: '/admin', name: 'adminLogin', component: () => import('./views/AdminLogin.vue'), meta: { public: true } },
  { path: '/staff', name: 'staffLogin', component: () => import('./views/StaffLogin.vue'), meta: { public: true } },
  { path: '/settings/sms', name: 'smsSettings', component: () => import('./views/SmsSettings.vue'), meta: { requiresAuth: true, roles: ['OWNER'] } },
  { path: '/:pathMatch(.*)*', name: 'notFound', component: () => import('./views/NotFound.vue'), meta: { public: true } }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // First navigation in this tab — hydrate the store.
  if (!auth.loaded) await auth.refresh();

  // Public route: allow.
  if (to.meta.public) {
    // If already logged in and heading to /login, send to dashboard.
    if (to.name === 'login' && auth.isAuthenticated && !auth.mustChangePassword) {
      return { name: 'dashboard' };
    }
    return true;
  }

  // Protected route: must be logged in.
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { next: to.fullPath } };
  }

  // Forced password change: block everything except /change-password and /account.
  if (auth.mustChangePassword && !to.meta.skipMustChange && to.name !== 'account') {
    return { name: 'changePassword' };
  }

  // Role gate.
  if (to.meta.roles && !to.meta.roles.includes(auth.user.role)) {
    return { name: 'dashboard' };
  }

  return true;
});
