import test from 'node:test';
import assert from 'node:assert/strict';
import { readEnvironment } from '../src/config/environment.js';

test('environment validation rejects wildcard origins and insecure cross-site cookies', () => {
  assert.throws(() => readEnvironment({ ALLOWED_ORIGINS: '*' }));
  assert.throws(() => readEnvironment({ ALLOWED_ORIGINS: 'https://example.com/path' }));
  assert.throws(() => readEnvironment({ COOKIE_SAME_SITE: 'none', COOKIE_SECURE: 'false' }));
  assert.throws(() => readEnvironment({ PORT: 'not-a-port' }));
  assert.throws(() => readEnvironment({ COOKIE_SECURE: 'maybe' }));
  assert.equal(readEnvironment({ COOKIE_SAME_SITE: 'none', COOKIE_SECURE: 'true' }).cookieSecure, true);
});
