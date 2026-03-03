import { describe, it, expect } from 'vitest';
import {
  mapWhile,
  safeIter,
  tryCollect,
  tryFold,
  tryForEach,
} from '../iter.js';
import { ok, err, isOk, isErr, some, none } from '../types.js';
import type { Result } from '../types.js';

describe('Iter', () => {
  describe('mapWhile', () => {
    it('yields while Some, stops at first None', () => {
      const result = [...mapWhile([1, 2, 3, 4, 5], n => n < 4 ? some(n * 10) : none)];
      expect(result).toEqual([10, 20, 30]);
    });

    it('yields nothing when first is None', () => {
      const result = [...mapWhile([1, 2, 3], () => none)];
      expect(result).toEqual([]);
    });

    it('yields all when all Some', () => {
      const result = [...mapWhile([1, 2, 3], n => some(n))];
      expect(result).toEqual([1, 2, 3]);
    });

    it('handles empty source', () => {
      const result = [...mapWhile([], () => some(1))];
      expect(result).toEqual([]);
    });

    it('does not call fn after first None', () => {
      let calls = 0;
      const result = [...mapWhile([1, 2, 3, 4], n => {
        calls++;
        return n <= 2 ? some(n) : none;
      })];
      expect(result).toEqual([1, 2]);
      expect(calls).toBe(3);
    });
  });

  describe('safeIter', () => {
    it('wraps normal values as Ok', () => {
      const results = [...safeIter([1, 2, 3])];
      expect(results).toHaveLength(3);
      expect(results.every(r => isOk(r))).toBe(true);
      expect(results).toEqual([1, 2, 3]);
    });

    it('catches per-item throws as Err', () => {
      function* throwing() {
        yield 1;
        throw new Error('boom');
      }
      const results = [...safeIter(throwing())];
      expect(results).toHaveLength(2);
      expect(isOk(results[0])).toBe(true);
      expect(results[0]).toBe(1);
      expect(isErr(results[1])).toBe(true);
      expect((results[1] as { error: Error }).error.message).toBe('boom');
    });

    it('handles empty source', () => {
      expect([...safeIter([])]).toEqual([]);
    });

    it('stops after first throw from a persistently throwing iterator', () => {
      const iter: Iterable<number> = {
        [Symbol.iterator]: () => ({
          next() { throw new Error('always'); },
        }),
      };
      const results = [...safeIter(iter)];
      expect(results).toHaveLength(1);
      expect(isErr(results[0])).toBe(true);
      expect((results[0] as { error: Error }).error.message).toBe('always');
    });

    it('calls iter.return() when consumer breaks early', () => {
      let returned = false;
      const iter: Iterable<number> = {
        [Symbol.iterator]: () => {
          let i = 0;
          return {
            next() { return { value: ++i, done: false }; },
            return() { returned = true; return { value: undefined, done: true }; },
          };
        },
      };
      const gen = safeIter(iter);
      gen.next(); // consume one value
      gen.return(undefined as any); // consumer breaks
      expect(returned).toBe(true);
    });

    it('yields values then stops on throw', () => {
      function* twoThenThrow() {
        yield 1;
        yield 2;
        throw new Error('third');
      }
      const results = [...safeIter(twoThenThrow())];
      expect(results).toHaveLength(3);
      expect(isOk(results[0])).toBe(true);
      expect(results[0]).toBe(1);
      expect(isOk(results[1])).toBe(true);
      expect(results[1]).toBe(2);
      expect(isErr(results[2])).toBe(true);
      expect((results[2] as { error: Error }).error.message).toBe('third');
    });
  });

  describe('tryCollect', () => {
    it('collects all Ok values into Result<T[], E>', () => {
      const results: Result<number, string>[] = [ok(1), ok(2), ok(3)];
      const collected = tryCollect(results);
      expect(isOk(collected)).toBe(true);
      expect(collected).toEqual([1, 2, 3]);
    });

    it('short-circuits on first Err', () => {
      let calls = 0;
      function* source(): Generator<Result<number, string>> {
        calls++; yield ok(1);
        calls++; yield err('fail');
        calls++; yield ok(3);
      }
      const collected = tryCollect(source());
      expect(isErr(collected)).toBe(true);
      expect((collected as { error: string }).error).toBe('fail');
      expect(calls).toBe(2);
    });

    it('handles empty source', () => {
      const collected = tryCollect([]);
      expect(isOk(collected)).toBe(true);
      expect(collected).toEqual([]);
    });

    it('works with lazy generators', () => {
      function* source(): Generator<Result<number, string>> {
        yield ok(2);
        yield ok(4);
        yield ok(6);
      }
      const collected = tryCollect(source());
      expect(isOk(collected)).toBe(true);
      expect(collected).toEqual([2, 4, 6]);
    });
  });

  describe('tryFold', () => {
    it('folds all values when no error', () => {
      const result = tryFold([1, 2, 3], 0, (acc, n) => ok(acc + n));
      expect(isOk(result)).toBe(true);
      expect(result).toBe(6);
    });

    it('short-circuits on first Err', () => {
      let calls = 0;
      const result = tryFold([1, 2, 3, 4], 0, (acc, n) => {
        calls++;
        return n === 3 ? err('stopped') as Result<number, string> : ok(acc + n);
      });
      expect(isErr(result)).toBe(true);
      expect((result as { error: string }).error).toBe('stopped');
      expect(calls).toBe(3);
    });

    it('handles empty source', () => {
      const result = tryFold([], 42, () => ok(0));
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });
  });

  describe('tryForEach', () => {
    it('iterates all items when no error', () => {
      const seen: number[] = [];
      const result = tryForEach([1, 2, 3], n => {
        seen.push(n);
        return ok(undefined);
      });
      expect(isOk(result)).toBe(true);
      expect(seen).toEqual([1, 2, 3]);
    });

    it('short-circuits on first Err', () => {
      const seen: number[] = [];
      const result = tryForEach([1, 2, 3, 4], n => {
        seen.push(n);
        return n === 2 ? err('stop') as Result<void, string> : ok(undefined);
      });
      expect(isErr(result)).toBe(true);
      expect((result as { error: string }).error).toBe('stop');
      expect(seen).toEqual([1, 2]);
    });

    it('handles empty source', () => {
      const result = tryForEach([], () => ok(undefined));
      expect(isOk(result)).toBe(true);
    });
  });

  describe('composition', () => {
    it('safeIter -> native filter(isOk) collects safe values', () => {
      function* unstable() {
        yield 1;
        throw new Error('oops');
      }
      const safe = [...safeIter(unstable())].filter(isOk);
      expect(safe).toEqual([1]);
    });
  });
});
