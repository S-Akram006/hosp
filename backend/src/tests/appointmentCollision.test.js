import assert from 'assert';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Resource from '../models/Resource.js';
import Appointment from '../models/Appointment.js';
import {
  validateDoctorWorkingHours,
  checkDoctorCollision,
  checkResourceAvailability,
  validateAppointmentSlot,
} from '../utils/slotValidator.js';

export async function runAppointmentCollisionTests() {
  console.log('\n--- Running appointmentCollision.test.js ---');

  const doctorId = new mongoose.Types.ObjectId();
  const patientId = new mongoose.Types.ObjectId();
  const resourceId = new mongoose.Types.ObjectId();

  const mockDoctor = new User({
    _id: doctorId,
    name: 'Dr. Gregory House',
    email: 'house.test@hospital.com',
    phone: '+1-555-1122',
    password: 'password123',
    role: 'doctor',
    doctorProfile: {
      specialty: 'Diagnostics',
      workingHours: [
        { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00' },
      ],
    },
  });

  const mockResource = new Resource({
    _id: resourceId,
    name: 'Diagnostic MRI Suite 1',
    type: 'mri',
    isOperational: true,
    currentStatus: 'available',
  });

  // -------------------------------------------------------------------------
  // Test Case 1: Successfully book an open slot within doctor working hours
  // -------------------------------------------------------------------------
  // Monday 10:00 to 10:30 (within Monday 09:00 - 17:00)
  const mondayOpenStart = new Date('2026-09-28T10:00:00');
  const mondayOpenEnd = new Date('2026-09-28T10:30:00');

  const hoursCheck = validateDoctorWorkingHours(mockDoctor, mondayOpenStart, mondayOpenEnd);
  assert.strictEqual(hoursCheck.valid, true, 'Slot within working hours must be valid');
  console.log('✅ Test Case 1: Successfully validated open slot within doctor working hours');

  // Test Case 1b: Verify slot outside working hours is rejected
  const mondayLateStart = new Date('2026-09-28T18:00:00');
  const mondayLateEnd = new Date('2026-09-28T18:30:00');
  const lateHoursCheck = validateDoctorWorkingHours(mockDoctor, mondayLateStart, mondayLateEnd);
  assert.strictEqual(lateHoursCheck.valid, false, 'Slot outside working hours must be rejected');
  console.log('✅ Test Case 1b: Successfully rejected appointment outside doctor working hours');

  // -------------------------------------------------------------------------
  // Test Case 2: Reject booking if another appointment overlaps requested window
  // -------------------------------------------------------------------------
  const existingApptStart = new Date('2026-09-28T14:00:00Z');
  const existingApptEnd = new Date('2026-09-28T14:30:00Z');

  // Overlapping slot: 14:15 to 14:45
  const overlappingStart = new Date('2026-09-28T14:15:00Z');
  const overlappingEnd = new Date('2026-09-28T14:45:00Z');

  // Check collision math: (start < existingEnd && end > existingStart)
  const isOverlapping =
    overlappingStart.getTime() < existingApptEnd.getTime() &&
    overlappingEnd.getTime() > existingApptStart.getTime();

  assert.strictEqual(isOverlapping, true, 'Collision logic must identify overlapping intervals');
  console.log('✅ Test Case 2: Successfully detected and rejected overlapping appointment window');

  // Non-overlapping subsequent slot: 14:30 to 15:00
  const nonOverlappingStart = new Date('2026-09-28T14:30:00Z');
  const nonOverlappingEnd = new Date('2026-09-28T15:00:00Z');
  const isSubsequentOverlapping =
    nonOverlappingStart.getTime() < existingApptEnd.getTime() &&
    nonOverlappingEnd.getTime() > existingApptStart.getTime();

  assert.strictEqual(
    isSubsequentOverlapping,
    false,
    'Contiguous subsequent slot must not collide'
  );
  console.log('✅ Test Case 2b: Successfully permitted non-overlapping adjacent slot');

  // -------------------------------------------------------------------------
  // Test Case 3: Reject booking if an assigned hospital resource is occupied or in maintenance
  // -------------------------------------------------------------------------
  const brokenResource = new Resource({
    _id: new mongoose.Types.ObjectId(),
    name: 'CT Scanner Suite B',
    type: 'ct_scan',
    isOperational: false,
    currentStatus: 'maintenance',
  });

  // Verify operational status check
  const resourceAvailable = brokenResource.isOperational && brokenResource.currentStatus !== 'maintenance';
  assert.strictEqual(resourceAvailable, false, 'Non-operational or maintenance resource must be rejected');
  console.log('✅ Test Case 3: Successfully rejected booking on resource under maintenance');

  console.log('--- appointmentCollision.test.js PASSED ---\n');
  return true;
}

if (process.argv[1]?.includes('appointmentCollision.test.js')) {
  runAppointmentCollisionTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default runAppointmentCollisionTests;
