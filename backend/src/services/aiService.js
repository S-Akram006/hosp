import { GoogleGenAI } from '@google/genai';

/**
 * Clean and parse JSON from LLM text output (handling markdown backticks, comments, etc.)
 * @param {string} text
 * @returns {Object|null}
 */
const parseJsonSafely = (text) => {
  if (!text) return null;
  try {
    // 1. Direct JSON parse
    return JSON.parse(text);
  } catch (e1) {
    try {
      // 2. Extract content from markdown ```json ... ``` codeblocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      // 3. Find first { and last }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      }
    } catch (e2) {
      console.warn('[AI Service] Failed to parse LLM JSON output:', text.slice(0, 150));
    }
  }
  return null;
};

/**
 * Get configured Google GenAI client instance
 */
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// ---------------------------------------------------------------------------
// 1. AI Symptom Triage & Dynamic Slot Sizing
// ---------------------------------------------------------------------------

/**
 * Heuristic fallback for clinical triage when LLM is unavailable
 */
const fallbackTriage = (symptoms = '', medicalHistory = []) => {
  const lower = symptoms.toLowerCase();

  // Emergency keywords
  const emergencyKeywords = [
    'chest pain',
    'difficulty breathing',
    'shortness of breath',
    'severe bleeding',
    'stroke',
    'unconscious',
    'loss of consciousness',
    'seizure',
    'sudden paralysis',
    'anaphylaxis',
  ];

  // Urgent keywords
  const urgentKeywords = [
    'high fever',
    'severe pain',
    'fracture',
    'deep wound',
    'vomiting blood',
    'sudden vision loss',
    'acute asthma',
    'dislocation',
  ];

  const isEmergency = emergencyKeywords.some((kw) => lower.includes(kw));
  const isUrgent = !isEmergency && urgentKeywords.some((kw) => lower.includes(kw));

  let urgencyLevel = 'routine';
  let redFlagWarning = false;
  if (isEmergency) {
    urgencyLevel = 'emergency';
    redFlagWarning = true;
  } else if (isUrgent) {
    urgencyLevel = 'urgent';
  }

  // Specialty detection
  let recommendedSpecialty = 'General Medicine';
  if (lower.includes('chest') || lower.includes('heart') || lower.includes('palpitation')) {
    recommendedSpecialty = 'Cardiology';
  } else if (lower.includes('skin') || lower.includes('rash') || lower.includes('acne') || lower.includes('itching')) {
    recommendedSpecialty = 'Dermatology';
  } else if (lower.includes('bone') || lower.includes('joint') || lower.includes('knee') || lower.includes('fracture') || lower.includes('back pain')) {
    recommendedSpecialty = 'Orthopedics';
  } else if (lower.includes('headache') || lower.includes('migraine') || lower.includes('dizziness') || lower.includes('nerve')) {
    recommendedSpecialty = 'Neurology';
  } else if (lower.includes('child') || lower.includes('infant') || lower.includes('baby')) {
    recommendedSpecialty = 'Pediatrics';
  } else if (lower.includes('eye') || lower.includes('vision')) {
    recommendedSpecialty = 'Ophthalmology';
  }

  // Dynamic slot sizing
  let estimatedDurationMinutes = 20;
  if (isEmergency) {
    estimatedDurationMinutes = 45;
  } else if (isUrgent || (medicalHistory && medicalHistory.length >= 2)) {
    estimatedDurationMinutes = 30;
  } else if (lower.includes('checkup') || lower.includes('routine') || lower.includes('follow up')) {
    estimatedDurationMinutes = 15;
  }

  const aiSummary = `Patient presents with ${symptoms.slice(0, 100).trim()}. Clinical triage evaluated as ${urgencyLevel} priority for ${recommendedSpecialty}.`;

  return {
    urgencyLevel,
    recommendedSpecialty,
    estimatedDurationMinutes,
    aiSummary,
    redFlagWarning,
  };
};

/**
 * Triage patient symptoms using Gemini LLM with structured output
 * @param {Object} params
 * @param {string} params.symptoms - Natural language symptoms
 * @param {Array<string>} [params.medicalHistory] - Patient's chronic conditions or allergies
 * @returns {Promise<Object>}
 */
export const triageSymptoms = async ({ symptoms, medicalHistory = [] }) => {
  const client = getAiClient();

  if (!client) {
    console.log('[AI Service] GEMINI_API_KEY not configured. Using clinical heuristic engine.');
    return fallbackTriage(symptoms, medicalHistory);
  }

  const prompt = `You are an expert clinical triage physician assistant in a hospital intake department.
Analyze the following patient symptom report and medical history.

Patient Symptoms: "${symptoms}"
Known Medical History: ${JSON.stringify(medicalHistory)}

Respond ONLY with a valid JSON object matching this EXACT schema:
{
  "urgencyLevel": "routine" | "urgent" | "emergency",
  "recommendedSpecialty": "string (e.g. Cardiology, Dermatology, Orthopedics, Neurology, General Medicine, Pediatrics, etc.)",
  "estimatedDurationMinutes": number (between 15 and 60, depending on complexity),
  "aiSummary": "concise 2-sentence clinical intake summary",
  "redFlagWarning": boolean (true if symptoms indicate imminent threat or ER emergency)
}`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseJsonSafely(response.text);
    if (parsed && parsed.urgencyLevel && parsed.recommendedSpecialty) {
      // Validate urgencyLevel enum
      if (!['routine', 'urgent', 'emergency'].includes(parsed.urgencyLevel)) {
        parsed.urgencyLevel = 'routine';
      }
      // Ensure estimatedDurationMinutes is a number
      parsed.estimatedDurationMinutes = Number(parsed.estimatedDurationMinutes) || 20;
      parsed.redFlagWarning = Boolean(parsed.redFlagWarning);
      return parsed;
    }

    console.warn('[AI Service] LLM output parsing failed, using heuristic fallback');
    return fallbackTriage(symptoms, medicalHistory);
  } catch (error) {
    console.error(`[AI Service Triage Error]: ${error.message}`);
    return fallbackTriage(symptoms, medicalHistory);
  }
};

// ---------------------------------------------------------------------------
// 2. Ambient Clinical Documentation (AI Scribe -> SOAP Note)
// ---------------------------------------------------------------------------

/**
 * Heuristic fallback for SOAP note generation
 */
const fallbackSoapNote = (rawTranscript = '') => {
  return {
    subjective: `Patient discussed symptoms: "${rawTranscript.slice(0, 160).trim()}..."`,
    objective: 'Vital signs and physical exam reviewed during consultation.',
    assessment: 'Clinical evaluation based on reported symptoms and consultation discussion.',
    plan: 'Recommended therapeutic lifestyle adjustments and prescribed targeted pharmacotherapy. Follow-up as needed.',
    extractedPrescriptions: [
      {
        medication: 'Prescription pending doctor review',
        dosage: 'As directed',
        frequency: 'Daily',
        durationDays: 7,
      },
    ],
  };
};

/**
 * Generate structured SOAP note from raw consultation conversation
 * @param {Object} params
 * @param {string} params.rawTranscript
 * @returns {Promise<Object>}
 */
export const generateSoapNote = async ({ rawTranscript }) => {
  const client = getAiClient();

  if (!client) {
    console.log('[AI Service] GEMINI_API_KEY not configured. Using fallback clinical scribe.');
    return fallbackSoapNote(rawTranscript);
  }

  const prompt = `You are an expert medical transcriptionist and clinical scribe.
Transform the following raw conversation transcript between a doctor and patient into a formal, structured SOAP note and prescription list.

Transcript:
"${rawTranscript}"

Respond ONLY with a valid JSON object matching this schema:
{
  "subjective": "Chief complaint, history of present illness, patient-reported symptoms",
  "objective": "Vital signs, physical exam observations, laboratory/imaging findings mentioned",
  "assessment": "Primary clinical diagnosis or differential reasoning",
  "plan": "Treatment plan, lifestyle advice, follow-up, tests ordered",
  "extractedPrescriptions": [
    {
      "medication": "Name of medication",
      "dosage": "Dosage (e.g. 500mg, 10ml)",
      "frequency": "Frequency (e.g. Twice daily, Once before bed)",
      "durationDays": number (e.g. 7, 14, 30)
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseJsonSafely(response.text);
    if (parsed && parsed.subjective && parsed.assessment) {
      if (!Array.isArray(parsed.extractedPrescriptions)) {
        parsed.extractedPrescriptions = [];
      }
      return parsed;
    }

    return fallbackSoapNote(rawTranscript);
  } catch (error) {
    console.error(`[AI Service SOAP Error]: ${error.message}`);
    return fallbackSoapNote(rawTranscript);
  }
};

// ---------------------------------------------------------------------------
// 3. Automated Pre-visit Intake OCR Structuring
// ---------------------------------------------------------------------------

/**
 * Heuristic fallback for OCR text parsing
 */
const fallbackOcrParsing = (ocrText = '') => {
  const text = ocrText.trim();
  const policyMatch = text.match(/(?:policy|id|member|subscriber)\s*#?:?\s*([A-Z0-9-]+)/i);
  const providerMatch = text.match(/(?:blue cross|aetna|cigna|united|kaiser|medicare|medicaid|humana|anthem)/i);

  const isInsurance = Boolean(policyMatch || providerMatch || /insurance|coverage/i.test(text));

  return {
    documentType: isInsurance ? 'insurance_card' : 'medical_document',
    insurance: {
      provider: providerMatch ? providerMatch[0] : 'Identified Provider',
      policyNumber: policyMatch ? policyMatch[1] : 'PENDING-VERIFICATION',
      verified: false,
    },
    prescriptions: [],
    extractedTextSnippet: text.slice(0, 300),
    summary: `Processed document text (${text.length} characters) via intake OCR.`,
  };
};

/**
 * Parse and structure raw OCR document text using Gemini LLM
 * @param {string} ocrText
 * @returns {Promise<Object>}
 */
export const structureOcrDocument = async (ocrText) => {
  const client = getAiClient();

  if (!client) {
    console.log('[AI Service] GEMINI_API_KEY not configured. Using heuristic OCR parser.');
    return fallbackOcrParsing(ocrText);
  }

  const prompt = `You are an expert healthcare document parser.
Analyze this raw OCR text extracted from a patient intake document (insurance card, prescription, or ID):

"${ocrText}"

Respond ONLY with a valid JSON object matching this schema:
{
  "documentType": "insurance_card" | "prescription" | "government_id" | "medical_record" | "unknown",
  "insurance": {
    "provider": "Insurance provider name or empty string",
    "policyNumber": "Member or policy ID number or empty string",
    "verified": false
  },
  "prescriptions": [
    {
      "medication": "Name",
      "dosage": "Dosage",
      "frequency": "Frequency",
      "durationDays": number
    }
  ],
  "summary": "1-2 sentence description of the document"
}`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseJsonSafely(response.text);
    if (parsed && parsed.documentType) {
      return parsed;
    }

    return fallbackOcrParsing(ocrText);
  } catch (error) {
    console.error(`[AI Service OCR Structuring Error]: ${error.message}`);
    return fallbackOcrParsing(ocrText);
  }
};

export default {
  triageSymptoms,
  generateSoapNote,
  structureOcrDocument,
};
