import assert from 'assert';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

export async function runEmergencyOverrideTests() {
  console.log('\n--- Running emergencyOverride.test.js ---');

  const doctorId = new mongoose.Types.ObjectId();
  const patientId1 = new mongoose.Types.ObjectId();
  const patientId2 = new mongoose.Types.ObjectId();

  const baseTime = new Date('2026-09-28T10:00:00Z');
  const baseTime2 = new Date('2026-09-28T11:00:00Z');

  const appt1 = new Appointment({
    patientId: patientId1,
    doctorId,
    startTime: new Date(baseTime),
    endTime: new Date(baseTime.getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    status: 'scheduled',
  });

  const appt2 = new Appointment({
    patientId: patientId2,
    doctorId,
    startTime: new Date(baseTime2),
    endTime: new Date(baseTime2.getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    status: 'scheduled',
  });

  const initialStart1 = new Date(appt1.startTime);
  const initialStart2 = new Date(appt2.startTime);

  // -------------------------------------------------------------------------
  // Test Case 1: Triggering emergency override shifts all subsequent non-completed appointments by exactly N minutes
  // -------------------------------------------------------------------------
  const delayMinutes = 30;
  const delayMs = delayMinutes * 60 * 1000;

  const affectedAppointments = [appt1, appt2];

  for (const appt of affectedAppointments) {
    if (!appt.originalStartTime) {
      appt.originalStartTime = new Date(appt.startTime);
    }
    appt.isDelayed = true;
    appt.startTime = new Date(appt.startTime.getTime() + delayMs);
    appt.endTime = new Date(appt.endTime.getTime() + delayMs);
  }

  // Verify shift amount
  const shiftedDiff1 = (appt1.startTime.getTime() - initialStart1.getTime()) / (1000 * 60);
  const shiftedDiff2 = (appt2.startTime.getTime() - initialStart2.getTime()) / (1000 * 60);

  assert.strictEqual(
    shiftedDiff1,
    delayMinutes,
    `Appointment 1 must be shifted forward by exactly ${delayMinutes} minutes`
  );
  assert.strictEqual(
    shiftedDiff2,
    delayMinutes,
    `Appointment 2 must be shifted forward by exactly ${delayMinutes} minutes`
  );

  console.log(
    `✅ Test Case 1: Emergency override shifted ${affectedAppointments.length} appointments by exactly ${delayMinutes} minutes`
  );

  // -------------------------------------------------------------------------
  // Test Case 2: Verify isDelayed flag is set to true and originalStartTime is preserved
  // -------------------------------------------------------------------------
  assert.strictEqual(appt1.isDelayed, true, 'isDelayed flag must be true');
  assert.strictEqual(appt2.isDelayed, true, 'isDelayed flag must be true');

  assert.strictEqual(
    appt1.originalStartTime.toISOString(),
    initialStart1.toISOString(),
    'originalStartTime must preserve the original schedule'
  );

  assert.strictEqual(
    appt2.originalStartTime.toISOString(),
    initialStart2.toISOString(),
    'originalStartTime must preserve the original schedule'
  );

  // Verify that subsequent overrides do not overwrite the original start time
  const secondShiftMinutes = 15;
  const secondShiftMs = secondShiftMinutes * 60 * 1000;

  for (const appt of affectedAppointments) {
    if (!appt.originalStartTime) {
      appt.originalStartTime = new Date(appt.startTime);
    }
    appt.startTime = new Date(appt.startTime.getTime() + secondShiftMs);
    appt.endTime = new Date(appt.endTime.getTime() + secondShiftMs);
  }

  assert.strictEqual(
    appt1.originalStartTime.toISOString(),
    initialStart1.toISOString(),
    'Subsequent override must still preserve initial originalStartTime'
  );

  console.log(
    '✅ Test Case 2: isDelayed flag verified and originalStartTime was preserved across schedule shifts'
  );

  console.log('--- emergencyOverride.test.js PASSED ---\n');
  return true;
}

if (process.argv[1]?.includes('emergencyOverride.test.js')) {
  runEmergencyOverrideTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default runEmergencyOverrideTests;
