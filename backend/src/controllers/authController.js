import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

/**
 * @desc    Register a new user (patient, doctor, or admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = 'patient',
      doctorProfile,
      patientProfile,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      res.status(400);
      throw new Error('Please provide all required fields: name, email, phone, and password');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if user already exists with email or phone
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existingUser) {
      res.status(400);
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('An account with this email address already exists');
      } else {
        throw new Error('An account with this phone number already exists');
      }
    }

    // Validate role
    const validRoles = ['patient', 'doctor', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400);
      throw new Error(`Invalid role '${role}'. Supported roles are: ${validRoles.join(', ')}`);
    }

    // Build user object with role-specific profile data
    const userData = {
      name,
      email,
      phone,
      passwordHash: password, // will be encrypted via Mongoose pre-save hook
      role,
    };

    if (role === 'doctor') {
      userData.doctorProfile = doctorProfile || {};
    } else if (role === 'patient') {
      userData.patientProfile = patientProfile || {};
    }

    // Create user in DB
    const user = await User.create(userData);

    // Generate JWT
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    // Check for user and explicitly select passwordHash
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    // Convert to JSON (strips passwordHash)
    const userResponse = user.toJSON();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private (requires Bearer token)
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active doctors (with optional specialty query)
 * @route   GET /api/auth/doctors
 * @access  Private
 */
export const getDoctors = async (req, res, next) => {
  try {
    const { specialty } = req.query;
    const query = { role: 'doctor' };
    if (specialty) {
      query['doctorProfile.specialty'] = { $regex: specialty, $options: 'i' };
    }

    const doctors = await User.find(query).select('name email phone doctorProfile');

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
};

