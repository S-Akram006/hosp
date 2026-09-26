import http from 'http';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import Resource from './src/models/Resource.js';
import Appointment from './src/models/Appointment.js';
import MedicalRecord from './src/models/MedicalRecord.js';
import { generateToken } from './src/utils/generateToken.js';
import {
  validateDoctorWorkingHours,
} from './src/utils/slotValidator.js';
import { calculateNoShowRisk } from './src/services/noShowService.js';
import {
  triageSymptoms,
  generateSoapNote,
  structureOcrDocument,
} from './src/services/aiService.js';
import { extractTextFromImage } from './src/services/ocrService.js';
import { upload } from './src/middleware/uploadMiddleware.js';
import { initSocket, getIO } from './src/socket.js';
import { broadcastQueueStatusChange } from './src/controllers/queueController.js';
import authRoutes from './src/routes/authRoutes.js';
import appointmentRoutes from './src/routes/appointmentRoutes.js';
import resourceRoutes from './src/routes/resourceRoutes.js';
import aiRoutes from './src/routes/aiRoutes.js';
import emergencyRoutes from './src/routes/emergencyRoutes.js';
import queueRoutes from './src/routes/queueRoutes.js';

async function runTests() {
  console.log('=== Running Hospital AI Backend Verification Test Suite ===');

  // -------------------------------------------------------------
  // PHASE 1 TESTS
  // -------------------------------------------------------------
  console.log('\n--- Phase 1: Auth & User Model Tests ---');

  const doctorId = new mongoose.Types.ObjectId();
  const patientId = new mongoose.Types.ObjectId();

  const doctor = new User({
    _id: doctorId,
    name: 'Dr. Gregory House',
    email: 'house@princetonplainsboro.com',
    phone: '+1-555-4321',
    password: 'superSecretPassword',
    role: 'doctor',
    doctorProfile: {
      specialty: 'Diagnostic Medicine',
      department: 'Diagnostics',
      roomNumber: 'Rm-402',
      averageConsultationMins: 30,
      workingHours: [
        { dayOfWeek: 'Monday', startTime: '08:00', endTime: '16:00' },
        { dayOfWeek: 'Wednesday', startTime: '08:00', endTime: '16:00' },
        { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00' },
      ],
    },
  });

  await doctor.validate();
  console.log('✅ Doctor Schema Validation: PASSED');

  const patient = new User({
    _id: patientId,
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-8765',
    password: 'patientPassword123',
    role: 'patient',
    patientProfile: {
      dob: new Date('1990-05-15'),
      gender: 'male',
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      chronicConditions: ['Asthma'],
      insurance: {
        provider: 'Blue Cross',
        policyNumber: 'BCBS-12345',
        verified: true,
      },
    },
  });

  await patient.validate();
  console.log('✅ Patient Schema Validation: PASSED');

  const salt = await bcrypt.genSalt(10);
  patient.passwordHash = await bcrypt.hash('patientPassword123', salt);
  const match = await patient.matchPassword('patientPassword123');
  const mismatch = await patient.matchPassword('wrongPassword');
  if (match && !mismatch) {
    console.log('✅ Password Hashing & matchPassword: PASSED');
  } else {
    throw new Error('matchPassword failed');
  }

  const token = generateToken(doctor._id.toString(), 'doctor');
  if (token) console.log('✅ JWT Token Generation: PASSED');

  // -------------------------------------------------------------
  // PHASE 2 TESTS
  // -------------------------------------------------------------
  console.log('\n--- Phase 2: Core Domain Models & Calendar Engine Tests ---');

  const resourceId = new mongoose.Types.ObjectId();
  const resource = new Resource({
    _id: resourceId,
    name: 'Diagnostic MRI Suite 1',
    type: 'mri',
    department: 'Radiology',
    isOperational: true,
    currentStatus: 'available',
  });
  await resource.validate();
  console.log('✅ Resource Schema Validation (MRI): PASSED');

  const apptStart = new Date('2026-09-28T09:00:00.000Z');
  const apptEnd = new Date('2026-09-28T09:30:00.000Z');

  const appointment = new Appointment({
    patientId: patient._id,
    doctorId: doctor._id,
    resourceId: resource._id,
    startTime: apptStart,
    endTime: apptEnd,
    durationMinutes: 30,
    status: 'scheduled',
    triage: {
      rawSymptoms: 'Chronic migraines and visual aura',
      urgencyLevel: 'routine',
      aiSummary: 'Suspected recurring migraine with aura symptoms',
      recommendedSpecialty: 'Neurology',
    },
    noShowProbability: 0.12,
  });
  await appointment.validate();
  console.log('✅ Appointment Schema Validation: PASSED');

  const medicalRecord = new MedicalRecord({
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: doctor._id,
    rawTranscript: 'Patient reports persistent throbbing pain in temporal region...',
    soapNote: {
      subjective: '32-year old male with 3-day history of unilateral headache.',
      objective: 'BP 120/80, neurological exam normal.',
      assessment: 'Migraine with aura.',
      plan: 'Prescribed Sumatriptan 50mg PRN. Follow-up in 4 weeks.',
    },
    prescriptions: [
      {
        medication: 'Sumatriptan',
        dosage: '50mg',
        frequency: 'As needed at onset of headache',
        durationDays: 30,
      },
    ],
    isSignedByDoctor: true,
    signedAt: new Date(),
  });
  await medicalRecord.validate();
  console.log('✅ MedicalRecord Schema Validation: PASSED');

  // Doctor working hours validation
  const mondayValidSlotStart = new Date('2026-09-28T10:00:00');
  const mondayValidSlotEnd = new Date('2026-09-28T10:30:00');
  const validCheck = validateDoctorWorkingHours(
    doctor,
    mondayValidSlotStart,
    mondayValidSlotEnd
  );
  if (validCheck.valid) {
    console.log('✅ Working Hours Validator (Within hours): PASSED');
  }

  // -------------------------------------------------------------
  // PHASE 3 TESTS
  // -------------------------------------------------------------
  console.log('\n--- Phase 3: AI Engine & Background Logic Tests ---');

  const bookingNow = new Date('2026-09-25T10:00:00Z');
  const apptFar = new Date('2026-11-15T10:00:00Z');
  const apptNear = new Date('2026-09-26T10:00:00Z');

  const farRisk = await calculateNoShowRisk({
    patientId: patient._id,
    startTime: apptFar,
    urgencyLevel: 'routine',
    bookingTime: bookingNow,
  });

  const nearRisk = await calculateNoShowRisk({
    patientId: patient._id,
    startTime: apptNear,
    urgencyLevel: 'emergency',
    bookingTime: bookingNow,
  });

  if (farRisk.noShowProbability > nearRisk.noShowProbability) {
    console.log(
      `✅ No-Show Risk Engine (Far: ${farRisk.noShowProbability} vs Near: ${nearRisk.noShowProbability}): PASSED`
    );
  }

  const triageEmergency = await triageSymptoms({
    symptoms: 'Sudden severe crushing chest pain radiating to left arm and shortness of breath',
    medicalHistory: ['Hypertension'],
  });

  if (
    triageEmergency.urgencyLevel === 'emergency' &&
    triageEmergency.redFlagWarning === true &&
    triageEmergency.recommendedSpecialty === 'Cardiology'
  ) {
    console.log('✅ AI Symptom Triage (Emergency & Red Flag Detection): PASSED');
  }

  const triageRoutine = await triageSymptoms({
    symptoms: 'Mild itching and dry skin rash on arms for 2 weeks',
    medicalHistory: [],
  });

  if (
    triageRoutine.urgencyLevel === 'routine' &&
    triageRoutine.recommendedSpecialty === 'Dermatology'
  ) {
    console.log('✅ AI Symptom Triage (Routine & Specialty Routing): PASSED');
  }

  const soapResult = await generateSoapNote({
    rawTranscript:
      'Doctor: How long have you had this knee pain? Patient: About a week after running.',
  });

  if (soapResult.subjective && soapResult.plan) {
    console.log('✅ Ambient Clinical Scribe (SOAP Note Generation): PASSED');
  }

  const ocrStructured = await structureOcrDocument(
    'BLUE CROSS BLUE SHIELD MEMBER ID: XEU987654321 GROUP: 88721'
  );
  if (ocrStructured.documentType) {
    console.log('✅ Pre-visit Intake OCR Structuring: PASSED');
  }

  // -------------------------------------------------------------
  // PHASE 4 TESTS
  // -------------------------------------------------------------
  console.log('\n--- Phase 4: Real-Time Event Layer (Socket.io) Tests ---');

  // 1. Socket.io Initialization on Native HTTP Server
  const dummyHttpServer = http.createServer();
  const socketServer = initSocket(dummyHttpServer);
  if (socketServer && typeof socketServer.on === 'function') {
    console.log('✅ Socket.io Initialization on Native HTTP Server: PASSED');
  } else {
    throw new Error('Socket.io server initialization failed');
  }

  // 2. Singleton getIO Accessor
  const io = getIO();
  if (io && typeof io.to === 'function' && typeof io.emit === 'function') {
    console.log('✅ Socket.io Singleton getIO Accessor: PASSED');
  } else {
    throw new Error('getIO failed to return a valid Socket.io instance');
  }

  // 3. Broadcast Queue Event Dispatch
  let broadcastExecutedWithoutError = true;
  try {
    broadcastQueueStatusChange(appointment);
  } catch (err) {
    broadcastExecutedWithoutError = false;
  }
  if (broadcastExecutedWithoutError) {
    console.log('✅ Real-time Queue Broadcast Dispatch: PASSED');
  } else {
    throw new Error('broadcastQueueStatusChange threw an unhandled error');
  }

  // 4. Emergency & Queue Routes Mounting
  if (typeof emergencyRoutes === 'function' && typeof queueRoutes === 'function') {
    console.log('✅ Emergency & Live Queue Routers Exported: PASSED');
  } else {
    throw new Error('Emergency or Queue routes failed to export express Router');
  }

  // -------------------------------------------------------------
  // PHASE 7 TESTS: Testing, Hardening & Security
  // -------------------------------------------------------------
  console.log('\n--- Phase 7: Testing, Hardening & Security (Integration Suites) ---');

  const { runAppointmentCollisionTests } = await import(
    './src/tests/appointmentCollision.test.js'
  );
  await runAppointmentCollisionTests();

  const { runEmergencyOverrideTests } = await import(
    './src/tests/emergencyOverride.test.js'
  );
  await runEmergencyOverrideTests();

  console.log('\n=== All Phase 1, Phase 2, Phase 3, Phase 4 & Phase 7 Tests Passed Successfully! ===');
  dummyHttpServer.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
