import { describe, it, expect } from 'vitest';
import { isNonEmpty, assertNonEmpty, fromArray } from '../nonempty.js';
import { isSome, isNone } from '../types.js';

describe('NonEmpty', () => {
  describe('isNonEmpty', () => {
    it('returns false for an empty array', () => {
      expect(isNonEmpty([])).toBe(false);
    });

    it('returns true for a single-element array', () => {
      expect(isNonEmpty([1])).toBe(true);
    });

    it('returns true for a multi-element array', () => {
      expect(isNonEmpty([1, 2, 3])).toBe(true);
    });
  });

  describe('assertNonEmpty', () => {
    it('throws on an empty array', () => {
      expect(() => assertNonEmpty([])).toThrow('Expected array to be non-empty');
    });

    it('throws with a custom message', () => {
      expect(() => assertNonEmpty([], 'nope')).toThrow('nope');
    });

    it('does not throw on a non-empty array', () => {
      expect(() => assertNonEmpty([1])).not.toThrow();
    });
  });

  describe('fromArray', () => {
    it('returns None for an empty array', () => {
      expect(isNone(fromArray([]))).toBe(true);
    });

    it('returns Some wrapping the same array value for a non-empty array', () => {
      const input = [1, 2];
      const result = fromArray(input);
      expect(isSome(result)).toBe(true);
      expect(result).toBe(input);
    });
  });
});
