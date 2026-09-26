/**
 * Strip NoSQL query injection characters ($ and .)
 * @param {*} target
 * @returns {*}
 */
const sanitizeNoSql = (target) => {
  if (target && typeof target === 'object' && !Array.isArray(target)) {
    const cleanObj = {};
    for (const [key, value] of Object.entries(target)) {
      if (!key.startsWith('$') && !key.includes('.')) {
        cleanObj[key] = sanitizeNoSql(value);
      }
    }
    return cleanObj;
  } else if (Array.isArray(target)) {
    return target.map(sanitizeNoSql);
  }
  return target;
};

/**
 * Basic XSS sanitizer stripping script tags and malicious attributes
 * @param {string} str
 * @returns {string}
 */
const sanitizeXssString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
};

const sanitizeXss = (target) => {
  if (typeof target === 'string') {
    return sanitizeXssString(target);
  } else if (target && typeof target === 'object' && !Array.isArray(target)) {
    const cleanObj = {};
    for (const [key, value] of Object.entries(target)) {
      cleanObj[key] = sanitizeXss(value);
    }
    return cleanObj;
  } else if (Array.isArray(target)) {
    return target.map(sanitizeXss);
  }
  return target;
};

/**
 * Express middleware for NoSQL and XSS data sanitization
 */
export const sanitizeData = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeXss(sanitizeNoSql(req.body));
  }
  if (req.query) {
    req.query = sanitizeXss(sanitizeNoSql(req.query));
  }
  if (req.params) {
    req.params = sanitizeXss(sanitizeNoSql(req.params));
  }
  next();
};

export default sanitizeData;
