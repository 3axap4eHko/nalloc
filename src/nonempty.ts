import { NONE } from './types.js';
import type { Option, Some } from './types.js';

/** An array proven to contain at least one element. The runtime value is a plain array. */
export type NonEmptyArray<T> = [T, ...T[]];

/** A readonly array proven to contain at least one element. The runtime value is a plain array. */
export type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Checks whether an array has at least one element.
 * @param values - The array to check
 * @returns true if the array is non-empty
 * @example
 * isNonEmpty([])     // false
 * isNonEmpty([1])    // true
 */
export function isNonEmpty<T>(values: readonly T[]): values is ReadonlyNonEmptyArray<T> {
  return values.length > 0;
}

/**
 * Asserts that an array is non-empty, throwing otherwise.
 * @param values - The array to check
 * @param message - Custom error message
 * @throws Error if the array is empty
 * @example
 * assertNonEmpty([1]) // passes
 * assertNonEmpty([])  // throws Error
 */
export function assertNonEmpty<T>(values: readonly T[], message?: string): asserts values is ReadonlyNonEmptyArray<T> {
  if (values.length === 0) {
    throw new Error(message ?? 'Expected array to be non-empty');
  }
}

/**
 * Converts an array to an Option of a non-empty array. Returns the same array
 * value when non-empty - no allocation or cloning.
 * @param values - The array to convert
 * @returns Some(values) typed as non-empty if length > 0, None otherwise
 * @example
 * fromArray([])     // None
 * fromArray([1, 2]) // Some([1, 2]) with non-empty type
 */
export function fromArray<T>(values: readonly T[]): Option<ReadonlyNonEmptyArray<T>> {
  return values.length > 0 ? (values as Some<ReadonlyNonEmptyArray<T>>) : NONE;
}
