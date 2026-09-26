import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Resource from './models/Resource.js';
import Appointment from './models/Appointment.js';
import MedicalRecord from './models/MedicalRecord.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hospital_ai_db';

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected.');

    // Clear existing data
    console.log('[Seed] Clearing existing collections...');
    await User.deleteMany({});
    await Resource.deleteMany({});
    await Appointment.deleteMany({});
    await MedicalRecord.deleteMany({});
    console.log('[Seed] Collections cleared.');

    // 1. Create Resources
    console.log('[Seed] Creating hospital resources...');
    const resources = await Resource.create([
      {
        name: 'Consultation Room 101',
        type: 'consultation_room',
        department: 'Cardiology',
        isOperational: true,
        currentStatus: 'available',
      },
      {
        name: 'Consultation Room 102',
        type: 'consultation_room',
        department: 'Neurology',
        isOperational: true,
        currentStatus: 'occupied',
      },
      {
        name: 'Consultation Room 103',
        type: 'consultation_room',
        department: 'Dermatology',
        isOperational: true,
        currentStatus: 'available',
      },
      {
        name: 'High-Field MRI Suite 1',
        type: 'mri',
        department: 'Radiology',
        isOperational: true,
        currentStatus: 'available',
      },
      {
        name: '64-Slice CT Scanner A',
        type: 'ct_scan',
        department: 'Radiology',
        isOperational: true,
        currentStatus: 'maintenance',
      },
      {
        name: 'Digital X-Ray Bay 1',
        type: 'xray',
        department: 'Radiology',
        isOperational: true,
        currentStatus: 'available',
      },
      {
        name: 'Color Doppler Ultrasound 2',
        type: 'ultrasound',
        department: 'Diagnostics',
        isOperational: true,
        currentStatus: 'sanitizing',
      },
      {
        name: 'Operation Theater Alpha',
        type: 'operation_theater',
        department: 'Surgery',
        isOperational: true,
        currentStatus: 'available',
      },
    ]);
    console.log(`[Seed] Created ${resources.length} physical resources.`);

    // 2. Create Users
    console.log('[Seed] Creating demo users...');
    const plainPassword = 'password123';

    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const standardHours = weekDays.map((day) => ({
      dayOfWeek: day,
      startTime: '08:00',
      endTime: '18:00',
    }));

    // Doctors
    const doctor1 = await User.create({
      name: 'Dr. Gregory House',
      email: 'doctor@hospital.com',
      phone: '+1-555-0101',
      passwordHash: plainPassword,
      role: 'doctor',
      doctorProfile: {
        specialty: 'Cardiology',
        department: 'Cardiovascular Care',
        roomNumber: 'Rm-101',
        averageConsultationMins: 30,
        workingHours: standardHours,
      },
    });

    const doctor2 = await User.create({
      name: 'Dr. Allison Cameron',
      email: 'neurologist@hospital.com',
      phone: '+1-555-0102',
      passwordHash: plainPassword,
      role: 'doctor',
      doctorProfile: {
        specialty: 'Neurology',
        department: 'Neurosciences',
        roomNumber: 'Rm-102',
        averageConsultationMins: 25,
        workingHours: standardHours,
      },
    });

    const doctor3 = await User.create({
      name: 'Dr. Robert Chase',
      email: 'derma@hospital.com',
      phone: '+1-555-0103',
      passwordHash: plainPassword,
      role: 'doctor',
      doctorProfile: {
        specialty: 'Dermatology',
        department: 'Dermatology & Skin Clinic',
        roomNumber: 'Rm-103',
        averageConsultationMins: 20,
        workingHours: standardHours,
      },
    });

    // Patients
    const patient1 = await User.create({
      name: 'Sarah Connor',
      email: 'patient@example.com',
      phone: '+1-555-0201',
      passwordHash: plainPassword,
      role: 'patient',
      patientProfile: {
        dob: new Date('1988-06-20'),
        gender: 'female',
        bloodGroup: 'A+',
        allergies: ['Penicillin', 'Sulfa'],
        chronicConditions: ['Mild Asthma'],
        insurance: {
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'BCBS-987654321',
          verified: true,
        },
      },
    });

    const patient2 = await User.create({
      name: 'Michael Scott',
      email: 'michael.scott@example.com',
      phone: '+1-555-0202',
      passwordHash: plainPassword,
      role: 'patient',
      patientProfile: {
        dob: new Date('1975-03-15'),
        gender: 'male',
        bloodGroup: 'O+',
        allergies: ['Peanuts'],
        chronicConditions: ['Hypertension'],
        insurance: {
          provider: 'Aetna Healthcare',
          policyNumber: 'AET-4432190',
          verified: true,
        },
      },
    });

    const patient3 = await User.create({
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '+1-555-0203',
      passwordHash: plainPassword,
      role: 'patient',
      patientProfile: {
        dob: new Date('1994-11-08'),
        gender: 'female',
        bloodGroup: 'B+',
        allergies: [],
        chronicConditions: ['Migraine with Aura'],
        insurance: {
          provider: 'UnitedHealthcare',
          policyNumber: 'UHC-881273',
          verified: true,
        },
      },
    });

    // Admin
    const adminUser = await User.create({
      name: 'Hospital Administrator',
      email: 'admin@hospital.com',
      phone: '+1-555-0999',
      passwordHash: plainPassword,
      role: 'admin',
    });

    console.log('[Seed] Created Doctors, Patients, and Admin user.');

    // 3. Create Today's Appointments & Real-Time Queue
    console.log('[Seed] Generating sample appointments...');
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    // Appt 1: Currently in-consultation with doctor1
    const appt1Start = new Date(todayYear, todayMonth, todayDate, 9, 0, 0);
    const appt1End = new Date(todayYear, todayMonth, todayDate, 9, 30, 0);

    const appt1 = await Appointment.create({
      patientId: patient1._id,
      doctorId: doctor1._id,
      resourceId: resources[0]._id,
      startTime: appt1Start,
      endTime: appt1End,
      durationMinutes: 30,
      status: 'in-consultation',
      triage: {
        rawSymptoms: 'Recurrent chest tightness and elevated resting heart rate after exertion',
        urgencyLevel: 'urgent',
        aiSummary: 'Cardiovascular evaluation recommended for exertional chest tightness',
        recommendedSpecialty: 'Cardiology',
      },
      noShowProbability: 0.04,
    });

    // Medical Record for Appt 1 (draft)
    await MedicalRecord.create({
      appointmentId: appt1._id,
      patientId: patient1._id,
      doctorId: doctor1._id,
      rawTranscript: 'Doctor: Good morning Sarah. Tell me about the chest tightness you experienced. Sarah: It started last Thursday after climbing the stairs...',
      soapNote: {
        subjective: 'Patient reports exertional chest pressure and palpitation sensation over past 5 days.',
        objective: 'BP 132/84, HR 88 regular, heart sounds S1 S2 normal, no murmurs.',
        assessment: 'Atypical angina vs exertional tachycardia.',
        plan: 'Order ECG and Echocardiogram. Prescribe Metoprolol 25mg daily PRN. Re-evaluate in 2 weeks.',
      },
      prescriptions: [
        {
          medication: 'Metoprolol Tartrate',
          dosage: '25mg',
          frequency: 'Once daily morning',
          durationDays: 14,
        },
      ],
      isSignedByDoctor: false,
    });

    // Appt 2: Checked-in waiting
    const appt2Start = new Date(todayYear, todayMonth, todayDate, 10, 0, 0);
    const appt2End = new Date(todayYear, todayMonth, todayDate, 10, 30, 0);

    await Appointment.create({
      patientId: patient2._id,
      doctorId: doctor1._id,
      resourceId: resources[0]._id,
      startTime: appt2Start,
      endTime: appt2End,
      durationMinutes: 30,
      status: 'checked-in',
      triage: {
        rawSymptoms: 'Routine annual blood pressure checkup and mild dizziness',
        urgencyLevel: 'routine',
        aiSummary: 'Routine hypertension follow-up',
        recommendedSpecialty: 'Cardiology',
      },
      noShowProbability: 0.08,
    });

    // Appt 3: Scheduled later today
    const appt3Start = new Date(todayYear, todayMonth, todayDate, 11, 0, 0);
    const appt3End = new Date(todayYear, todayMonth, todayDate, 11, 25, 0);

    await Appointment.create({
      patientId: patient3._id,
      doctorId: doctor2._id,
      resourceId: resources[1]._id,
      startTime: appt3Start,
      endTime: appt3End,
      durationMinutes: 25,
      status: 'scheduled',
      triage: {
        rawSymptoms: 'Pulsating unilateral temple pain with visual flashing lights for 3 days',
        urgencyLevel: 'urgent',
        aiSummary: 'Acute migraine with aura symptoms requiring neurological evaluation',
        recommendedSpecialty: 'Neurology',
      },
      noShowProbability: 0.05,
    });

    console.log('[Seed] Database seeding completed successfully!');
    console.log('--------------------------------------------------');
    console.log('Demo Credentials:');
    console.log('  Patient: patient@example.com   | password: password123');
    console.log('  Doctor:  doctor@hospital.com    | password: password123');
    console.log('  Admin:   admin@hospital.com     | password: password123');
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
