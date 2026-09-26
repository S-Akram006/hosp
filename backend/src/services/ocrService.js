import Tesseract from 'tesseract.js';
import fs from 'fs';

/**
 * Extract raw text from an image using Tesseract.js OCR
 * @param {string} filePath - Absolute or relative path to image file
 * @returns {Promise<string>} Extracted OCR text
 */
export const extractTextFromImage = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const {
      data: { text },
    } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}, // silence progress in production
    });

    return text ? text.trim() : '';
  } catch (error) {
    console.error(`[OCR Error] Failed to extract text from ${filePath}: ${error.message}`);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
};

/**
 * Clean up / delete temporary uploaded file
 * @param {string} filePath
 */
export const cleanupFile = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.warn(`[Cleanup Warning] Could not remove temp file ${filePath}: ${error.message}`);
  }
};

export default {
  extractTextFromImage,
  cleanupFile,
};
