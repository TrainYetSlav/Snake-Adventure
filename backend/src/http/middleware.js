import { randomUUID } from 'node:crypto';
import { ApiError } from '../core/errors.js';

export function requestContext(req, res, next) {
  req.requestId = randomUUID();
  res.set({
    'X-Request-Id': req.requestId,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  next();
}

export function corsAndOrigin(config) {
  const allowed = new Set(config.allowedOrigins);
  return (req, res, next) => {
    const origin = req.get('Origin');
    const sameOrigin = `${req.protocol}://${req.get('Host')}`;
    if (origin && !allowed.has(origin) && origin !== sameOrigin) {
      return next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'));
    }
    res.vary('Origin');
    if (origin) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'X-Request-Id, Retry-After',
      });
    }
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      });
      return res.sendStatus(204);
    }
    next();
  };
}

export function requireJson(req, res, next) {
  if (req.method === 'POST' && !req.is('application/json')) {
    return next(new ApiError(415, 'JSON_REQUIRED', 'POST requests require Content-Type: application/json and a JSON body.'));
  }
  // A JSON-only write API requires a browser preflight when called from another origin.
  if (req.method === 'POST' && !req.get('Origin') && req.get('Sec-Fetch-Site') === 'cross-site') {
    return next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Cross-site writes require an allowed origin.'));
  }
  next();
}

export function readCookie(req, name) {
  for (const item of (req.get('Cookie') ?? '').split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(item.slice(separator + 1).trim()); }
    catch { return undefined; }
  }
  return undefined;
}

export function sessionCookieOptions(config) {
  return { httpOnly: true, secure: config.cookieSecure, sameSite: config.cookieSameSite, path: '/api/v1' };
}

export function authenticate(auth, config) {
  return async (req, res, next) => {
    req.sessionToken = readCookie(req, config.cookieName);
    req.auth = await auth.authenticate(req.sessionToken);
    next();
  };
}

export function authRateLimit({ config, now }) {
  const buckets = new Map();
  return (req, res, next) => {
    const timestamp = now().getTime();
    for (const [key, value] of buckets) {
      if (value.resetAt <= timestamp) buckets.delete(key);
    }
    const key = req.ip;
    const bucket = buckets.get(key) ?? { count: 0, resetAt: timestamp + config.authRateLimitWindowSeconds * 1000 };
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > config.authRateLimitMax) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - timestamp) / 1000)));
      return next(new ApiError(429, 'RATE_LIMITED', 'Too many authentication attempts. Please try again later.'));
    }
    next();
  };
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let apiError = error;
  if (error.type === 'entity.parse.failed') {
    apiError = new ApiError(400, 'INVALID_JSON', 'Request body must contain valid JSON.');
  } else if (error.type === 'entity.too.large') {
    apiError = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'JSON body exceeds the 64 KB limit.');
  } else if (error.type === 'charset.unsupported' || error.type === 'encoding.unsupported') {
    apiError = new ApiError(415, 'UNSUPPORTED_ENCODING', 'Use UTF-8 JSON without unsupported content encodings.');
  }
  if (!(apiError instanceof ApiError)) {
    console.error(`[${req.requestId}] Unexpected backend error:`, error.message);
    apiError = new ApiError(500, 'INTERNAL_ERROR', 'An unexpected server error occurred.');
  }
  res.status(apiError.status).json({
    error: {
      code: apiError.code, message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
      requestId: req.requestId,
    },
  });
}
