import { describe, it, expect } from 'vitest';
import {
  of,
  ofAsync,
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
  tryAsync,
  fromPromise,
  mapAsync,
  andThenAsync,
  matchAsync,
  unwrapOrReturn,
  assertOk,
  assertErr,
  all,
  any,
  partitionAsync
} from '../result.js';
import { ok, err, isOk, isErr, optionOf as optOf, none } from '../types.js';
import { formatResult, inspectResult } from '../devtools.js';

describe('Result', () => {
  describe('constructors', () => {
    it('ok creates Ok result', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });

    it('ok does not throw when passed an Err', () => {
      const error = err('test error');
      expect(() => ok(error)).not.toThrow();
      expect(isErr(ok(error))).toBe(true);
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

    it('ofAsync catches async errors', async () => {
      const success = await ofAsync(async () => 42);
      expect(isOk(success)).toBe(true);
      expect(unwrap(success)).toBe(42);

      const failure = await ofAsync(async () => {
        throw new Error('async failed');
      });
      expect(isErr(failure)).toBe(true);
      expect((failure as any).error.message).toBe('async failed');
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

    it('throws for Err', () => {
      expect(() => unwrap(err('error'))).toThrow('Called unwrap on Err: error');
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

    it('tryAsync maps async rejection', async () => {
      const result = await tryAsync<number, string>(
        async () => {
          throw new Error('boom');
        },
        error => (error as Error).message,
      );
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('boom');
    });

    it('fromPromise resolves to Ok', async () => {
      const result = await fromPromise(Promise.resolve(5));
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(5);
    });

    it('fromPromise maps rejection', async () => {
      const result = await fromPromise(
        Promise.reject(new Error('fail')),
        error => (error as Error).message.toUpperCase(),
      );
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('FAIL');
    });
  });

  describe('async mapping', () => {
    it('mapAsync maps Ok value', async () => {
      const result = await mapAsync(ok(2), async value => value * 3);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(6);
    });

    it('mapAsync returns Err unchanged', async () => {
      const result = await mapAsync(err('nope'), async (value: number) => value * 3);
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('nope');
    });

    it('andThenAsync chains Ok value', async () => {
      const result = await andThenAsync(ok(2), async value => ok(value * 4));
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(8);
    });

    it('matchAsync selects branch', async () => {
      const okValue = await matchAsync(
        ok(5),
        async value => value * 2,
        async () => 0,
      );
      expect(okValue).toBe(10);

      const errValue = await matchAsync(
        err('fail'),
        async () => 0,
        async error => error.length,
      );
      expect(errValue).toBe(4);
    });
  });

  describe('control helpers', () => {
    it('unwrapOrReturn returns fallback for Err', () => {
      const value = unwrapOrReturn(err('oops'), () => 'fallback');
      expect(value).toBe('fallback');
    });

    it('assertOk narrows success', () => {
      const result = ok({ id: 1 });
      assertOk(result);
      expect(result.id).toBe(1);
    });

    it('assertErr narrows failure', () => {
      const result = err('oops');
      assertErr(result);
      expect(result.error).toBe('oops');
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
  });

  describe('introspection helpers', () => {
    it('inspectResult exposes discriminated metadata', () => {
      expect(inspectResult(ok(4))).toEqual({ status: 'ok', value: 4 });
      expect(inspectResult(err('error'))).toEqual({ status: 'err', error: 'error' });
    });

    it('formatResult prints friendly string', () => {
      expect(formatResult(ok(1))).toBe('Ok(1)');
      expect(formatResult(err(new Error('boom')))).toBe('Err(boom)');
    });
  });
});
