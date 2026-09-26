import mongoose from 'mongoose';

/**
 * Triage Sub-schema for AI-driven triage metadata
 */
const triageSchema = new mongoose.Schema(
  {
    rawSymptoms: {
      type: String,
      trim: true,
      default: '',
    },
    urgencyLevel: {
      type: String,
      enum: {
        values: ['routine', 'urgent', 'emergency'],
        message: '{VALUE} is not a valid urgency level',
      },
      default: 'routine',
    },
    aiSummary: {
      type: String,
      trim: true,
      default: '',
    },
    recommendedSpecialty: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

/**
 * Appointment Schema
 */
const appointmentSchema = new mongoose.Schema(
  {
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
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      default: null,
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [480, 'Duration cannot exceed 8 hours'],
    },
    status: {
      type: String,
      enum: {
        values: [
          'scheduled',
          'checked-in',
          'in-consultation',
          'completed',
          'bumped',
          'no-show',
          'cancelled',
        ],
        message: '{VALUE} is not a valid appointment status',
      },
      default: 'scheduled',
      index: true,
    },
    triage: {
      type: triageSchema,
      default: () => ({}),
    },
    noShowProbability: {
      type: Number,
      min: [0, 'Probability cannot be less than 0'],
      max: [1, 'Probability cannot exceed 1'],
      default: 0.05,
    },
    originalStartTime: {
      type: Date,
      default: null,
    },
    isDelayed: {
      type: Boolean,
      default: false,
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

// Compound index for schedule collision queries
appointmentSchema.index({ doctorId: 1, startTime: 1, endTime: 1, status: 1 });
appointmentSchema.index({ resourceId: 1, startTime: 1, endTime: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
