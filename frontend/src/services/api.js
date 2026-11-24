import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const expired = [401, 422].includes(error.response?.status) && !url.startsWith('/auth/');
    if (expired && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) => e.response?.data?.error || e.message || 'Something went wrong.';
export default api;
