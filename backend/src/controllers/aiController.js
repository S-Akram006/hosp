import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';
import {
  triageSymptoms,
  generateSoapNote,
  structureOcrDocument,
} from '../services/aiService.js';
import { extractTextFromImage, cleanupFile } from '../services/ocrService.js';

/**
 * @desc    AI Symptom Triage & Dynamic Slot Sizing
 * @route   POST /api/ai/triage
 * @access  Private (Patient, Admin)
 */
export const handleTriage = async (req, res, next) => {
  try {
    const { symptoms, medicalHistory } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      res.status(400);
      throw new Error('Please describe your symptoms in natural language');
    }

    // Auto-populate medical history from logged-in patient profile if not provided
    let patientHistory = medicalHistory;
    if (!patientHistory && req.user.role === 'patient' && req.user.patientProfile) {
      patientHistory = [
        ...(req.user.patientProfile.chronicConditions || []),
        ...(req.user.patientProfile.allergies?.map((a) => `Allergy: ${a}`) || []),
      ];
    }

    const triageResult = await triageSymptoms({
      symptoms: symptoms.trim(),
      medicalHistory: patientHistory || [],
    });

    res.status(200).json({
      success: true,
      message: 'Symptom triage completed',
      data: triageResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ambient Clinical Documentation (AI Scribe -> SOAP Note)
 * @route   POST /api/ai/generate-soap
 * @access  Private (Doctor only)
 */
export const handleGenerateSoap = async (req, res, next) => {
  try {
    const { rawTranscript, appointmentId } = req.body;

    if (!rawTranscript || typeof rawTranscript !== 'string') {
      res.status(400);
      throw new Error('Please provide the raw consultation transcript');
    }

    if (!appointmentId) {
      res.status(400);
      throw new Error('Appointment ID is required');
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      res.status(404);
      throw new Error(`Appointment not found with ID ${appointmentId}`);
    }

    // Ensure doctor is assigned to this appointment
    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Access forbidden: You can only generate SOAP notes for your assigned consultations');
    }

    // Run AI clinical scribe
    const soapData = await generateSoapNote({ rawTranscript });

    // Automatically create or update draft MedicalRecord linked to appointmentId
    let medicalRecord = await MedicalRecord.findOne({ appointmentId });

    if (!medicalRecord) {
      medicalRecord = new MedicalRecord({
        appointmentId,
        patientId: appointment.patientId,
        doctorId: req.user._id,
        rawTranscript,
        soapNote: {
          subjective: soapData.subjective || '',
          objective: soapData.objective || '',
          assessment: soapData.assessment || '',
          plan: soapData.plan || '',
        },
        prescriptions: soapData.extractedPrescriptions || [],
        isSignedByDoctor: false,
      });
    } else {
      medicalRecord.rawTranscript = rawTranscript;
      medicalRecord.soapNote = {
        subjective: soapData.subjective || '',
        objective: soapData.objective || '',
        assessment: soapData.assessment || '',
        plan: soapData.plan || '',
      };
      if (soapData.extractedPrescriptions && soapData.extractedPrescriptions.length > 0) {
        medicalRecord.prescriptions = soapData.extractedPrescriptions;
      }
    }

    await medicalRecord.save();

    res.status(200).json({
      success: true,
      message: 'Ambient SOAP note generated and medical record draft updated',
      data: {
        soapNote: soapData,
        medicalRecord,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Automated Pre-visit Intake OCR & Document Structuring
 * @route   POST /api/ai/ocr-intake
 * @access  Private (Patient, Admin)
 */
export const handleOcrIntake = async (req, res, next) => {
  let filePath = null;
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image or document file (e.g. insurance card or prescription)');
    }

    filePath = req.file.path;

    // 1. OCR text extraction via Tesseract
    const rawOcrText = await extractTextFromImage(filePath);

    // 2. LLM or heuristic field structuring
    const structuredData = await structureOcrDocument(rawOcrText);

    // 3. Clean up uploaded temporary file
    await cleanupFile(filePath);
    filePath = null;

    res.status(200).json({
      success: true,
      message: 'Intake document processed and structured successfully',
      data: {
        rawOcrText,
        structuredData,
      },
    });
  } catch (error) {
    if (filePath) {
      await cleanupFile(filePath);
    }
    next(error);
  }
};

/**
 * @desc    Sign and finalize clinical SOAP note and prescriptions
 * @route   PUT /api/ai/records/:appointmentId/sign
 * @access  Private (Doctor only)
 */
export const signMedicalRecord = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { soapNote, prescriptions } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      res.status(404);
      throw new Error(`Appointment not found with id of ${appointmentId}`);
    }

    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Access forbidden: Only assigned physician can sign this clinical record');
    }

    let record = await MedicalRecord.findOne({ appointmentId });
    if (!record) {
      record = new MedicalRecord({
        appointmentId,
        patientId: appointment.patientId,
        doctorId: req.user._id,
      });
    }

    if (soapNote) record.soapNote = soapNote;
    if (prescriptions) record.prescriptions = prescriptions;
    record.isSignedByDoctor = true;
    record.signedAt = new Date();

    await record.save();

    // Transition appointment to completed
    appointment.status = 'completed';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Clinical record finalized, digitally signed, and appointment completed',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleTriage,
  handleGenerateSoap,
  handleOcrIntake,
  signMedicalRecord,
};
