import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';

/**
 * Anonymize patient name for display on clinic monitors (e.g. "John Doe" -> "J*** D***")
 * @param {string} fullName
 * @returns {string}
 */
const anonymizeName = (fullName) => {
  if (!fullName) return 'Patient';
  return fullName
    .split(' ')
    .map((part) => (part.length > 1 ? `${part[0]}***` : part))
    .join(' ');
};

/**
 * @desc    Get live hospital queue metrics and waiting room tickets
 * @route   GET /api/queue/live
 * @access  Private (All authenticated users or public display token)
 */
export const getLiveQueue = async (req, res, next) => {
  try {
    const { doctorId } = req.query;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'checked-in', 'in-consultation', 'completed'] },
    };

    if (doctorId) {
      query.doctorId = doctorId;
    }

    const appointments = await Appointment.find(query)
      .sort({ startTime: 1 })
      .populate('patientId', 'name')
      .populate('doctorId', 'name doctorProfile');

    const checkedInAppointments = appointments.filter((a) => a.status === 'checked-in');
    const inConsultationAppointments = appointments.filter(
      (a) => a.status === 'in-consultation'
    );
    const completedCount = appointments.filter((a) => a.status === 'completed').length;
    const scheduledUpcoming = appointments.filter((a) => a.status === 'scheduled').length;

    // Calculate average delay among delayed appointments
    const delayedAppts = appointments.filter((a) => a.isDelayed && a.originalStartTime);
    let totalDelayMinutes = 0;
    delayedAppts.forEach((a) => {
      const delayMs = new Date(a.startTime).getTime() - new Date(a.originalStartTime).getTime();
      totalDelayMinutes += Math.max(0, Math.round(delayMs / (1000 * 60)));
    });
    const averageDelayMinutes =
      delayedAppts.length > 0 ? Math.round(totalDelayMinutes / delayedAppts.length) : 0;

    // Build privacy-safe tickets for public monitor
    const tickets = appointments.map((a, index) => ({
      ticketNumber: `TK-${a._id.toString().slice(-4).toUpperCase()}`,
      queuePosition: index + 1,
      appointmentId: a._id,
      patientToken: anonymizeName(a.patientId?.name),
      doctorName: a.doctorId ? `Dr. ${a.doctorId.name}` : 'Consulting Doctor',
      specialty: a.doctorId?.doctorProfile?.specialty || 'General',
      status: a.status,
      estimatedStartTime: a.startTime,
      isDelayed: a.isDelayed,
      urgencyLevel: a.triage?.urgencyLevel || 'routine',
    }));

    res.status(200).json({
      success: true,
      timestamp: new Date(),
      metrics: {
        totalToday: appointments.length,
        waitingCount: checkedInAppointments.length,
        inConsultationCount: inConsultationAppointments.length,
        scheduledCount: scheduledUpcoming,
        completedCount,
        averageDelayMinutes,
      },
      currentConsultations: inConsultationAppointments.map((a) => ({
        ticketNumber: `TK-${a._id.toString().slice(-4).toUpperCase()}`,
        doctorName: `Dr. ${a.doctorId?.name || ''}`,
        roomNumber: a.doctorId?.doctorProfile?.roomNumber || 'Consultation Room',
        startTime: a.startTime,
      })),
      waitingTickets: tickets.filter((t) => ['checked-in', 'in-consultation'].includes(t.status)),
      allTickets: tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Utility helper to broadcast queue status updates via Socket.io
 * @param {Object} appointment - Updated appointment Mongoose document or populated object
 */
export const broadcastQueueStatusChange = (appointment) => {
  try {
    const io = getIO();
    const ticketNumber = `TK-${appointment._id.toString().slice(-4).toUpperCase()}`;

    // Broadcast to public waiting room
    io.to('room:waiting-room').emit('queue:status_changed', {
      appointmentId: appointment._id,
      ticketNumber,
      status: appointment.status,
      doctorId: appointment.doctorId,
      updatedAt: new Date(),
    });

    // Broadcast to specific doctor room
    if (appointment.doctorId) {
      const docId = appointment.doctorId._id || appointment.doctorId;
      io.to(`room:doctor:${docId}`).emit('queue:status_changed', {
        appointmentId: appointment._id,
        ticketNumber,
        status: appointment.status,
        updatedAt: new Date(),
      });
    }

    // Broadcast to admin room
    io.to('room:admin').emit('queue:status_changed', {
      appointmentId: appointment._id,
      ticketNumber,
      status: appointment.status,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.warn(`[Queue Broadcast Warning]: ${err.message}`);
  }
};

export default {
  getLiveQueue,
  broadcastQueueStatusChange,
};
