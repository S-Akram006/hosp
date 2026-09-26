import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  getDoctors,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   GET /api/auth/doctors
 * @desc    List all doctors
 * @access  Private
 */
router.get('/doctors', protect, getDoctors);

export default router;
