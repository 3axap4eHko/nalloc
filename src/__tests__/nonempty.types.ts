import { assert, type Equals } from 'tsafe';
import {
  isNonEmpty,
  assertNonEmpty,
  fromArray,
  type NonEmptyArray,
  type ReadonlyNonEmptyArray,
} from '../nonempty.js';
import type { Option } from '../types.js';

const readonlyValues: readonly number[] = [1, 2, 3];
const mutableValues: number[] = [1, 2, 3];

if (isNonEmpty(readonlyValues)) {
  assert<Equals<typeof readonlyValues, ReadonlyNonEmptyArray<number>>>;
  const _head: number = readonlyValues[0];
}

if (isNonEmpty(mutableValues)) {
  const _head: number = mutableValues[0];
}

const asserted: readonly number[] = [1];
assertNonEmpty(asserted);
assert<Equals<typeof asserted, ReadonlyNonEmptyArray<number>>>;
const _assertedHead: number = asserted[0];

const maybeNonEmpty = fromArray<number>([1, 2]);
assert<Equals<typeof maybeNonEmpty, Option<ReadonlyNonEmptyArray<number>>>>;

const fromEmpty = fromArray([] as const);
assert<Equals<typeof fromEmpty, Option<ReadonlyNonEmptyArray<never>>>>;

type _MutableShape = Equals<NonEmptyArray<number>, [number, ...number[]]>;
assert<_MutableShape>;

type _ReadonlyShape = Equals<ReadonlyNonEmptyArray<number>, readonly [number, ...number[]]>;
assert<_ReadonlyShape>;
