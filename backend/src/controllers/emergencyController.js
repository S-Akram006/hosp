import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';

/**
 * @desc    Emergency Override Trigger - Shifts upcoming doctor appointments forward
 * @route   POST /api/emergency/override
 * @access  Private (Doctor, Admin)
 */
export const triggerEmergencyOverride = async (req, res, next) => {
  try {
    let { doctorId, delayMinutes = 30, reason = 'Critical emergency trauma procedure' } =
      req.body;

    // If logged-in user is a doctor, enforce their own doctorId
    if (req.user.role === 'doctor') {
      doctorId = req.user._id;
    } else if (!doctorId) {
      res.status(400);
      throw new Error('Please specify the doctorId for the emergency override');
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      res.status(404);
      throw new Error('Doctor not found');
    }

    const delayDuration = Number(delayMinutes);
    if (isNaN(delayDuration) || delayDuration <= 0) {
      res.status(400);
      throw new Error('delayMinutes must be a positive number');
    }

    const delayMs = delayDuration * 60 * 1000;

    // Find all today's remaining or scheduled appointments for this doctor
    const now = new Date();
    // Allow a 15-minute grace window for appointments scheduled just now
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId,
      status: 'scheduled',
      startTime: { $gte: windowStart, $lte: endOfDay },
    }).sort({ startTime: 1 });

    const updatedAppointments = [];
    const io = getIO();

    for (const appt of appointments) {
      if (!appt.originalStartTime) {
        appt.originalStartTime = appt.startTime;
      }
      appt.isDelayed = true;
      appt.startTime = new Date(appt.startTime.getTime() + delayMs);
      appt.endTime = new Date(appt.endTime.getTime() + delayMs);

      await appt.save();
      updatedAppointments.push(appt);

      // Real-time event to individual patient room
      io.to(`room:patient:${appt.patientId}`).emit('appointment:delayed', {
        appointmentId: appt._id,
        doctorId,
        doctorName: doctor.name,
        newStartTime: appt.startTime,
        newEndTime: appt.endTime,
        delayMinutes: delayDuration,
        reason,
        message: `Dr. ${doctor.name} was called to an emergency case ("${reason}"). Your appointment has been shifted by ${delayDuration} minutes. Your new estimated time is ${new Date(
          appt.startTime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      });
    }

    // Real-time event to doctor room
    io.to(`room:doctor:${doctorId}`).emit('emergency:triggered', {
      doctorId,
      delayMinutes: delayDuration,
      reason,
      affectedCount: updatedAppointments.length,
      updatedAppointments,
      triggeredAt: now,
    });

    // Real-time event to clinic waiting room monitor
    io.to('room:waiting-room').emit('queue:updated', {
      doctorId,
      doctorName: doctor.name,
      department: doctor.doctorProfile?.department,
      delayMinutes: delayDuration,
      reason,
      updatedAt: now,
    });

    // Real-time notification to hospital admin operations
    io.to('room:admin').emit('emergency:alert', {
      doctorId,
      doctorName: doctor.name,
      delayMinutes: delayDuration,
      reason,
      affectedCount: updatedAppointments.length,
      timestamp: now,
    });

    res.status(200).json({
      success: true,
      message: `Emergency override executed. ${updatedAppointments.length} appointment(s) shifted by ${delayDuration} minutes.`,
      data: {
        doctorId,
        doctorName: doctor.name,
        delayMinutes: delayDuration,
        reason,
        affectedCount: updatedAppointments.length,
        updatedAppointments,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  triggerEmergencyOverride,
};
