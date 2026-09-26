import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter:
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in automated test runs
});

/**
 * Strict Authentication rate limiter:
 * 5 attempts per 15 minutes in production; relaxed in development for demo testing
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * AI Engine rate limiter:
 * 20 requests per 15 minutes for /api/ai/* (Triage, SOAP Scribe, OCR)
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI compute rate limit reached. Please wait a few minutes before next request.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

export default {
  generalLimiter,
  authLimiter,
  aiLimiter,
};
