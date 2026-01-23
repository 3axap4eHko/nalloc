import type { Some, Ok } from './types.js';
export { none, err } from './types.js';
export type {
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
} from './types.js';
export * as Option from './option.js';
export * as Result from './result.js';

/**
 * Creates a Some value without runtime validation.
 * Use when you are certain the value is non-nullable.
 * For validated creation, use safe.some() instead.
 * @param value - The value to wrap (assumed non-nullable)
 * @returns The value typed as Some
 * @example
 * some(42)   // Some(42)
 * some(null) // Some(null) - no validation, may cause issues
 */
export function some<T>(value: T): Some<T> {
  return value as unknown as Some<T>;
}

/**
 * Creates an Ok value without runtime validation.
 * Use when you are certain the value is not an Err.
 * For validated creation, use safe.ok() instead.
 * @param value - The success value (assumed not an Err)
 * @returns The value typed as Ok
 * @example
 * ok(42)          // Ok(42)
 * ok(err('fail')) // Ok(Err) - no validation, may cause issues
 */
export function ok<T>(value: T): Ok<T> {
  return value as Ok<T>;
}
