/**
 * Deterministic, dependency-free pseudo-random number generator.
 *
 * Implements the small subset of Python's `random.Random` API used by the
 * simulation engine (random, choice, shuffle, sample) so the ported logic
 * mirrors the original backend implementation while running fully in the
 * browser, with no server-side randomness source required.
 */
export class Rng {
  private state: number;

  constructor(seed: number = Date.now() ^ Math.floor(Math.random() * 0xffffffff)) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1) using a mulberry32 generator. */
  random(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a random element from a non-empty array. */
  choice<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length)];
  }

  /** Returns k distinct elements sampled from the population without replacement. */
  sample<T>(population: readonly T[], k: number): T[] {
    const pool = [...population];
    const result: T[] = [];
    for (let i = 0; i < k && pool.length > 0; i += 1) {
      const index = Math.floor(this.random() * pool.length);
      result.push(pool[index]);
      pool.splice(index, 1);
    }
    return result;
  }

  /** Shuffles the array in place (Fisher-Yates) and returns it. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}
