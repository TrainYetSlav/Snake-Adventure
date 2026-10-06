import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { readEnvironment } from '../src/config/environment.js';
import { gameRules } from '../src/config/game-rules.js';

// These coefficients exist only in tests. They are not proposed game balance values.
export function configuredRules() {
  const rules = structuredClone(gameRules);
  rules.version = 'test-v1';
  rules.classic.pointsPerFood = 10;
  rules.hunt.timeScoreFloor = 0;
  rules.hunt.preyCatalog = [
    { id: 'mouse', points: 10 }, { id: 'bird', points: 20 }, { id: 'bat', points: 30 },
  ];
  rules.hunt.levels = [
    { id: 'level-1', featuredPreyId: 'bird', preyCounts: { mouse: 2, bird: 8 }, timeBonusMax: 300, timePenaltyPerSecond: 5 },
    { id: 'level-2', featuredPreyId: 'bat', preyCounts: { mouse: 1, bird: 2, bat: 7 }, timeBonusMax: 400, timePenaltyPerSecond: 10 },
  ];
  return rules;
}

export async function harness(t, overrides = {}) {
  const config = { ...readEnvironment({}), authRateLimitMax: 1000, ...overrides.config };
  const app = createApp({ ...overrides, config });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  return {
    async request(path, { method = 'GET', body, cookie, origin = 'http://localhost:5173', headers = {} } = {}) {
      const requestHeaders = { ...headers };
      if (origin !== null) requestHeaders.Origin = origin;
      if (cookie) requestHeaders.Cookie = cookie;
      if (body !== undefined) requestHeaders['Content-Type'] ??= 'application/json';
      const response = await fetch(`${base}${path}`, {
        method, headers: requestHeaders,
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
      return {
        status: response.status, headers: response.headers,
        body: response.status === 204 ? null : await response.json(),
      };
    },
  };
}

export async function signIn(api, username = 'Player_One') {
  const password = 'snake-test-pass';
  await api.request('/auth/register', { method: 'POST', body: { username, password, confirmPassword: password } });
  const response = await api.request('/auth/login', { method: 'POST', body: { username, password } });
  if (response.status !== 200) throw new Error('Test login failed.');
  return { cookie: response.headers.get('set-cookie').split(';')[0], user: response.body.data.user };
}
