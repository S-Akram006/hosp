import axiosClient from './axiosClient.js';

export const appointmentApi = {
  createAppointment: async (appointmentData) => {
    const response = await axiosClient.post('/appointments', appointmentData);
    return response.data;
  },

  getDoctorSchedule: async (doctorId, date) => {
    const params = date ? { date } : {};
    const response = await axiosClient.get(`/appointments/doctor/${doctorId}/schedule`, { params });
    return response.data;
  },

  getMyAppointments: async (filters = {}) => {
    const response = await axiosClient.get('/appointments/my', { params: filters });
    return response.data;
  },

  updateStatus: async (appointmentId, status) => {
    const response = await axiosClient.put(`/appointments/${appointmentId}/status`, { status });
    return response.data;
  },

  reschedule: async (appointmentId, payload) => {
    const response = await axiosClient.put(`/appointments/${appointmentId}/reschedule`, payload);
    return response.data;
  },
};

export default appointmentApi;
