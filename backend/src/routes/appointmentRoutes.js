import express from 'express';
import {
  createAppointment,
  getDoctorSchedule,
  getMyAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
} from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All appointment routes require authentication
router.use(protect);

/**
 * @route   POST /api/appointments
 * @desc    Create a new appointment with slot collision & resource locking checks
 * @access  Private (Patient, Admin)
 */
router.post('/', authorize('patient', 'admin'), createAppointment);

/**
 * @route   GET /api/appointments/doctor/:doctorId/schedule
 * @desc    Get doctor's appointment schedule for a specified date
 * @access  Private (All authenticated roles)
 */
router.get('/doctor/:doctorId/schedule', getDoctorSchedule);

/**
 * @route   GET /api/appointments/my
 * @desc    Get appointments for the current authenticated user (Patient or Doctor)
 * @access  Private
 */
router.get('/my', getMyAppointments);

/**
 * @route   PUT /api/appointments/:id/status
 * @desc    Update appointment status (checked-in, completed, cancelled, etc.)
 * @access  Private (Patient, Doctor, Admin)
 */
router.put('/:id/status', updateAppointmentStatus);

/**
 * @route   PUT /api/appointments/:id/reschedule
 * @desc    Reschedule appointment with slot collision & resource re-validation
 * @access  Private (Patient, Doctor, Admin)
 */
router.put('/:id/reschedule', rescheduleAppointment);

export default router;
