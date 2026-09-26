import axiosClient from './axiosClient.js';

export const aiApi = {
  triageSymptoms: async ({ symptoms, medicalHistory }) => {
    const response = await axiosClient.post('/ai/triage', { symptoms, medicalHistory });
    return response.data;
  },

  generateSoapNote: async ({ rawTranscript, appointmentId }) => {
    const response = await axiosClient.post('/ai/generate-soap', { rawTranscript, appointmentId });
    return response.data;
  },

  signMedicalRecord: async (appointmentId, { soapNote, prescriptions }) => {
    const response = await axiosClient.put(`/ai/records/${appointmentId}/sign`, {
      soapNote,
      prescriptions,
    });
    return response.data;
  },

  ocrIntakeDocument: async (file) => {
    const formData = new FormData();
    formData.append('document', file);

    const response = await axiosClient.post('/ai/ocr-intake', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default aiApi;
