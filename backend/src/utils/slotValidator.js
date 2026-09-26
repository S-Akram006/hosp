import Appointment from '../models/Appointment.js';
import Resource from '../models/Resource.js';
import User from '../models/User.js';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Convert "HH:MM" string to minutes from start of the day
 * @param {string} timeStr - "09:30"
 * @returns {number} minutes
 */
const timeStringToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Format Date object to HH:MM (24-hour)
 * @param {Date} date
 * @returns {string}
 */
const formatTimeHHMM = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Verify if appointment falls within doctor's configured working hours
 * @param {Object} doctor - Doctor User document
 * @param {Date} startTime
 * @param {Date} endTime
 * @returns {{ valid: boolean, message?: string }}
 */
export const validateDoctorWorkingHours = (doctor, startTime, endTime) => {
  if (!doctor.doctorProfile?.workingHours || doctor.doctorProfile.workingHours.length === 0) {
    // If no working hours defined, default to permitted
    return { valid: true };
  }

  const dayOfWeek = DAYS_OF_WEEK[startTime.getDay()];
  const schedule = doctor.doctorProfile.workingHours.find(
    (wh) => wh.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase()
  );

  if (!schedule) {
    return {
      valid: false,
      message: `Dr. ${doctor.name} does not have scheduled working hours on ${dayOfWeek}`,
    };
  }

  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

  const scheduleStartMinutes = timeStringToMinutes(schedule.startTime);
  const scheduleEndMinutes = timeStringToMinutes(schedule.endTime);

  if (startMinutes < scheduleStartMinutes || endMinutes > scheduleEndMinutes) {
    return {
      valid: false,
      message: `Appointment window (${formatTimeHHMM(startTime)} - ${formatTimeHHMM(
        endTime
      )}) is outside Dr. ${doctor.name}'s working hours on ${dayOfWeek} (${schedule.startTime} - ${schedule.endTime})`,
    };
  }

  return { valid: true };
};

/**
 * Check if the doctor already has an active overlapping appointment
 * @param {string} doctorId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {string|null} excludeAppointmentId
 * @returns {Promise<{ collision: boolean, message?: string }>}
 */
export const checkDoctorCollision = async (
  doctorId,
  startTime,
  endTime,
  excludeAppointmentId = null
) => {
  const query = {
    doctorId,
    status: { $nin: ['cancelled', 'no-show'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const collision = await Appointment.findOne(query);

  if (collision) {
    return {
      collision: true,
      message: `Doctor already has an active appointment scheduled between ${new Date(
        collision.startTime
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and ${new Date(
        collision.endTime
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
  }

  return { collision: false };
};

/**
 * Check if a physical resource (room, scanner, etc.) is operational and available
 * @param {string|null} resourceId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {string|null} excludeAppointmentId
 * @returns {Promise<{ available: boolean, message?: string, resource?: Object }>}
 */
export const checkResourceAvailability = async (
  resourceId,
  startTime,
  endTime,
  excludeAppointmentId = null
) => {
  if (!resourceId) {
    return { available: true };
  }

  const resource = await Resource.findById(resourceId);

  if (!resource) {
    return { available: false, message: 'Specified hospital resource not found' };
  }

  if (!resource.isOperational || resource.currentStatus === 'maintenance') {
    return {
      available: false,
      message: `Resource '${resource.name}' is currently unavailable (Status: ${resource.currentStatus}, Operational: ${resource.isOperational})`,
    };
  }

  const query = {
    resourceId,
    status: { $nin: ['cancelled', 'no-show'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const overlapping = await Appointment.findOne(query);

  if (overlapping) {
    return {
      available: false,
      message: `Resource '${resource.name}' is already reserved by another appointment between ${new Date(
        overlapping.startTime
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and ${new Date(
        overlapping.endTime
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
  }

  return { available: true, resource };
};

/**
 * Comprehensive slot validator orchestrating all constraints:
 * 1. Time validity (start < end)
 * 2. Doctor working hours
 * 3. Doctor collision
 * 4. Resource operational state & collision
 */
export const validateAppointmentSlot = async ({
  doctorId,
  resourceId = null,
  startTime,
  endTime,
  excludeAppointmentId = null,
}) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, statusCode: 400, message: 'Invalid start or end date format' };
  }

  if (start >= end) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Appointment start time must be strictly before end time',
    };
  }

  // Fetch doctor user document
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== 'doctor') {
    return {
      valid: false,
      statusCode: 404,
      message: 'Assigned doctor was not found or is not registered as a doctor',
    };
  }

  // 1. Verify working hours
  const workingHoursCheck = validateDoctorWorkingHours(doctor, start, end);
  if (!workingHoursCheck.valid) {
    return { valid: false, statusCode: 400, message: workingHoursCheck.message };
  }

  // 2. Verify doctor collisions
  const doctorCollisionCheck = await checkDoctorCollision(
    doctorId,
    start,
    end,
    excludeAppointmentId
  );
  if (doctorCollisionCheck.collision) {
    return { valid: false, statusCode: 409, message: doctorCollisionCheck.message };
  }

  // 3. Verify resource availability
  if (resourceId) {
    const resourceCheck = await checkResourceAvailability(
      resourceId,
      start,
      end,
      excludeAppointmentId
    );
    if (!resourceCheck.available) {
      return { valid: false, statusCode: 409, message: resourceCheck.message };
    }
  }

  return { valid: true, doctor, start, end };
};
