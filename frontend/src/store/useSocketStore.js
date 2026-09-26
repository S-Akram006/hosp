import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  notifications: [],
  activeQueueUpdate: null,
  activeEmergency: null,

  connectSocket: (token, user) => {
    // If already connected with existing socket, return
    if (get().socket && get().isConnected) {
      return;
    }

    // Clean up any stale socket
    if (get().socket) {
      get().socket.disconnect();
    }

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket Client] Connected with ID: ${socketInstance.id}`);
      set({ isConnected: true });

      // Join rooms according to user role
      if (user) {
        if (user.role === 'doctor') {
          socketInstance.emit('join:doctor', { doctorId: user._id || user.id });
        } else if (user.role === 'patient') {
          socketInstance.emit('join:patient', { patientId: user._id || user.id });
        } else if (user.role === 'admin') {
          socketInstance.emit('join:admin');
        }
      }

      // Default join waiting room for real-time queue visibility
      socketInstance.emit('join:waiting-room');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[Socket Client] Disconnected (${reason})`);
      set({ isConnected: false });
    });

    socketInstance.on('connect_error', (error) => {
      console.warn(`[Socket Client] Connection error: ${error.message}`);
      set({ isConnected: false });
    });

    // Real-time Event Listeners
    socketInstance.on('appointment:delayed', (data) => {
      console.log('[Socket] Appointment delayed notification:', data);
      const newNotif = {
        id: Date.now(),
        type: 'warning',
        title: 'Appointment Delayed',
        message: data.message,
        timestamp: new Date(),
        data,
      };
      set((state) => ({
        notifications: [newNotif, ...state.notifications],
      }));
    });

    socketInstance.on('emergency:triggered', (data) => {
      console.log('[Socket] Emergency triggered event:', data);
      const newNotif = {
        id: Date.now(),
        type: 'danger',
        title: '🚨 Emergency Override Active',
        message: `Clinical schedule shifted by ${data.delayMinutes} mins due to emergency: ${data.reason}`,
        timestamp: new Date(),
        data,
      };
      set((state) => ({
        activeEmergency: data,
        notifications: [newNotif, ...state.notifications],
      }));
    });

    socketInstance.on('queue:status_changed', (data) => {
      set({ activeQueueUpdate: data });
    });

    socketInstance.on('queue:updated', (data) => {
      set({ activeQueueUpdate: data });
    });

    socketInstance.on('resource:updated', (data) => {
      const newNotif = {
        id: Date.now(),
        type: 'info',
        title: 'Resource Status Updated',
        message: `${data.name} is now ${data.currentStatus}`,
        timestamp: new Date(),
        data,
      };
      set((state) => ({
        notifications: [newNotif, ...state.notifications],
      }));
    });

    set({ socket: socketInstance });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  clearNotifications: () => set({ notifications: [] }),

  subscribe: (eventName, callback) => {
    const socket = get().socket;
    if (socket) {
      socket.on(eventName, callback);
    }
  },

  unsubscribe: (eventName, callback) => {
    const socket = get().socket;
    if (socket) {
      socket.off(eventName, callback);
    }
  },
}));

export default useSocketStore;
