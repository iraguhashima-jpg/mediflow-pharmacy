import axios from 'axios';
// HARDCODED to your live Railway backend
const baseURL = 'https://kind-cat-production-b314.up.railway.app/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('mediflow-unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
