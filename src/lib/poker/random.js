// Compatibility boundary for existing poker imports. The shared seeded stream
// preserves existing saved poker runs and regression vectors.
export {
  choose,
  nextRandom,
  randomInt,
  seedRandom,
  shuffle,
  validRandomState
} from '../seededRandom.js';
