import axios from 'axios';

/**
 * Dynamically resolve API Base URL with fallback to production backend
 */
const getApiBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL;
  if (!url) {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      url = 'https://hosp-98t3.onrender.com/api';
    } else {
      url = 'http://localhost:5000/api';
    }
  }

  // Ensure url ends with /api
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getApiBaseUrl();

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout accommodates free-tier backend cold starts
});

// Request Interceptor: Attach JWT bearer token from localStorage
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hospital_ai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global 401 unauthorized and friendly cold-start/network messages
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't redirect if already on login/register pages
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('hospital_ai_token');
        localStorage.removeItem('hospital_ai_user');
        window.location.href = '/login?session_expired=true';
      }
    } else if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message =
          'The server is taking longer than usual to respond. The free backend tier may be waking up from sleep, please wait a moment and try again.';
      } else {
        error.message =
          'Unable to connect to the hospital server. Please check your internet connection or verify the backend is active.';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
