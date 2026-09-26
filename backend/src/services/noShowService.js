import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

/**
 * Calculate predictive no-show risk probability for an appointment
 * Based on lead time, clinical urgency, and past patient attendance history
 *
 * @param {Object} params
 * @param {string|ObjectId} params.patientId - Patient MongoDB ObjectId
 * @param {Date|string} params.startTime - Appointment scheduled start time
 * @param {string} [params.urgencyLevel='routine'] - 'routine' | 'urgent' | 'emergency'
 * @param {Date|string} [params.bookingTime=new Date()] - Time the appointment was booked
 * @returns {Promise<{ noShowProbability: number, riskLevel: string, factors: Object }>}
 */
export const calculateNoShowRisk = async ({
  patientId,
  startTime,
  urgencyLevel = 'routine',
  bookingTime = new Date(),
}) => {
  let score = 0.12; // Baseline clinic no-show rate (12%)

  const apptDate = new Date(startTime);
  const bookDate = new Date(bookingTime);

  // 1. Calculate lead time in days
  const leadTimeMs = Math.max(0, apptDate.getTime() - bookDate.getTime());
  const leadTimeDays = Math.round((leadTimeMs / (1000 * 60 * 60 * 24)) * 10) / 10;

  if (leadTimeDays <= 1) {
    score -= 0.06; // Same-day / next-day bookings have significantly higher attendance
  } else if (leadTimeDays > 1 && leadTimeDays <= 7) {
    score += 0.02;
  } else if (leadTimeDays > 7 && leadTimeDays <= 14) {
    score += 0.08;
  } else if (leadTimeDays > 14 && leadTimeDays <= 30) {
    score += 0.15;
  } else {
    // 30+ days in advance
    score += 0.22;
  }

  // 2. Clinical urgency factor
  if (urgencyLevel === 'emergency') {
    score -= 0.09;
  } else if (urgencyLevel === 'urgent') {
    score -= 0.05;
  } else {
    score += 0.02;
  }

  // 3. Historical patient cancellation and no-show patterns
  let historicalNoShows = 0;
  let historicalCancellations = 0;
  let historicalCompleted = 0;

  if (patientId && mongoose.connection.readyState === 1) {
    try {
      const pastAppointments = await Appointment.find({
        patientId,
        status: { $in: ['completed', 'cancelled', 'no-show'] },
      }).select('status');

      const totalPast = pastAppointments.length;

      if (totalPast > 0) {
        historicalNoShows = pastAppointments.filter((a) => a.status === 'no-show').length;
        historicalCancellations = pastAppointments.filter(
          (a) => a.status === 'cancelled'
        ).length;
        historicalCompleted = pastAppointments.filter(
          (a) => a.status === 'completed'
        ).length;

        // Weight no-shows heavily
        const noShowRatio = historicalNoShows / totalPast;
        score += noShowRatio * 0.35;

        // Weight cancellations moderately
        const cancelRatio = historicalCancellations / totalPast;
        score += cancelRatio * 0.12;

        // Reward reliable patients with track record
        if (historicalCompleted >= 3 && historicalNoShows === 0) {
          score -= 0.06;
        }
      }
    } catch (err) {
      console.warn(`[NoShowService] Could not fetch patient history: ${err.message}`);
    }
  }

  // Clamp probability between 0.02 and 0.95
  const clampedProbability = Math.min(0.95, Math.max(0.02, score));
  const roundedProbability = Math.round(clampedProbability * 100) / 100;

  let riskLevel = 'low';
  if (roundedProbability >= 0.4) {
    riskLevel = 'high';
  } else if (roundedProbability >= 0.2) {
    riskLevel = 'moderate';
  }

  return {
    noShowProbability: roundedProbability,
    riskLevel,
    factors: {
      leadTimeDays,
      urgencyLevel,
      historicalNoShows,
      historicalCancellations,
      historicalCompleted,
    },
  };
};

export default {
  calculateNoShowRisk,
};
