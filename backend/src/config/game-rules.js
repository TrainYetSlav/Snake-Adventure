// Keep undecided coefficients empty. Test fixtures are not gameplay defaults.
export const gameRules = {
  version: 'draft-v1',
  classic: {
    pointsPerFood: null,
  },
  hunt: {
    snakeLengthPolicy: 'fixed',
    completionCondition: 'all_prey_caught_then_enter_portal',
    timeGraceSeconds: 60,
    timePenaltyRounding: 'whole_seconds',
    timeScoreFloor: null,
    newPreyRatio: null,
    preyCatalog: [],
    levels: [],
  },
};

export function scoringReady(rules, mode) {
  if (mode === 'classic') {
    return Number.isSafeInteger(rules.classic.pointsPerFood) && rules.classic.pointsPerFood > 0;
  }
  const hunt = rules.hunt;
  if (hunt.timeScoreFloor !== 0 && hunt.timeScoreFloor !== 'unbounded') return false;
  if (!hunt.levels.length) return false;
  const catalog = new Map(hunt.preyCatalog.map((prey) => [prey.id, prey.points]));
  return hunt.levels.every((level) =>
    Number.isSafeInteger(level.timeBonusMax) && level.timeBonusMax >= 0 &&
    Number.isSafeInteger(level.timePenaltyPerSecond) && level.timePenaltyPerSecond >= 0 &&
    Object.keys(level.preyCounts).length > 0 &&
    Object.entries(level.preyCounts).every(([id, count]) =>
      Number.isSafeInteger(count) && count > 0 &&
      Number.isSafeInteger(catalog.get(id)) && catalog.get(id) > 0));
}

export function publicGameRules(rules) {
  return {
    ...structuredClone(rules),
    scoringConfigured: {
      classic: scoringReady(rules, 'classic'),
      hunt: scoringReady(rules, 'hunt'),
    },
  };
}
