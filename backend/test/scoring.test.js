import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { calculateSubmission } from '../src/modules/scores/service.js';
import { configuredRules } from './helpers.js';

function huntSubmission(duration = 75000) {
  return {
    runId: randomUUID(), mode: 'hunt', rulesVersion: 'test-v1', activeDurationMs: duration, endReason: 'collision',
    levelResults: [{ levelId: 'level-1', activeDurationMs: duration, enteredPortal: true, preyCaught: { mouse: 2, bird: 8 } }],
  };
}

test('Hunt time bonus begins decreasing only after complete seconds beyond one minute', () => {
  for (const [duration, expected] of [[45000, 300], [60000, 300], [60999, 300], [61000, 295], [75500, 225]]) {
    const result = calculateSubmission(huntSubmission(duration), configuredRules());
    assert.equal(result.scoreBreakdown.timeScore, expected);
    assert.equal(result.scoreBreakdown.foodScore, 180);
  }
});

test('both time floor policies are supported without picking an undecided production default', () => {
  const rules = configuredRules();
  assert.equal(calculateSubmission(huntSubmission(130000), rules).scoreBreakdown.timeScore, 0);
  rules.hunt.timeScoreFloor = 'unbounded';
  assert.equal(calculateSubmission(huntSubmission(130000), rules).scoreBreakdown.timeScore, -50);
});

test('catching all prey without entering the portal does not complete a level', () => {
  const body = huntSubmission();
  body.levelResults[0].enteredPortal = false;
  assert.throws(() => calculateSubmission(body, configuredRules()), (error) => error.code === 'VALIDATION_ERROR');
});

test('Hunt rejects skipped levels, incomplete quotas, extra prey, and inconsistent durations', () => {
  const changes = [
    (body) => { body.levelResults[0].levelId = 'level-2'; },
    (body) => { body.levelResults[0].preyCaught.bird = 7; },
    (body) => { body.levelResults[0].preyCaught.bat = 1; },
    (body) => { body.activeDurationMs = 1; },
    (body) => { body.endReason = 'completed'; },
  ];
  for (const change of changes) {
    const body = huntSubmission();
    change(body);
    assert.throws(() => calculateSubmission(body, configuredRules()), (error) => error.code === 'VALIDATION_ERROR');
  }
});

test('a completed Hunt run aggregates the scores of every portal-completed level', () => {
  const body = huntSubmission(60000);
  body.endReason = 'completed';
  body.activeDurationMs = 121000;
  body.levelResults.push({ levelId: 'level-2', activeDurationMs: 61000, enteredPortal: true, preyCaught: { mouse: 1, bird: 2, bat: 7 } });
  const result = calculateSubmission(body, configuredRules());
  assert.equal(result.score, 1130);
  assert.deepEqual(result.scoreBreakdown, { foodScore: 440, timeScore: 690 });
});

test('unfinished Hunt levels do not contribute to the saved score', () => {
  const body = huntSubmission();
  body.levelResults = [];
  const result = calculateSubmission(body, configuredRules());
  assert.equal(result.score, 0);
});

test('rules versions, unknown fields, fractional counts, and numeric overflow are rejected', () => {
  const classic = { runId: randomUUID(), mode: 'classic', rulesVersion: 'test-v1', activeDurationMs: 1000, endReason: 'collision', foodEaten: 1 };
  for (const patch of [{ userId: 'another-user' }, { foodEaten: 1.5 }, { foodEaten: Number.MAX_SAFE_INTEGER }]) {
    assert.throws(() => calculateSubmission({ ...classic, ...patch }, configuredRules()), (error) => error.code === 'VALIDATION_ERROR');
  }
  assert.throws(() => calculateSubmission({ ...classic, rulesVersion: 'outdated' }, configuredRules()), (error) => error.code === 'RULES_VERSION_MISMATCH');
});
