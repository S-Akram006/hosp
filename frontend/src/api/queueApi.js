import axiosClient from './axiosClient.js';

export const queueApi = {
  getLiveQueue: async (params = {}) => {
    const response = await axiosClient.get('/queue/live', { params });
    return response.data;
  },

  triggerEmergencyOverride: async ({ doctorId, delayMinutes, reason }) => {
    const response = await axiosClient.post('/emergency/override', {
      doctorId,
      delayMinutes,
      reason,
    });
    return response.data;
  },
};

export default queueApi;
