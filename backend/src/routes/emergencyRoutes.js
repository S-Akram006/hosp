import express from 'express';
import { triggerEmergencyOverride } from '../controllers/emergencyController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All emergency routes require authentication
router.use(protect);

/**
 * @route   POST /api/emergency/override
 * @desc    Trigger emergency override shifting doctor's upcoming schedule
 * @access  Private (Doctor, Admin)
 */
router.post('/override', authorize('doctor', 'admin'), triggerEmergencyOverride);

export default router;
