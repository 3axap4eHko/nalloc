import { assert, type Not, type Equals } from 'tsafe';
import {
  of,
  isSome,
  isNone,
  map,
  filter,
  okOr,
  okOrElse,
  filterMap,
  fromNullable,
  unwrapOrReturn,
  assertSome,
  satisfiesOption
} from '../option.js';
import { Some, None, Option, some, none, type InferSome } from '../types.js';
import { Result, isOk, isErr } from '../result.js';

type TRUE = true;
type FALSE = false;

const someValue = of<number>(5);
assert<Equals<typeof someValue, Some<number>>>;
assert<Not<Equals<typeof someValue, None>>>;

const explicitSome = some<number>(42);
assert<Equals<typeof explicitSome, Some<number>>>;

const noneValue = none;
assert<Equals<typeof noneValue, None>>;

const optValue: Option<number> = Math.random() > 0 ? of(5) : none;
if (isSome(optValue)) {
  assert<Equals<typeof optValue, Some<number>>>;
  const _: number = optValue;
}
if (isNone(optValue)) {
  assert<Equals<typeof optValue, None>>;
}
const mapped = map(someValue, (v) => v * 2);assert<Equals<typeof mapped, Option<number>>>;
const maybeNullMapped = map(someValue, (v): number | null => v > 10 ? v : null);
assert<Equals<typeof maybeNullMapped, Option<number>>>;
const filtered = filter(someValue, (v) => v > 0);
assert<Equals<typeof filtered, Option<number>>>;
const noneFromNull = of(null);
assert<Equals<typeof noneFromNull, None>>;
assert<Not<Equals<typeof noneFromNull, Some<any>>>>;
const noneFromUndefined = of(undefined);
assert<Equals<typeof noneFromUndefined, None>>;
const noneResult = map(noneFromNull, () => 42);
assert<Equals<typeof noneResult, None>>;

const noneFiltered = filter(noneFromNull, () => true);
assert<Equals<typeof noneFiltered, None>>;
const unknownOption: Option<number> = Math.random() > 0.5 ? of(42) : none;

if (isSome(unknownOption)) {
  assert<Equals<typeof unknownOption, Some<number>>>;
  const value: number = unknownOption;
} else {
  assert<Equals<typeof unknownOption, None>>;
}
const someNumber: Some<number> = of(100) as Some<number>;
const plainNumber: number = someNumber;const result = map(
  filter(
    of(10),
    x => x > 5
  ),
  x => x * 2
);
assert<Equals<typeof result, Option<number>>>;
const knownSome = of(123);
const isSomeOnSome = isSome(knownSome);
assert<Equals<typeof isSomeOnSome, true>>;
assert<Not<Equals<typeof isSomeOnSome, false>>>;
assert<Not<Equals<typeof isSomeOnSome, boolean>>>;
const knownNone = none;
const isSomeOnNone = isSome(knownNone);
assert<Equals<typeof isSomeOnNone, false>>;
assert<Not<Equals<typeof isSomeOnNone, true>>>;
assert<Not<Equals<typeof isSomeOnNone, boolean>>>;
const isNoneOnSome = isNone(knownSome);
assert<Equals<typeof isNoneOnSome, false>>;
assert<Not<Equals<typeof isNoneOnSome, true>>>;
assert<Not<Equals<typeof isNoneOnSome, boolean>>>;
const isNoneOnNone = isNone(knownNone);
assert<Equals<typeof isNoneOnNone, true>>;
assert<Not<Equals<typeof isNoneOnNone, false>>>;
assert<Not<Equals<typeof isNoneOnNone, boolean>>>;
const nestedOption: Option<Option<number>> = of(of(42));

const optToResult = okOr(of(42), 'error');
// optToResult is Result<number, string>

const noneToResult = okOr(none, 'error');
// noneToResult is Result<never, string>

const lazyErrorResult = okOrElse(none, () => new Error('computed'));
// lazyErrorResult is Result<never, Error>

const optionArray: Option<number>[] = [of(1), none, of(3)];
const mappedArray = filterMap(optionArray, opt => opt);
assert<Equals<typeof mappedArray, number[]>>;

const nullable = fromNullable(5);
assert<Equals<typeof nullable, Option<number>>>;

const fallback = unwrapOrReturn(of(2), () => 'fallback');
assert<Equals<typeof fallback, number | string>>;

declare const unknownOptionValue: Option<number>;
assertSome(unknownOptionValue);
const narrowedSome: Some<number> = unknownOptionValue;

let candidate: Option<number> | number = of(5);
satisfiesOption(candidate);
type CandidateIsOption = typeof candidate extends Option<number> ? TRUE : FALSE;
assert<Equals<CandidateIsOption, true>>;

type ExtractedSome = InferSome<Option<number>>;
assert<Equals<ExtractedSome, Some<number>>>;
