import mongoose from 'mongoose';

/**
 * Resource Schema
 * Represents hospital physical assets: consultation rooms, imaging machines, OTs, etc.
 */
const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: [
          'consultation_room',
          'mri',
          'ct_scan',
          'xray',
          'ultrasound',
          'operation_theater',
        ],
        message: '{VALUE} is not a valid resource type',
      },
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    isOperational: {
      type: Boolean,
      default: true,
    },
    currentStatus: {
      type: String,
      enum: {
        values: ['available', 'occupied', 'sanitizing', 'maintenance'],
        message: '{VALUE} is not a valid status',
      },
      default: 'available',
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

// Index for quick resource status lookup and filtering
resourceSchema.index({ type: 1, currentStatus: 1, isOperational: 1 });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
