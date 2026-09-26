import express from 'express';
import {
  handleTriage,
  handleGenerateSoap,
  handleOcrIntake,
  signMedicalRecord,
} from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All AI engine routes require authentication
router.use(protect);

/**
 * @route   POST /api/ai/triage
 * @desc    AI Symptom Triage & Dynamic Slot Sizing
 * @access  Private (Patient, Admin)
 */
router.post('/triage', authorize('patient', 'admin'), handleTriage);

/**
 * @route   POST /api/ai/generate-soap
 * @desc    Ambient Clinical Scribe generating SOAP Note & Prescription Draft
 * @access  Private (Doctor only)
 */
router.post('/generate-soap', authorize('doctor'), handleGenerateSoap);

/**
 * @route   PUT /api/ai/records/:appointmentId/sign
 * @desc    Sign & finalize clinical SOAP note and complete consultation
 * @access  Private (Doctor only)
 */
router.put('/records/:appointmentId/sign', authorize('doctor'), signMedicalRecord);

/**
 * @route   POST /api/ai/ocr-intake
 * @desc    Automated Pre-visit Intake OCR & Document Structuring
 * @access  Private (Patient, Admin)
 */
router.post('/ocr-intake', authorize('patient', 'admin'), upload.single('document'), handleOcrIntake);

export default router;
