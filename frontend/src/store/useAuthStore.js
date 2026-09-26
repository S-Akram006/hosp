import { create } from 'zustand';
import { authApi } from '../api/authApi.js';
import { useSocketStore } from './useSocketStore.js';

// Load stored session if available
const storedToken = localStorage.getItem('hospital_ai_token');
let storedUser = null;
try {
  const userJson = localStorage.getItem('hospital_ai_user');
  if (userJson) {
    storedUser = JSON.parse(userJson);
  }
} catch (e) {
  localStorage.removeItem('hospital_ai_user');
}

export const useAuthStore = create((set, get) => ({
  user: storedUser,
  token: storedToken || null,
  role: storedUser?.role || null,
  isAuthenticated: Boolean(storedToken),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login({ email, password });
      const { token, user } = data;

      localStorage.setItem('hospital_ai_token', token);
      localStorage.setItem('hospital_ai_user', JSON.stringify(user));

      set({
        user,
        token,
        role: user.role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Auto-connect socket with newly authenticated token
      useSocketStore.getState().connectSocket(token, user);

      return { success: true, user };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.register(userData);
      const { token, user } = data;

      localStorage.setItem('hospital_ai_token', token);
      localStorage.setItem('hospital_ai_user', JSON.stringify(user));

      set({
        user,
        token,
        role: user.role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Auto-connect socket
      useSocketStore.getState().connectSocket(token, user);

      return { success: true, user };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Registration failed. Please check your inputs.';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  logout: () => {
    localStorage.removeItem('hospital_ai_token');
    localStorage.removeItem('hospital_ai_user');

    // Disconnect real-time socket
    useSocketStore.getState().disconnectSocket();

    set({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const data = await authApi.getMe();
      if (data.user) {
        localStorage.setItem('hospital_ai_user', JSON.stringify(data.user));
        set({
          user: data.user,
          role: data.user.role,
          isAuthenticated: true,
        });

        // Ensure socket is connected
        useSocketStore.getState().connectSocket(token, data.user);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        get().logout();
      }
    }
  },
}));

export default useAuthStore;
