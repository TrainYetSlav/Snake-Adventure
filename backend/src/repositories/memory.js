import { randomUUID } from 'node:crypto';
import { ApiError } from '../core/errors.js';

// These adapters are temporary. They do not create a database or persist files.
export function createMemoryRepositories() {
  const usersById = new Map();
  const usersByName = new Map();
  const sessions = new Map();
  const runs = new Map();
  const records = new Map();
  const copy = (value) => value === undefined ? null : structuredClone(value);
  const runKey = (userId, runId) => `${userId}:${runId}`;
  const recordKey = (userId, mode) => `${userId}:${mode}`;

  return {
    users: {
      async findByUsername(username) { return copy(usersByName.get(username.toLowerCase())); },
      async findById(id) { return copy(usersById.get(id)); },
      async create({ username, passwordHash, createdAt }) {
        const key = username.toLowerCase();
        if (usersByName.has(key)) throw new ApiError(409, 'USERNAME_TAKEN', 'Username is already registered.');
        const user = { id: randomUUID(), username, passwordHash, createdAt };
        usersById.set(user.id, user);
        usersByName.set(key, user);
        return copy(user);
      },
    },
    sessions: {
      async create(session) {
        // Remove expired entries before allocating another session.
        for (const [key, value] of sessions) {
          if (value.expiresAt <= session.createdAt) sessions.delete(key);
        }
        sessions.set(session.tokenHash, copy(session));
      },
      async findActive(tokenHash, now) {
        const session = sessions.get(tokenHash);
        if (!session || session.expiresAt <= now) {
          sessions.delete(tokenHash);
          return null;
        }
        return copy(session);
      },
      async delete(tokenHash) { sessions.delete(tokenHash); },
    },
    scores: {
      async saveAndUpdateRecord(submission) {
        const key = runKey(submission.userId, submission.runId);
        const existing = runs.get(key);
        if (existing) {
          if (existing.fingerprint !== submission.fingerprint) {
            throw new ApiError(409, 'RUN_ID_CONFLICT', 'This runId was already saved with different results.');
          }
          const current = records.get(recordKey(submission.userId, submission.mode));
          return { run: copy(existing), duplicate: true, isNewRecord: false, personalBest: current.score };
        }
        const run = { ...copy(submission), id: randomUUID() };
        const bestKey = recordKey(submission.userId, submission.mode);
        const previous = records.get(bestKey);
        const isNewRecord = !previous || run.score > previous.score;

        // Keep insertion and record replacement atomic. A database adapter must use a transaction.
        runs.set(key, run);
        if (isNewRecord) {
          records.set(bestKey, {
            userId: run.userId, mode: run.mode, score: run.score,
            runId: run.runId, achievedAt: run.createdAt,
          });
        }
        return { run: copy(run), duplicate: false, isNewRecord, personalBest: records.get(bestKey).score };
      },
      async listRecords(userId) {
        return {
          classic: copy(records.get(recordKey(userId, 'classic'))),
          hunt: copy(records.get(recordKey(userId, 'hunt'))),
        };
      },
      async listRuns({ userId, mode, page, pageSize }) {
        const selected = [...runs.values()]
          .filter((run) => run.userId === userId && (!mode || run.mode === mode))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
        return { items: copy(selected.slice((page - 1) * pageSize, page * pageSize)), total: selected.length };
      },
      async leaderboard({ mode, limit }) {
        return [...records.values()].filter((record) => record.mode === mode)
          .sort((a, b) => b.score - a.score || a.achievedAt.localeCompare(b.achievedAt) || a.userId.localeCompare(b.userId))
          .slice(0, limit).map((record, index) => ({
            rank: index + 1,
            username: usersById.get(record.userId).username,
            score: record.score,
            achievedAt: record.achievedAt,
          }));
      },
    },
  };
}
