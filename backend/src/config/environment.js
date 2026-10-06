function integer(value, fallback, name, min, max) {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return result;
}

export function readEnvironment(env = process.env) {
  const cookieSecure = env.COOKIE_SECURE ?? 'false';
  if (!['true', 'false'].includes(cookieSecure)) {
    throw new Error('COOKIE_SECURE must be true or false.');
  }
  const cookieSameSite = env.COOKIE_SAME_SITE ?? 'lax';
  if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  if (cookieSameSite === 'none' && cookieSecure !== 'true') {
    throw new Error('SameSite=None requires COOKIE_SECURE=true.');
  }
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((value) => value.trim()).filter(Boolean);
  for (const origin of allowedOrigins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths.');
    }
  }
  return {
    host: env.HOST ?? '127.0.0.1',
    port: integer(env.PORT, 3000, 'PORT', 1, 65535),
    allowedOrigins,
    sessionTtlSeconds: integer(env.SESSION_TTL_SECONDS, 604800, 'SESSION_TTL_SECONDS', 60, 2592000),
    cookieName: 'snake_session',
    cookieSecure: cookieSecure === 'true',
    cookieSameSite,
    authRateLimitMax: integer(env.AUTH_RATE_LIMIT_MAX, 20, 'AUTH_RATE_LIMIT_MAX', 1, 10000),
    authRateLimitWindowSeconds: integer(env.AUTH_RATE_LIMIT_WINDOW_SECONDS, 900, 'AUTH_RATE_LIMIT_WINDOW_SECONDS', 1, 86400),
  };
}
