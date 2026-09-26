import express from 'express';
import { getLiveQueue } from '../controllers/queueController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/queue/live
 * @desc    Get live hospital queue metrics and waiting tickets
 * @access  Private (All authenticated roles or public display token)
 */
router.get('/live', protect, getLiveQueue);

export default router;
