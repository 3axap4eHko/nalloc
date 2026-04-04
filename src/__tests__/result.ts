import { describe, it, expect } from 'vitest';
import {
  of,
  isSomeErr,
  map,
  mapErr,
  flatMap,
  andThen,
  bimap,
  tap,
  tapErr,
  unwrap,
  unwrapErr,
  unwrapOr,
  unwrapOrElse,
  mapOr,
  mapOrElse,
  expect as expectRes,
  expectErr,
  and,
  or,
  orElse,
  toOption,
  toErrorOption,
  zip,
  zipWith,
  flatten,
  match,
  partition,
  collect,
  collectAll,
  transpose,
  isOkAnd,
  isErrAnd,
  tryCatch,
  wrap,
  toThrowable,
  unwrapOrReturn,
  assertOk,
  assertErr,
  all,
  any,
  partitionAsync,
  tryCatchMaybePromise,
  settleMaybePromise,
  partitionMaybePromise,
  filterOk,
  filterErr,
  safeTry,
  safeTryAsync,
  fromPromise,
  fromSchema,
  gen,
  genAsync
} from '../result.js';
import type { StandardSchema } from '../result.js';
import { ok, err, isOk, isErr, optionOf as optOf, none } from '../types.js';

describe('Result', () => {
  describe('constructors', () => {
    it('ok creates Ok result', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });

    it('ok throws when passed an Err', () => {
      const error = err('test error');
      expect(() => ok(error)).toThrow('ok() cannot wrap an Err value');
    });

    it('err creates Err result', () => {
      const result = err('error');
      expect(isErr(result)).toBe(true);
      expect(result.error).toBe('error');
    });

    it('of catches errors and returns Result', () => {
      const success = of(() => 42);
      expect(isOk(success)).toBe(true);
      expect(unwrap(success)).toBe(42);

      const failure = of(() => {
        throw new Error('failed');
      });
      expect(isErr(failure)).toBe(true);
      expect((failure as any).error.message).toBe('failed');
    });

  });

  describe('type guards', () => {
    it('isOk returns true for Ok', () => {
      expect(isOk(ok(42))).toBe(true);
      expect(isOk(ok(0))).toBe(true);
      expect(isOk(ok(''))).toBe(true);
      expect(isOk(ok(null))).toBe(true);
    });

    it('isOk returns false for Err', () => {
      expect(isOk(err('error'))).toBe(false);
    });

    it('isErr returns true for Err', () => {
      expect(isErr(err('error'))).toBe(true);
      expect(isErr(err(null))).toBe(true);
    });

    it('isErr returns false for Ok', () => {
      expect(isErr(ok(42))).toBe(false);
    });

    it('isSomeErr returns true for Err with non-null value', () => {
      expect(isSomeErr(err('error'))).toBe(true);
      expect(isSomeErr(err(0))).toBe(true);
    });

    it('isSomeErr returns false for Err with null/undefined', () => {
      expect(isSomeErr(err(null))).toBe(false);
      expect(isSomeErr(err(undefined))).toBe(false);
    });

    it('isSomeErr returns false for Ok', () => {
      expect(isSomeErr(ok(42))).toBe(false);
    });
  });

  describe('map', () => {
    it('maps Ok value', () => {
      const result = map(ok(2), x => x * 3);
      expect(unwrap(result)).toBe(6);
    });

    it('ignores Err', () => {
      const result = map(err('error'), (x: number) => x * 3);
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('error');
    });
  });

  describe('mapErr', () => {
    it('maps Err value', () => {
      const result = mapErr(err('error'), e => e.toUpperCase());
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('ERROR');
    });

    it('ignores Ok', () => {
      const result = mapErr(ok(42), (e: string) => e.toUpperCase());
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(42);
    });
  });

  describe('flatMap', () => {
    it('flatMaps Ok value', () => {
      const result = flatMap(ok(2), x => ok(x * 3));
      expect(unwrap(result)).toBe(6);
    });

    it('can return Err from mapper', () => {
      const result = flatMap(ok(2), x => err(`error: ${x}`));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('error: 2');
    });

    it('ignores Err', () => {
      const result = flatMap(err('error'), (x: number) => ok(x * 3));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('error');
    });
  });

  describe('andThen', () => {
    it('aliases flatMap for Ok', () => {
      const result = andThen(ok(2), x => ok(x * 4));
      expect(unwrap(result)).toBe(8);
    });

    it('returns Err for Err', () => {
      const result = andThen(err('error'), (x: number) => ok(x * 4));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('error');
    });
  });

  describe('tap', () => {
    it('runs for Ok and returns original', () => {
      let seen = 0;
      const res = ok(7);
      const out = tap(res, value => {
        seen = value;
      });
      expect(out).toBe(res);
      expect(seen).toBe(7);
    });

    it('does not run for Err', () => {
      let called = false;
      const out = tap(err('boom'), () => {
        called = true;
      });
      expect(isErr(out)).toBe(true);
      expect(called).toBe(false);
    });
  });

  describe('tapErr', () => {
    it('runs for Err and returns original', () => {
      let seen = '';
      const res = err('nope');
      const out = tapErr(res, error => {
        seen = error;
      });
      expect(out).toBe(res);
      expect(seen).toBe('nope');
    });

    it('does not run for Ok', () => {
      let called = false;
      const out = tapErr(ok(5), () => {
        called = true;
      });
      expect(isOk(out)).toBe(true);
      expect(called).toBe(false);
    });
  });

  describe('bimap', () => {
    it('maps Ok value', () => {
      const result = bimap(ok(2), x => x * 3, e => e);
      expect(unwrap(result)).toBe(6);
    });

    it('maps Err value', () => {
      const result = bimap(err('error'), (x: number) => x * 3, e => e.toUpperCase());
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('ERROR');
    });
  });

  describe('unwrap', () => {
    it('returns value for Ok', () => {
      expect(unwrap(ok(42))).toBe(42);
    });

    it('throws error value for Err', () => {
      const e = err('error');
      let caught: unknown;
      try { unwrap(e); } catch (x) { caught = x; }
      expect(caught).toBe('error');
    });
  });

  describe('unwrapErr', () => {
    it('returns error for Err', () => {
      expect(unwrapErr(err('error'))).toBe('error');
    });

    it('throws for Ok', () => {
      expect(() => unwrapErr(ok(42))).toThrow('Called unwrapErr on Ok: 42');
    });
  });

  describe('unwrapOr', () => {
    it('returns value for Ok', () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it('returns default for Err', () => {
      expect(unwrapOr(err('error'), 99)).toBe(99);
    });
  });

  describe('unwrapOrElse', () => {
    it('returns value for Ok', () => {
      expect(unwrapOrElse(ok(42), () => 0)).toBe(42);
    });

    it('calls function for Err', () => {
      let called = false;
      const result = unwrapOrElse(err('error'), e => {
        called = true;
        expect(e).toBe('error');
        return 99;
      });
      expect(result).toBe(99);
      expect(called).toBe(true);
    });
  });

  describe('mapOr', () => {
    it('maps Ok value', () => {
      const result = mapOr(ok(2), 10, x => x * 3);
      expect(result).toBe(6);
    });

    it('returns default for Err', () => {
      const result = mapOr(err('error'), 10, (x: number) => x * 3);
      expect(result).toBe(10);
    });
  });

  describe('mapOrElse', () => {
    it('maps Ok value', () => {
      const result = mapOrElse(ok(2), () => 10, x => x * 3);
      expect(result).toBe(6);
    });

    it('returns default for Err', () => {
      let called = false;
      const result = mapOrElse(err('error'), () => {
        called = true;
        return 10;
      }, (x: number) => x * 3);
      expect(result).toBe(10);
      expect(called).toBe(true);
    });
  });

  describe('expect', () => {
    it('returns value for Ok', () => {
      expect(expectRes(ok(42), 'error')).toBe(42);
    });

    it('throws with message for Err', () => {
      expect(() => expectRes(err('failed'), 'custom error')).toThrow('custom error: failed');
    });
  });

  describe('expectErr', () => {
    it('returns error for Err', () => {
      expect(expectErr(err('error'), 'msg')).toBe('error');
    });

    it('throws with message for Ok', () => {
      expect(() => expectErr(ok(42), 'custom error')).toThrow('custom error: 42');
    });
  });

  describe('and', () => {
    it('returns second if first is Ok', () => {
      const result = and(ok(1), ok(2));
      expect(unwrap(result)).toBe(2);
    });

    it('returns first Err if first is Err', () => {
      const result = and(err('first'), ok(2));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('first');
    });

    it('returns second Err if first is Ok and second is Err', () => {
      const result = and(ok(1), err('second'));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('second');
    });
  });

  describe('or', () => {
    it('returns first if Ok', () => {
      const result = or(ok(1), ok(2));
      expect(unwrap(result)).toBe(1);
    });

    it('returns second if first is Err', () => {
      const result = or(err('error'), ok(2));
      expect(unwrap(result)).toBe(2);
    });

    it('returns second Err if both Err', () => {
      const result = or(err('first'), err('second'));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('second');
    });
  });

  describe('orElse', () => {
    it('returns first if Ok', () => {
      const result = orElse(ok(1), () => ok(2));
      expect(unwrap(result)).toBe(1);
    });

    it('calls function if Err', () => {
      let called = false;
      const result = orElse(err('error'), e => {
        called = true;
        expect(e).toBe('error');
        return ok(2);
      });
      expect(unwrap(result)).toBe(2);
      expect(called).toBe(true);
    });
  });

  describe('toOption', () => {
    it('converts Ok to Some', () => {
      const opt = toOption(ok(3));
      expect(opt).toBe(3);
    });

    it('converts Err to None', () => {
      const opt = toOption(err('nope'));
      expect(opt).toBe(none);
    });
  });

  describe('toErrorOption', () => {
    it('converts Err to Some', () => {
      const opt = toErrorOption(err('fail'));
      expect(opt).toBe('fail');
    });

    it('converts Ok to None', () => {
      const opt = toErrorOption(ok(3));
      expect(opt).toBe(none);
    });
  });

  describe('zip', () => {
    it('zips two Ok results', () => {
      const result = zip(ok(1), ok('a'));
      expect(unwrap(result)).toEqual([1, 'a']);
    });

    it('returns first Err', () => {
      const result = zip(err('first'), ok('a'));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('first');
    });

    it('returns second Err when first is Ok', () => {
      const result = zip(ok(1), err('second'));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('second');
    });
  });

  describe('zipWith', () => {
    it('combines Ok results', () => {
      const result = zipWith(ok(2), ok(3), (a, b) => a + b);
      expect(unwrap(result)).toBe(5);
    });

    it('returns Err from left', () => {
      const result = zipWith(err('fail'), ok(3), (a, b) => a + b);
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('fail');
    });

    it('returns Err from right when left is Ok', () => {
      const result = zipWith(ok(2), err('right'), (a, b) => a + b);
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('right');
    });
  });

  describe('flatten', () => {
    it('flattens nested Ok', () => {
      const nested = ok(ok(42));
      const result = flatten(nested);
      expect(unwrap(result)).toBe(42);
    });


    it('returns outer Err', () => {
      const result = flatten(err('outer error'));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('outer error');
    });
  });

  describe('match', () => {
    it('calls ok branch for Ok', () => {
      const result = match(
        ok(42),
        x => `value: ${x}`,
        e => `error: ${e}`,
      );
      expect(result).toBe('value: 42');
    });

    it('calls err branch for Err', () => {
      const result = match(
        err('failed'),
        (x: number) => `value: ${x}`,
        e => `error: ${e}`,
      );
      expect(result).toBe('error: failed');
    });
  });

  describe('partition', () => {
    it('partitions array of Results', () => {
      const results = [ok(1), err('a'), ok(2), err('b'), ok(3)];
      const [oks, errs] = partition(results);
      expect(oks).toEqual([1, 2, 3]);
      expect(errs).toEqual(['a', 'b']);
    });

    it('handles all Ok', () => {
      const results = [ok(1), ok(2), ok(3)];
      const [oks, errs] = partition(results);
      expect(oks).toEqual([1, 2, 3]);
      expect(errs).toEqual([]);
    });

    it('handles all Err', () => {
      const results = [err('a'), err('b'), err('c')];
      const [oks, errs] = partition(results);
      expect(oks).toEqual([]);
      expect(errs).toEqual(['a', 'b', 'c']);
    });
  });

  describe('collect', () => {
    it('collects all Ok values', () => {
      const results = [ok(1), ok(2), ok(3)];
      const collected = collect(results);
      expect(isOk(collected)).toBe(true);
      expect(unwrap(collected)).toEqual([1, 2, 3]);
    });

    it('returns first Err', () => {
      const results = [ok(1), err('first'), ok(2), err('second')];
      const collected = collect(results);
      expect(isErr(collected)).toBe(true);
      expect((collected as any).error).toBe('first');
    });
  });

  describe('collectAll', () => {
    it('collects all Ok values if no errors', () => {
      const results = [ok(1), ok(2), ok(3)];
      const collected = collectAll(results);
      expect(isOk(collected)).toBe(true);
      expect(unwrap(collected)).toEqual([1, 2, 3]);
    });

    it('collects all errors if any', () => {
      const results = [ok(1), err('a'), ok(2), err('b')];
      const collected = collectAll(results);
      expect(isErr(collected)).toBe(true);
      expect((collected as any).error).toEqual(['a', 'b']);
    });
  });

  describe('transpose', () => {
    it('transposes Ok(Some)', () => {
      const result = transpose(ok(optOf(42)));
      expect(isOk(unwrap(result))).toBe(true);
      expect(unwrap(unwrap(result))).toBe(42);
    });

    it('transposes Ok(None)', () => {
      const result = transpose(ok(none));
      expect(result).toBe(undefined);
    });

    it('transposes Err', () => {
      const result = transpose(err('error'));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('error');
    });
  });

  describe('isOkAnd', () => {
    it('returns true if Ok and predicate true', () => {
      expect(isOkAnd(ok(5), x => x > 3)).toBe(true);
    });

    it('returns false if Ok and predicate false', () => {
      expect(isOkAnd(ok(2), x => x > 3)).toBe(false);
    });

    it('returns false for Err', () => {
      expect(isOkAnd(err('error'), () => true)).toBe(false);
    });
  });

  describe('isErrAnd', () => {
    it('returns true if Err and predicate true', () => {
      expect(isErrAnd(err('error'), e => e.length > 3)).toBe(true);
    });

    it('returns false if Err and predicate false', () => {
      expect(isErrAnd(err('no'), e => e.length > 3)).toBe(false);
    });

    it('returns false for Ok', () => {
      expect(isErrAnd(ok(42), () => true)).toBe(false);
    });
  });

  describe('try helpers', () => {
    it('tryCatch maps thrown error', () => {
      const result = tryCatch<number, string>(
        () => {
          throw new Error('boom');
        },
        error => (error as Error).message,
      );
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('boom');
    });

  });

  describe('wrap', () => {
    it('wraps a function that succeeds', () => {
      const safeParse = wrap(JSON.parse);
      const result = safeParse('{"a":1}');
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toEqual({ a: 1 });
    });

    it('wraps a function that throws', () => {
      const safeParse = wrap(JSON.parse);
      const result = safeParse('invalid');
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBeInstanceOf(SyntaxError);
    });

    it('preserves multi-arg signatures', () => {
      const safeSlice = wrap((s: string, start: number, end: number) => s.slice(start, end));
      const result = safeSlice('hello', 1, 3);
      expect(unwrap(result)).toBe('el');
    });

    it('uses onError mapper', () => {
      const safeParse = wrap(JSON.parse, (e) => (e as Error).message);
      const result = safeParse('invalid');
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toContain('JSON');
    });
  });

  describe('toThrowable', () => {
    it('returns Ok value for successful Result', () => {
      const fn = (x: number) => ok(x * 2);
      const throwing = toThrowable(fn);
      expect(throwing(5)).toBe(10);
    });

    it('throws Err error for failed Result', () => {
      const fn = (x: number) => x > 0 ? ok(x) : err('negative');
      const throwing = toThrowable(fn);
      expect(() => throwing(-1)).toThrow('negative');
    });

    it('throws Error instances directly', () => {
      const fn = () => err(new TypeError('bad type'));
      const throwing = toThrowable(fn);
      expect(() => throwing()).toThrow(TypeError);
    });

    it('round-trips with wrap', () => {
      const original = JSON.parse;
      const safe = wrap(original);
      const restored = toThrowable(safe);
      expect(restored('{"a":1}')).toEqual({ a: 1 });
      expect(() => restored('invalid')).toThrow(SyntaxError);
    });
  });

  describe('control helpers', () => {
    it('unwrapOrReturn returns value for Ok', () => {
      const value = unwrapOrReturn(ok(42), () => 'fallback');
      expect(value).toBe(42);
    });

    it('unwrapOrReturn returns fallback for Err', () => {
      const value = unwrapOrReturn(err('oops'), () => 'fallback');
      expect(value).toBe('fallback');
    });

    it('assertOk narrows success', () => {
      const result = ok({ id: 1 });
      assertOk(result);
      expect(result.id).toBe(1);
    });

    it('assertOk throws on Err with default message', () => {
      expect(() => assertOk(err('fail'))).toThrow('Expected Ok result');
    });

    it('assertErr narrows failure', () => {
      const result = err('oops');
      assertErr(result);
      expect(result.error).toBe('oops');
    });

    it('assertErr throws on Ok with default message', () => {
      expect(() => assertErr(ok(42))).toThrow('Expected Err result');
    });
  });

  describe('collections', () => {
    it('all aggregates Ok values', () => {
      const outcome = all([ok(1), ok(2), ok(3)]);
      expect(isOk(outcome)).toBe(true);
      expect(unwrap(outcome)).toEqual([1, 2, 3]);
    });

    it('any returns first Ok', () => {
      const outcome = any([err('a'), ok(2), err('b')]);
      expect(isOk(outcome)).toBe(true);
      expect(unwrap(outcome)).toBe(2);
    });

    it('any aggregates errors when none Ok', () => {
      const outcome = any([err('a'), err('b')]);
      expect(isErr(outcome)).toBe(true);
      expect((outcome as any).error).toEqual(['a', 'b']);
    });

    it('partitionAsync separates async results', async () => {
      const promises = [
        Promise.resolve(ok(1)),
        Promise.resolve(err('a')),
        Promise.resolve(ok(2)),
      ];
      const [oks, errs] = await partitionAsync(promises);
      expect(oks).toEqual([1, 2]);
      expect(errs).toEqual(['a']);
    });

    it('partitionAsync handles rejected promises as errors', async () => {
      const promises = [
        Promise.resolve(ok(1)),
        Promise.reject(new Error('rejected')),
        Promise.resolve(ok(2)),
      ];
      const [oks, errs] = await partitionAsync(promises);
      expect(oks).toEqual([1, 2]);
      expect(errs).toHaveLength(1);
      expect((errs[0] as Error).message).toBe('rejected');
    });

    it('any returns first Ok at start', () => {
      const outcome = any([ok(1), err('a'), err('b')]);
      expect(isOk(outcome)).toBe(true);
      expect(unwrap(outcome)).toBe(1);
    });

    it('any returns first Ok at end', () => {
      const outcome = any([err('a'), err('b'), ok(3)]);
      expect(isOk(outcome)).toBe(true);
      expect(unwrap(outcome)).toBe(3);
    });

    it('any returns empty errors for empty array', () => {
      const outcome = any([]);
      expect(isErr(outcome)).toBe(true);
      expect((outcome as any).error).toEqual([]);
    });
  });

  describe('tryCatchMaybePromise', () => {
    it('returns Ok for sync success', () => {
      const result = tryCatchMaybePromise(() => 42);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });

    it('returns Err for sync throw', () => {
      const result = tryCatchMaybePromise(() => {
        throw new Error('sync error');
      });
      expect(isErr(result)).toBe(true);
      expect((result as any).error.message).toBe('sync error');
    });

    it('returns Ok for async success', async () => {
      const result = await tryCatchMaybePromise(() => Promise.resolve(42));
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });

    it('returns Err for async rejection', async () => {
      const result = await tryCatchMaybePromise(() => Promise.reject(new Error('async error')));
      expect(isErr(result)).toBe(true);
      expect((result as any).error.message).toBe('async error');
    });

    it('uses onError mapper for sync throw', () => {
      const result = tryCatchMaybePromise(
        () => { throw new Error('fail'); },
        (e) => `mapped: ${(e as Error).message}`
      );
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('mapped: fail');
    });

    it('uses onError mapper for async rejection', async () => {
      const result = await tryCatchMaybePromise(
        () => Promise.reject(new Error('fail')),
        (e) => `mapped: ${(e as Error).message}`
      );
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('mapped: fail');
    });
  });

  describe('settleMaybePromise', () => {
    it('returns sync array for all sync values', () => {
      const result = settleMaybePromise([1, 2, 3]);
      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns Promise for mixed sync/async values', async () => {
      const result = settleMaybePromise([1, Promise.resolve(2), 3]);
      expect(result).toBeInstanceOf(Promise);
      expect(await result).toEqual([1, 2, 3]);
    });

    it('converts rejected promises to Err', async () => {
      const result = await settleMaybePromise([1, Promise.reject('fail'), 3]);
      expect(isOk(result[0])).toBe(true);
      expect(isErr(result[1])).toBe(true);
      expect((result[1] as any).error).toBe('fail');
      expect(isOk(result[2])).toBe(true);
    });

    it('handles all async values', async () => {
      const result = await settleMaybePromise([
        Promise.resolve(1),
        Promise.resolve(2)
      ]);
      expect(result).toEqual([1, 2]);
    });

    it('returns empty array for empty input', () => {
      const result = settleMaybePromise([]);
      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toEqual([]);
    });
  });

  describe('partitionMaybePromise', () => {
    it('returns sync partition for all sync values', () => {
      const result = partitionMaybePromise([ok(1), err('a'), ok(2)]);
      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toEqual([[1, 2], ['a']]);
    });

    it('returns Promise for mixed sync/async values', async () => {
      const result = partitionMaybePromise([ok(1), Promise.resolve(err('a')), ok(2)]);
      expect(result).toBeInstanceOf(Promise);
      expect(await result).toEqual([[1, 2], ['a']]);
    });

    it('preserves input order with interleaved sync/async', async () => {
      const result = await partitionMaybePromise([
        Promise.resolve(ok(1)),
        ok(2),
        Promise.resolve(err('a')),
        err('b'),
      ]);
      expect(result).toEqual([[1, 2], ['a', 'b']]);
    });

    it('handles all async values', async () => {
      const result = await partitionMaybePromise([
        Promise.resolve(ok(1)),
        Promise.resolve(err('a'))
      ]);
      expect(result).toEqual([[1], ['a']]);
    });

    it('handles rejected promises as errors', async () => {
      const result = await partitionMaybePromise([
        ok(1),
        Promise.reject(new Error('rejected'))
      ]);
      expect(result[0]).toEqual([1]);
      expect(result[1]).toHaveLength(1);
      expect((result[1][0] as Error).message).toBe('rejected');
    });

    it('returns empty arrays for empty input', () => {
      const result = partitionMaybePromise([]);
      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toEqual([[], []]);
    });
  });

  describe('filterOk', () => {
    it('extracts Ok values', () => {
      expect(filterOk([ok(1), err('a'), ok(2)])).toEqual([1, 2]);
    });

    it('returns empty for all Err', () => {
      expect(filterOk([err('a'), err('b')])).toEqual([]);
    });

    it('returns empty for empty input', () => {
      expect(filterOk([])).toEqual([]);
    });
  });

  describe('filterErr', () => {
    it('extracts Err values', () => {
      expect(filterErr([ok(1), err('a'), ok(2), err('b')])).toEqual(['a', 'b']);
    });

    it('returns empty for all Ok', () => {
      expect(filterErr([ok(1), ok(2)])).toEqual([]);
    });

    it('returns empty for empty input', () => {
      expect(filterErr([])).toEqual([]);
    });
  });

  describe('safeTry', () => {
    it('returns Ok for successful execution', () => {
      const result = safeTry(() => {
        const a = unwrap(ok(10));
        const b = unwrap(ok(5));
        return a + b;
      });
      expect(isOk(result)).toBe(true);
      expect(result).toBe(15);
    });

    it('returns Err when unwrap throws', () => {
      const e = err('failed');
      const result = safeTry(() => {
        unwrap(e);
        return 42;
      });
      expect(isErr(result)).toBe(true);
      expect((result as { error: string }).error).toBe('failed');
    });

    it('catches regular errors', () => {
      const result = safeTry(() => {
        throw new Error('boom');
      });
      expect(isErr(result)).toBe(true);
      expect((result as { error: Error }).error.message).toBe('boom');
    });

    it('propagates Err through chain', () => {
      const parse = (s: string) => s === 'bad' ? err('parse error') : ok(Number(s));
      const result = safeTry(() => {
        const a = unwrap(parse('10'));
        const b = unwrap(parse('bad'));
        const c = unwrap(parse('5'));
        return a + b + c;
      });
      expect(isErr(result)).toBe(true);
      expect((result as { error: string }).error).toBe('parse error');
    });
  });

  describe('safeTryAsync', () => {
    it('returns Ok for successful async execution', async () => {
      const result = await safeTryAsync(async () => {
        const a = unwrap(ok(10));
        const b = unwrap(await Promise.resolve(ok(5)));
        return a + b;
      });
      expect(isOk(result)).toBe(true);
      expect(result).toBe(15);
    });

    it('returns Err when unwrap throws in async', async () => {
      const e = err('async failed');
      const result = await safeTryAsync(async () => {
        unwrap(e);
        return 42;
      });
      expect(isErr(result)).toBe(true);
      expect((result as { error: string }).error).toBe('async failed');
    });

    it('catches rejected promises', async () => {
      const result = await safeTryAsync(async () => {
        await Promise.reject(new Error('rejected'));
        return 42;
      });
      expect(isErr(result)).toBe(true);
      expect((result as { error: Error }).error.message).toBe('rejected');
    });
  });

  describe('fromPromise', () => {
    it('returns Ok for resolved promise', async () => {
      const result = await fromPromise(Promise.resolve(42));
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });

    it('returns Err for rejected promise', async () => {
      const result = await fromPromise(Promise.reject(new Error('boom')));
      expect(isErr(result)).toBe(true);
      expect((result as { error: Error }).error.message).toBe('boom');
    });

    it('uses onError mapper for rejected promise', async () => {
      const result = await fromPromise(
        Promise.reject(new Error('boom')),
        (e) => `mapped: ${(e as Error).message}`,
      );
      expect(isErr(result)).toBe(true);
      expect((result as { error: string }).error).toBe('mapped: boom');
    });

    it('handles Ok(null) as valid success', async () => {
      const result = await fromPromise(Promise.resolve(null));
      expect(isOk(result)).toBe(true);
      expect(result).toBe(null);
    });

    it('returns Err with unknown type when no onError provided', async () => {
      const result = await fromPromise(Promise.reject('string error'));
      expect(isErr(result)).toBe(true);
      expect((result as { error: string }).error).toBe('string error');
    });
  });

  describe('fromSchema', () => {
    const validSchema: StandardSchema<string> = {
      '~standard': {
        validate: (value) => typeof value === 'string'
          ? { value }
          : { issues: [{ message: 'Expected string' }] },
      },
    };

    const asyncSchema: StandardSchema<number> = {
      '~standard': {
        validate: (value) => Promise.resolve(
          typeof value === 'number'
            ? { value }
            : { issues: [{ message: 'Expected number' }] },
        ),
      },
    };

    it('returns Ok for valid sync schema', () => {
      const result = fromSchema(validSchema, 'hello');
      expect(isOk(result)).toBe(true);
      expect(result).toBe('hello');
    });

    it('returns Err with issues for invalid sync schema', () => {
      const result = fromSchema(validSchema, 42);
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toEqual([{ message: 'Expected string' }]);
    });

    it('returns Ok for valid async schema', async () => {
      const result = await fromSchema(asyncSchema, 42);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });

    it('returns Err for invalid async schema', async () => {
      const result = await fromSchema(asyncSchema, 'hello');
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toEqual([{ message: 'Expected number' }]);
    });
  });

  describe('gen', () => {
    it('returns Ok for successful execution', () => {
      const result = gen(function*($) {
        const a = yield* $(ok(10));
        const b = yield* $(ok(5));
        return a + b;
      });
      expect(isOk(result)).toBe(true);
      expect(result).toBe(15);
    });

    it('short-circuits on first Err', () => {
      const result = gen(function*($) {
        const a = yield* $(ok(10));
        const b = yield* $(err('fail') as Result<number, string>);
        const c = yield* $(ok(5));
        return a + b + c;
      });
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('fail');
    });

    it('propagates Err through chain', () => {
      const parse = (s: string) => s === 'bad' ? err('parse error') : ok(Number(s));
      const result = gen(function*($) {
        const a = yield* $(parse('10'));
        const b = yield* $(parse('bad'));
        const c = yield* $(parse('5'));
        return a + b + c;
      });
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('parse error');
    });

    it('returns Ok for empty generator', () => {
      const result = gen(function*() {
        return 42;
      });
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });
  });

  describe('genAsync', () => {
    it('returns Ok for successful async execution', async () => {
      const result = await genAsync(async function*($) {
        const a = yield* $(ok(10));
        const b = yield* $(await fromPromise(Promise.resolve(5)));
        return a + b;
      });
      expect(isOk(result)).toBe(true);
      expect(result).toBe(15);
    });

    it('short-circuits on first Err', async () => {
      const result = await genAsync(async function*($) {
        const a = yield* $(ok(10));
        const b = yield* $(err('async fail') as Result<number, string>);
        return a + b;
      });
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('async fail');
    });

    it('handles rejected promises via fromPromise', async () => {
      const result = await genAsync(async function*($) {
        const a = yield* $(await fromPromise(Promise.resolve(10)));
        const b = yield* $(await fromPromise(Promise.reject('boom')));
        return a + b;
      });
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('boom');
    });
  });

});

