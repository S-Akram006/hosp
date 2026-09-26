import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Working hours sub-schema for doctor
 */
const workingHourSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    startTime: {
      type: String, // format: "09:00"
      required: true,
    },
    endTime: {
      type: String, // format: "17:00"
      required: true,
    },
  },
  { _id: false }
);

/**
 * Doctor Profile sub-schema
 */
const doctorProfileSchema = new mongoose.Schema(
  {
    specialty: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    roomNumber: {
      type: String,
      trim: true,
      default: '',
    },
    averageConsultationMins: {
      type: Number,
      default: 20,
      min: [5, 'Consultation duration must be at least 5 minutes'],
      max: [180, 'Consultation duration cannot exceed 180 minutes'],
    },
    workingHours: {
      type: [workingHourSchema],
      default: [],
    },
  },
  { _id: false }
);

/**
 * Patient Insurance sub-schema
 */
const insuranceSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      trim: true,
      default: '',
    },
    policyNumber: {
      type: String,
      trim: true,
      default: '',
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/**
 * Patient Profile sub-schema
 */
const patientProfileSchema = new mongoose.Schema(
  {
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    insurance: {
      type: insuranceSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

/**
 * Unified User Schema
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['patient', 'doctor', 'admin'],
        message: '{VALUE} is not a supported role',
      },
      default: 'patient',
      required: true,
    },
    doctorProfile: {
      type: doctorProfileSchema,
      default: undefined,
    },
    patientProfile: {
      type: patientProfileSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Virtual password field for seamless setting
 */
userSchema.virtual('password')
  .set(function (password) {
    this._password = password;
    this.passwordHash = password;
  })
  .get(function () {
    return this._password;
  });

/**
 * Pre-save hook: Hash password with bcryptjs before saving
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compare entered password with stored password hash
 * @param {string} enteredPassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) {
    throw new Error('passwordHash field must be selected to compare password');
  }
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

export default User;
