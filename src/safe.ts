import { some as someUnsafe, ok as okUnsafe, err, none, isErr } from './types.js';
import type {
  Some,
  None,
  Ok,
  Err,
  Option as OptionType,
  OptionValue,
  IsOption,
  InferSome,
  Result as ResultType,
  ResultValue,
  ResultErrorType,
  IsResult,
  InferErr,
  ValueType,
} from './types.js';

export type { Some, None, Ok, Err, OptionType, OptionValue, IsOption, InferSome, ResultType, ResultValue, ResultErrorType, IsResult, InferErr };

export { none, err };
export * as Option from './option.js';
export * as Result from './result.js';

/**
 * Creates a Some value with runtime validation.
 * Throws if the value is null or undefined.
 * @param value - The value to wrap (must be non-nullable)
 * @returns The value typed as Some
 * @throws {TypeError} If value is null or undefined
 * @example
 * some(42)        // Some(42)
 * some(null)      // throws TypeError
 * some(undefined) // throws TypeError
 */
export function some<T>(value: T): Some<ValueType<T>> {
  if (value === null || value === undefined) {
    throw new TypeError('some() requires a non-nullable value');
  }
  return someUnsafe(value as ValueType<T>);
}

/**
 * Creates an Ok value with runtime validation.
 * Throws if the value is an Err (prevents accidental double-wrapping).
 * @param value - The success value
 * @returns The value typed as Ok
 * @throws {TypeError} If value is an Err
 * @example
 * ok(42)           // Ok(42)
 * ok(err('fail'))  // throws TypeError
 */
export function ok<T>(value: T): Ok<T> {
  if (isErr(value)) {
    throw new TypeError('ok() cannot wrap an Err value');
  }
  return okUnsafe(value);
}
