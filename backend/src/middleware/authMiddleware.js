import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware:
 * Validates JWT bearer token and attaches authenticated user document to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        res.status(401);
        throw new Error('Not authorized, token missing');
      }

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_development_secret'
      );

      // Attach user document (excluding passwordHash)
      const user = await User.findById(decoded.id).select('-passwordHash');

      if (!user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      req.user = user;
      return next();
    } catch (error) {
      res.status(401);
      return next(error);
    }
  }

  res.status(401);
  return next(new Error('Not authorized, no token provided'));
};

/**
 * RBAC authorization middleware:
 * Restricts access to specified roles
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'doctor')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized, user not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(
          `Access forbidden: role '${req.user.role}' is not authorized to perform this action`
        )
      );
    }

    next();
  };
};
