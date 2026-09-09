// Compatibility boundary for existing poker imports. The implementation is
// shared infrastructure because idiom generation relies on the same versioned
// deterministic stream.
export {
  choose,
  nextRandom,
  randomInt,
  seedRandom,
  shuffle,
  validRandomState
} from '../seededRandom.js';
