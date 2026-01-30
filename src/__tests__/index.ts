import { describe, it, expect } from 'vitest';
import * as index from '../index.js';
import { isThenable, isSync } from '../types.js';

describe('index.ts exports', () => {
  it('exports exist', () => {
    expect(index.some).toBeDefined();
    expect('none' in index).toBe(true);
    expect(index.ok).toBeDefined();
    expect(index.err).toBeDefined();
    expect(index.Option).toBeDefined();
    expect(index.Result).toBeDefined();
  });
});

describe('MaybePromise guards', () => {
  describe('isThenable', () => {
    it('returns true for Promise', () => {
      expect(isThenable(Promise.resolve(1))).toBe(true);
    });

    it('returns true for PromiseLike', () => {
      const thenable = { then: (cb: (v: number) => void) => cb(1) };
      expect(isThenable(thenable)).toBe(true);
    });

    it('returns false for plain value', () => {
      expect(isThenable(42)).toBe(false);
      expect(isThenable('string')).toBe(false);
      expect(isThenable({ x: 1 })).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isThenable(null)).toBe(false);
      expect(isThenable(undefined)).toBe(false);
    });
  });

  describe('isSync', () => {
    it('returns false for Promise', () => {
      expect(isSync(Promise.resolve(1))).toBe(false);
    });

    it('returns true for plain value', () => {
      expect(isSync(42)).toBe(true);
      expect(isSync('string')).toBe(true);
      expect(isSync({ x: 1 })).toBe(true);
    });

    it('returns true for null/undefined', () => {
      expect(isSync(null)).toBe(true);
      expect(isSync(undefined)).toBe(true);
    });
  });
});