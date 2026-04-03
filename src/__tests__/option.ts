import { describe, it, expect } from 'vitest';
import {
  of,
  isSome,
  isNone,
  map,
  flatMap,
  andThen,
  tap,
  filter,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  expect as expectOpt,
  or,
  orElse,
  xor,
  and,
  zip,
  unzip,
  mapOr,
  mapOrElse,
  flatten,
  contains,
  isSomeAnd,
  toArray,
  toNullable,
  toUndefined,
  match,
  okOr,
  okOrElse,
  ofOk,
  ofErr,
  fromNullable,
  fromPromise,
  unwrapOrReturn,
  assertSome,
  satisfiesOption,
  filterMap,
  isNoneOr,
  findMap,
  tapNone
} from '../option.js';
import { ok, err, some, none } from '../types.js';

describe('Option', () => {
  describe('constructors', () => {
    it('of creates Some from non-null value', () => {
      const opt = of(42);
      expect(isSome(opt)).toBe(true);
      expect(opt).toBe(42);
    });

    it('of creates None from null', () => {
      const opt = of(null);
      expect(isNone(opt)).toBe(true);
    });

    it('of creates None from undefined', () => {
      const opt = of(undefined);
      expect(isNone(opt)).toBe(true);
    });

    it('some creates Some from value', () => {
      const opt = some(42);
      expect(isSome(opt)).toBe(true);
      expect(opt).toBe(42);
    });

    it('some throws on null/undefined', () => {
      expect(() => some(null as any)).toThrow('some() requires a non-nullable value');
      expect(() => some(undefined as any)).toThrow('some() requires a non-nullable value');
    });

    it('none creates None', () => {
      const opt = none;
      expect(isNone(opt)).toBe(true);
    });
  });

  describe('type guards', () => {
    it('isSome returns true for Some', () => {
      expect(isSome(of(42))).toBe(true);
      expect(isSome(of(0))).toBe(true);
      expect(isSome(of(''))).toBe(true);
      expect(isSome(of(false))).toBe(true);
    });

    it('isSome returns false for None', () => {
      expect(isSome(none)).toBe(false);
      expect(isSome(of(null))).toBe(false);
      expect(isSome(of(undefined))).toBe(false);
    });

    it('isNone returns true for None', () => {
      expect(isNone(none)).toBe(true);
      expect(isNone(of(null))).toBe(true);
      expect(isNone(of(undefined))).toBe(true);
    });

    it('isNone returns false for Some', () => {
      expect(isNone(of(42))).toBe(false);
      expect(isNone(of(0))).toBe(false);
      expect(isNone(of(''))).toBe(false);
    });
  });

  describe('map', () => {
    it('maps Some value', () => {
      const result = map(of(2), x => x * 3);
      expect(unwrap(result)).toBe(6);
    });

    it('returns None for None', () => {
      const result = map(none, (x: number) => x * 3);
      expect(isNone(result)).toBe(true);
    });

    it('returns None if mapper returns null', () => {
      const result = map(of(2), () => null);
      expect(isNone(result)).toBe(true);
    });

    it('returns None if mapper returns undefined', () => {
      const result = map(of(2), () => undefined);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('flatMap', () => {
    it('flatMaps Some value', () => {
      const result = flatMap(of(2), x => of(x * 3));
      expect(unwrap(result)).toBe(6);
    });

    it('returns None for None', () => {
      const result = flatMap(none, (x: number) => of(x * 3));
      expect(isNone(result)).toBe(true);
    });

    it('can return None from mapper', () => {
      const result = flatMap(of(2), () => none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('andThen', () => {
    it('aliases flatMap for Some', () => {
      const result = andThen(of(3), x => of(x * 2));
      expect(unwrap(result)).toBe(6);
    });

    it('returns None for None', () => {
      const result = andThen(none, x => of(x * 2));
      expect(isNone(result)).toBe(true);
    });
  });

  describe('tap', () => {
    it('runs for Some and returns original', () => {
      let seen = 0;
      const opt = of(5);
      const result = tap(opt, value => {
        seen = value;
      });
      expect(result).toBe(opt);
      expect(seen).toBe(5);
    });

    it('does not run for None', () => {
      let called = false;
      const result = tap(none, () => {
        called = true;
      });
      expect(isNone(result)).toBe(true);
      expect(called).toBe(false);
    });
  });

  describe('tapNone', () => {
    it('runs for None and returns original', () => {
      let called = false;
      const result = tapNone(none, () => {
        called = true;
      });
      expect(isNone(result)).toBe(true);
      expect(called).toBe(true);
    });

    it('does not run for Some', () => {
      let called = false;
      const opt = of(5);
      const result = tapNone(opt, () => {
        called = true;
      });
      expect(result).toBe(opt);
      expect(called).toBe(false);
    });
  });

  describe('filter', () => {
    it('keeps Some if predicate is true', () => {
      const result = filter(of(5), x => x > 3);
      expect(unwrap(result)).toBe(5);
    });

    it('returns None if predicate is false', () => {
      const result = filter(of(2), x => x > 3);
      expect(isNone(result)).toBe(true);
    });

    it('returns None for None', () => {
      const result = filter(none, () => true);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('unwrap', () => {
    it('returns value for Some', () => {
      expect(unwrap(of(42))).toBe(42);
    });

    it('throws for None', () => {
      expect(() => unwrap(none)).toThrow('Called unwrap on None');
    });
  });

  describe('unwrapOr', () => {
    it('returns value for Some', () => {
      expect(unwrapOr(of(42), 0)).toBe(42);
    });

    it('returns default for None', () => {
      expect(unwrapOr(none, 99)).toBe(99);
    });
  });

  describe('unwrapOrElse', () => {
    it('returns value for Some', () => {
      expect(unwrapOrElse(of(42), () => 0)).toBe(42);
    });

    it('calls function for None', () => {
      let called = false;
      const result = unwrapOrElse(none, () => {
        called = true;
        return 99;
      });
      expect(result).toBe(99);
      expect(called).toBe(true);
    });
  });

  describe('expect', () => {
    it('returns value for Some', () => {
      expect(expectOpt(of(42), 'error')).toBe(42);
    });

    it('throws with message for None', () => {
      expect(() => expectOpt(none, 'custom error')).toThrow('custom error');
    });
  });

  describe('or', () => {
    it('returns first if Some', () => {
      const result = or(of(1), of(2));
      expect(unwrap(result)).toBe(1);
    });

    it('returns second if first is None', () => {
      const result = or(none, of(2));
      expect(unwrap(result)).toBe(2);
    });

    it('returns None if both None', () => {
      const result = or(none, none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('orElse', () => {
    it('returns first if Some', () => {
      const result = orElse(of(1), () => of(2));
      expect(unwrap(result)).toBe(1);
    });

    it('calls function if None', () => {
      let called = false;
      const result = orElse(none, () => {
        called = true;
        return of(2);
      });
      expect(unwrap(result)).toBe(2);
      expect(called).toBe(true);
    });
  });

  describe('xor', () => {
    it('returns first if only first is Some', () => {
      const result = xor(of(1), none);
      expect(unwrap(result)).toBe(1);
    });

    it('returns second if only second is Some', () => {
      const result = xor(none, of(2));
      expect(unwrap(result)).toBe(2);
    });

    it('returns None if both Some', () => {
      const result = xor(of(1), of(2));
      expect(isNone(result)).toBe(true);
    });

    it('returns None if both None', () => {
      const result = xor(none, none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('and', () => {
    it('returns second if first is Some', () => {
      const result = and(of(1), of(2));
      expect(unwrap(result)).toBe(2);
    });

    it('returns None if first is None', () => {
      const result = and(none, of(2));
      expect(isNone(result)).toBe(true);
    });

    it('returns None if second is None', () => {
      const result = and(of(1), none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('zip', () => {
    it('zips two Some values', () => {
      const result = zip(of(1), of('a'));
      expect(unwrap(result)).toEqual([1, 'a']);
    });

    it('returns None if first is None', () => {
      const result = zip(none, of('a'));
      expect(isNone(result)).toBe(true);
    });

    it('returns None if second is None', () => {
      const result = zip(of(1), none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('unzip', () => {
    it('unzips Some tuple', () => {
      const [a, b] = unzip(of([1, 'a'] as [number, string]));
      expect(unwrap(a)).toBe(1);
      expect(unwrap(b)).toBe('a');
    });

    it('returns two Nones for None', () => {
      const [a, b] = unzip(none);
      expect(isNone(a)).toBe(true);
      expect(isNone(b)).toBe(true);
    });

    it('handles null/undefined in tuple', () => {
      const [a, b] = unzip(of([null, undefined] as [null, undefined]));
      expect(isNone(a)).toBe(true);
      expect(isNone(b)).toBe(true);
    });
  });

  describe('mapOr', () => {
    it('maps Some value', () => {
      expect(mapOr(of(2), 0, x => x * 3)).toBe(6);
    });

    it('returns default for None', () => {
      expect(mapOr(none, 99, (x: number) => x * 3)).toBe(99);
    });
  });

  describe('mapOrElse', () => {
    it('maps Some value', () => {
      expect(mapOrElse(of(2), () => 0, x => x * 3)).toBe(6);
    });

    it('calls default function for None', () => {
      let called = false;
      const result = mapOrElse(none, () => {
        called = true;
        return 99;
      }, (x: number) => x * 3);
      expect(result).toBe(99);
      expect(called).toBe(true);
    });
  });

  describe('flatten', () => {
    it('flattens nested Some', () => {
      const result = flatten(of(of(42)));
      expect(unwrap(result)).toBe(42);
    });

    it('returns inner None', () => {
      const result = flatten(of(none));
      expect(isNone(result)).toBe(true);
    });

    it('returns None for outer None', () => {
      const result = flatten(none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('contains', () => {
    it('returns true if Some contains value', () => {
      expect(contains(of(42), 42)).toBe(true);
    });

    it('returns false if Some contains different value', () => {
      expect(contains(of(42), 43)).toBe(false);
    });

    it('returns false for None', () => {
      expect(contains(none, 42)).toBe(false);
    });
  });

  describe('isSomeAnd', () => {
    it('returns true if Some and predicate true', () => {
      expect(isSomeAnd(of(5), x => x > 3)).toBe(true);
    });

    it('returns false if Some and predicate false', () => {
      expect(isSomeAnd(of(2), x => x > 3)).toBe(false);
    });

    it('returns false for None', () => {
      expect(isSomeAnd(none, () => true)).toBe(false);
    });
  });

  describe('toArray', () => {
    it('returns array with value for Some', () => {
      expect(toArray(of(42))).toEqual([42]);
    });

    it('returns empty array for None', () => {
      expect(toArray(none)).toEqual([]);
    });
  });

  describe('toNullable', () => {
    it('returns value for Some', () => {
      expect(toNullable(of(42))).toBe(42);
    });

    it('returns null for None', () => {
      expect(toNullable(none)).toBe(null);
    });
  });

  describe('toUndefined', () => {
    it('returns value for Some', () => {
      expect(toUndefined(of(42))).toBe(42);
    });

    it('returns undefined for None', () => {
      expect(toUndefined(none)).toBe(undefined);
    });
  });

  describe('match', () => {
    it('calls some branch for Some', () => {
      const result = match(
        of(42),
        x => `value: ${x}`,
        () => 'nothing',
      );
      expect(result).toBe('value: 42');
    });

    it('calls none branch for None', () => {
      const result = match(
        none,
        (x: number) => `value: ${x}`,
        () => 'nothing',
      );
      expect(result).toBe('nothing');
    });
  });

  describe('okOr', () => {
    it('converts Some to Ok', () => {
      const result = okOr(of(42), 'error');
      expect(result).toBe(42);
    });

    it('converts None to Err', () => {
      const result = okOr(none, 'error');
      expect(result.error).toBe('error');
    });
  });

  describe('okOrElse', () => {
    it('converts Some to Ok', () => {
      const result = okOrElse(of(42), () => 'error');
      expect(result).toBe(42);
    });

    it('converts None to Err with lazy error', () => {
      let called = false;
      const result = okOrElse(none, () => {
        called = true;
        return 'error';
      });
      expect(result.error).toBe('error');
      expect(called).toBe(true);
    });
  });

  describe('ofOk', () => {
    it('extracts Ok value as Some', () => {
      const result = ofOk(ok(42));
      expect(unwrap(result)).toBe(42);
    });

    it('returns None for Err', () => {
      const result = ofOk(err('error'));
      expect(isNone(result)).toBe(true);
    });

    it('returns None for Ok(null)', () => {
      const result = ofOk(ok(null));
      expect(isNone(result)).toBe(true);
    });

    it('returns None for Ok(undefined)', () => {
      const result = ofOk(ok(undefined));
      expect(isNone(result)).toBe(true);
    });
  });

  describe('ofErr', () => {
    it('extracts Err value as Some', () => {
      const result = ofErr(err('error'));
      expect(unwrap(result)).toBe('error');
    });

    it('returns None for Ok', () => {
      const result = ofErr(ok(42));
      expect(isNone(result)).toBe(true);
    });

    it('returns None for Err(null)', () => {
      const result = ofErr(err(null));
      expect(isNone(result)).toBe(true);
    });

    it('returns None for Err(undefined)', () => {
      const result = ofErr(err(undefined));
      expect(isNone(result)).toBe(true);
    });
  });

  describe('from helpers', () => {
    it('fromNullable mirrors of behavior', () => {
      expect(isSome(fromNullable(3))).toBe(true);
      expect(isNone(fromNullable(null))).toBe(true);
    });

    it('fromPromise resolves Some when promise fulfills', async () => {
      const opt = await fromPromise(Promise.resolve(42));
      expect(isSome(opt)).toBe(true);
      expect(unwrap(opt)).toBe(42);
    });

    it('fromPromise uses fallback on rejection', async () => {
      const opt = await fromPromise(
        Promise.reject(new Error('boom')),
        () => 99,
      );
      expect(isSome(opt)).toBe(true);
      expect(unwrap(opt)).toBe(99);
    });

    it('fromPromise returns None on rejection without callback', async () => {
      const opt = await fromPromise(Promise.reject(new Error('boom')));
      expect(isNone(opt)).toBe(true);
    });
  });

  describe('control helpers', () => {
    it('unwrapOrReturn returns value for Some', () => {
      const result = unwrapOrReturn(of(42), () => 77);
      expect(result).toBe(42);
    });

    it('unwrapOrReturn returns fallback for None', () => {
      const result = unwrapOrReturn(none, () => 77);
      expect(result).toBe(77);
    });

    it('assertSome narrows Some', () => {
      const opt = of(15);
      assertSome(opt);
      expect(opt).toBe(15);
    });

    it('assertSome throws for None', () => {
      expect(() => assertSome(none)).toThrow('Expected Option to contain a value');
    });

    it('satisfiesOption validates at runtime', () => {
      const candidate: any = of(3);
      expect(() => satisfiesOption(candidate)).not.toThrow();
    });
  });

  describe('filterMap', () => {
    it('collects Some values from iterable', () => {
      const items = [of(1), none, of(3)];
      const result = filterMap(items, opt => opt);
      expect(result).toEqual([1, 3]);
    });
  });

  describe('isNoneOr', () => {
    it('returns true for None', () => {
      expect(isNoneOr(none, () => false)).toBe(true);
    });

    it('returns true for Some when predicate is true', () => {
      expect(isNoneOr(some(5), x => x > 2)).toBe(true);
    });

    it('returns false for Some when predicate is false', () => {
      expect(isNoneOr(some(1), x => x > 2)).toBe(false);
    });
  });

  describe('findMap', () => {
    it('returns first Some result', () => {
      const result = findMap([1, 2, 3], n => n > 1 ? some(n * 2) : none);
      expect(isSome(result)).toBe(true);
      expect(result).toBe(4);
    });

    it('returns None when no match', () => {
      const result = findMap([1, 2, 3], n => n > 5 ? some(n) : none);
      expect(isNone(result)).toBe(true);
    });

    it('returns None for empty iterable', () => {
      const result = findMap([], () => some(1));
      expect(isNone(result)).toBe(true);
    });
  });
});
