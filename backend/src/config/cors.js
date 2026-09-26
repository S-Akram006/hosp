/**
 * Strict and Dynamic CORS Configuration supporting Vercel & Localhost
 */
export const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  // 1. Allow all Vercel deployments (production, staging, and preview URLs)
  if (/^https:\/\/[a-zA-Z0-9_\-\.]+\.vercel\.app$/.test(origin)) {
    return true;
  }

  // 2. Allow configured CLIENT_URL (supports single URL or comma-separated list)
  const clientUrls = (process.env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  if (clientUrls.includes(origin)) {
    return true;
  }

  // 3. Localhost and development origins
  const devOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  if (devOrigins.includes(origin)) {
    return true;
  }

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or curl/mobile requests without origin in non-production
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: origin '${origin}' is not authorized`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
};

export default corsOptions;
