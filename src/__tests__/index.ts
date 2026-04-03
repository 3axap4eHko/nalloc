import { describe, it, expect } from 'vitest';
import * as index from '../index.js';
import { pipe, Result } from '../index.js';
import { isThenable, isSync } from '../types.js';
import { ok, err } from '../types.js';

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

describe('pipe', () => {
  it('returns value with no functions', () => {
    expect(pipe(42)).toBe(42);
  });

  it('applies single function', () => {
    expect(pipe(2, x => x * 3)).toBe(6);
  });

  it('applies multiple functions left to right', () => {
    expect(pipe(2, x => x * 3, x => x + 1, x => String(x))).toBe('7');
  });

  it('works with Result operations', () => {
    const result = pipe(
      Result.tryCatch(() => JSON.parse('{"a":1}')),
      r => Result.map(r, (v: { a: number }) => v.a),
      r => Result.unwrapOr(r, 0),
    );
    expect(result).toBe(1);
  });

  it('works with Result error path', () => {
    const result = pipe(
      Result.tryCatch(() => JSON.parse('invalid')),
      r => Result.map(r, (v: unknown) => v),
      r => Result.unwrapOr(r, 'fallback'),
    );
    expect(result).toBe('fallback');
  });
});