import mongoose from 'mongoose';

/**
 * SOAP Note Sub-schema
 * Structured clinical documentation
 */
const soapNoteSchema = new mongoose.Schema(
  {
    subjective: {
      type: String,
      trim: true,
      default: '',
    },
    objective: {
      type: String,
      trim: true,
      default: '',
    },
    assessment: {
      type: String,
      trim: true,
      default: '',
    },
    plan: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

/**
 * Prescription Sub-schema
 */
const prescriptionSchema = new mongoose.Schema(
  {
    medication: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      trim: true,
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [1, 'Duration must be at least 1 day'],
    },
  },
  { _id: false }
);

/**
 * Medical Record Schema
 */
const medicalRecordSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment ID is required'],
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    rawTranscript: {
      type: String,
      default: '',
    },
    soapNote: {
      type: soapNoteSchema,
      default: () => ({}),
    },
    prescriptions: {
      type: [prescriptionSchema],
      default: [],
    },
    isSignedByDoctor: {
      type: Boolean,
      default: false,
    },
    signedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

export default MedicalRecord;
