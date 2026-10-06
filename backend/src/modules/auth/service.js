import { createHash, randomBytes } from 'node:crypto';
import { ApiError } from '../../core/errors.js';
import { credentials } from '../../core/validation.js';
import { hashPassword, verifyPassword } from '../../core/passwords.js';

const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export const publicUser = (user) => ({ id: user.id, username: user.username, createdAt: user.createdAt });

export function createAuthService({ repositories, config, now }) {
  let dummyHash;
  return {
    async register(body) {
      const { username, password } = credentials(body, true);
      if (await repositories.users.findByUsername(username)) {
        throw new ApiError(409, 'USERNAME_TAKEN', 'Username is already registered.');
      }
      const passwordHash = await hashPassword(password);
      return publicUser(await repositories.users.create({ username, passwordHash, createdAt: now().toISOString() }));
    },
    async login(body, previousToken) {
      const { username, password } = credentials(body);
      const user = await repositories.users.findByUsername(username);
      // Use a real password derivation for missing accounts as well.
      if (!user) dummyHash ??= hashPassword(randomBytes(32).toString('hex'));
      const valid = await verifyPassword(password, user?.passwordHash ?? await dummyHash);
      if (!user || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Username or password is incorrect.');
      if (previousToken) await repositories.sessions.delete(tokenHash(previousToken));
      const token = randomBytes(32).toString('hex');
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + config.sessionTtlSeconds * 1000);
      await repositories.sessions.create({
        tokenHash: tokenHash(token), userId: user.id,
        createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(),
      });
      return { token, user: publicUser(user), expiresAt: expiresAt.toISOString() };
    },
    async authenticate(token) {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
      }
      const session = await repositories.sessions.findActive(tokenHash(token), now().toISOString());
      const user = session && await repositories.users.findById(session.userId);
      if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
      return { user: publicUser(user), expiresAt: session.expiresAt };
    },
    async logout(token) { await repositories.sessions.delete(tokenHash(token)); },
  };
}
