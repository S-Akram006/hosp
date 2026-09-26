import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { validateAppointmentSlot } from '../utils/slotValidator.js';
import { calculateNoShowRisk } from '../services/noShowService.js';
import { broadcastQueueStatusChange } from './queueController.js';

/**
 * @desc    Create a new appointment with slot collision & resource checks
 * @route   POST /api/appointments
 * @access  Private (Patient, Admin)
 */
export const createAppointment = async (req, res, next) => {
  try {
    let {
      patientId,
      doctorId,
      resourceId,
      startTime,
      endTime,
      durationMinutes,
      triage,
      noShowProbability,
    } = req.body;

    // If logged-in user is a patient, enforce their own patientId
    if (req.user.role === 'patient') {
      patientId = req.user._id;
    } else if (!patientId) {
      res.status(400);
      throw new Error('Patient ID is required for booking');
    }

    if (!doctorId || !startTime || !endTime) {
      res.status(400);
      throw new Error('Please provide doctorId, startTime, and endTime');
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      res.status(404);
      throw new Error('Patient not found');
    }

    // Auto-calculate duration in minutes if not provided
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!durationMinutes) {
      durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    // Validate slot collisions, doctor working hours, and physical resource availability
    const validation = await validateAppointmentSlot({
      doctorId,
      resourceId: resourceId || null,
      startTime: start,
      endTime: end,
    });

    if (!validation.valid) {
      res.status(validation.statusCode || 400);
      throw new Error(validation.message);
    }

    // Calculate predictive no-show risk score if not provided
    let calculatedNoShowProb = noShowProbability;
    if (calculatedNoShowProb === undefined || calculatedNoShowProb === null) {
      const riskCalculation = await calculateNoShowRisk({
        patientId,
        startTime: start,
        urgencyLevel: triage?.urgencyLevel || 'routine',
      });
      calculatedNoShowProb = riskCalculation.noShowProbability;
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      resourceId: resourceId || null,
      startTime: start,
      endTime: end,
      durationMinutes,
      originalStartTime: start,
      triage: triage || {},
      noShowProbability: calculatedNoShowProb,
      status: 'scheduled',
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone patientProfile')
      .populate('doctorId', 'name email phone doctorProfile')
      .populate('resourceId', 'name type department currentStatus isOperational');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: populatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get doctor's appointment schedule for a specified date
 * @route   GET /api/appointments/doctor/:doctorId/schedule
 * @access  Private (All authenticated roles)
 */
export const getDoctorSchedule = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      res.status(404);
      throw new Error('Doctor not found');
    }

    const query = { doctorId };

    if (date) {
      const selectedDate = new Date(date);
      if (isNaN(selectedDate.getTime())) {
        res.status(400);
        throw new Error('Invalid date parameter format');
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(query)
      .sort({ startTime: 1 })
      .populate('patientId', 'name email phone patientProfile')
      .populate('doctorId', 'name email phone doctorProfile')
      .populate('resourceId', 'name type department currentStatus');

    res.status(200).json({
      success: true,
      count: appointments.length,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialty: doctor.doctorProfile?.specialty,
        workingHours: doctor.doctorProfile?.workingHours,
      },
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get appointments for the current authenticated user (Patient or Doctor)
 * @route   GET /api/appointments/my
 * @access  Private
 */
export const getMyAppointments = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admins can filter by query if provided, otherwise see all
      if (req.query.patientId) query.patientId = req.query.patientId;
      if (req.query.doctorId) query.doctorId = req.query.doctorId;
      if (req.query.status) query.status = req.query.status;
    }

    const appointments = await Appointment.find(query)
      .sort({ startTime: -1 })
      .populate('patientId', 'name email phone patientProfile')
      .populate('doctorId', 'name email phone doctorProfile')
      .populate('resourceId', 'name type department currentStatus');

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update appointment status (checked-in, completed, cancelled, etc.)
 * @route   PUT /api/appointments/:id/status
 * @access  Private (Patient, Doctor, Admin)
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = [
      'scheduled',
      'checked-in',
      'in-consultation',
      'completed',
      'bumped',
      'no-show',
      'cancelled',
    ];

    if (!status || !validStatuses.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Supported statuses: ${validStatuses.join(', ')}`);
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      res.status(404);
      throw new Error(`Appointment not found with id of ${id}`);
    }

    // Authorization checks
    if (req.user.role === 'patient') {
      // Patients are only permitted to cancel their own appointments
      if (appointment.patientId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Access forbidden: You can only update your own appointment');
      }
      if (status !== 'cancelled') {
        res.status(403);
        throw new Error('Patients can only change appointment status to cancelled');
      }
    } else if (req.user.role === 'doctor') {
      // Doctors can only update appointments assigned to them
      if (appointment.doctorId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Access forbidden: You can only update appointments assigned to you');
      }
    }

    appointment.status = status;
    await appointment.save();

    const updated = await Appointment.findById(id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email phone doctorProfile')
      .populate('resourceId', 'name type department');

    // Real-time broadcast to waiting room, doctor, and admin rooms
    broadcastQueueStatusChange(updated);

    res.status(200).json({
      success: true,
      message: `Appointment status updated to '${status}'`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reschedule appointment with slot collision & resource re-validation
 * @route   PUT /api/appointments/:id/reschedule
 * @access  Private (Patient, Doctor, Admin)
 */
export const rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, resourceId } = req.body;

    if (!startTime || !endTime) {
      res.status(400);
      throw new Error('Please provide both new startTime and endTime');
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      res.status(404);
      throw new Error(`Appointment not found with id of ${id}`);
    }

    // Role ownership check
    if (
      req.user.role === 'patient' &&
      appointment.patientId.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Access forbidden: You can only reschedule your own appointment');
    }

    if (
      req.user.role === 'doctor' &&
      appointment.doctorId.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Access forbidden: You can only reschedule appointments assigned to you');
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      res.status(400);
      throw new Error(`Cannot reschedule an appointment that is already ${appointment.status}`);
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const newResourceId = resourceId !== undefined ? resourceId : appointment.resourceId;

    // Validate new slot
    const validation = await validateAppointmentSlot({
      doctorId: appointment.doctorId,
      resourceId: newResourceId || null,
      startTime: start,
      endTime: end,
      excludeAppointmentId: appointment._id,
    });

    if (!validation.valid) {
      res.status(validation.statusCode || 400);
      throw new Error(validation.message);
    }

    // Preserve original start time if this is first reschedule
    if (!appointment.originalStartTime) {
      appointment.originalStartTime = appointment.startTime;
    }

    // Flag delay if new start time is later than original/previous start time
    if (start.getTime() > appointment.startTime.getTime()) {
      appointment.isDelayed = true;
    }

    appointment.startTime = start;
    appointment.endTime = end;
    appointment.durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    appointment.resourceId = newResourceId || null;
    appointment.status = 'scheduled'; // reset to scheduled upon rescheduling

    await appointment.save();

    const updated = await Appointment.findById(id)
      .populate('patientId', 'name email phone patientProfile')
      .populate('doctorId', 'name email phone doctorProfile')
      .populate('resourceId', 'name type department currentStatus');

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
