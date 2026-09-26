import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token containing userId and role
 * @param {string} userId - User's MongoDB ObjectId string
 * @param {string} role - User's role ('patient', 'doctor', 'admin')
 * @returns {string} Signed JWT token
 */
export const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'fallback_development_secret';
  const expiresIn = process.env.JWT_EXPIRE || '30d';

  return jwt.sign(
    {
      id: userId,
      role: role,
    },
    secret,
    {
      expiresIn,
    }
  );
};

export default generateToken;
