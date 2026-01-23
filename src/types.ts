/** Values that represent None (absence of a value). */
export type NoneValueType = null | undefined | void;

/** Widens literal types to their base types for better type inference. */
export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends bigint
        ? bigint
        : T extends symbol
          ? symbol
          : T;

/** Widens never to unknown, otherwise preserves the type. */
export type WidenNever<T> = [T] extends [never] ? unknown : T;

/** Excludes None values from a type, leaving only valid Some values. */
export type ValueType<T> = Exclude<T, NoneValueType>;

export declare const SOME_BRAND: unique symbol;

/** Represents a value that is present. The value itself is the Some - no wrapper object. */
export type Some<T> = ValueType<T> & { readonly [SOME_BRAND]: true };

/** Represents the absence of a value (null or undefined). */
export type None = NoneValueType & { readonly [SOME_BRAND]: false };

/** Constant representing None. Use this instead of null/undefined for clarity. */
export const NONE = undefined as None;

/** A value that may or may not be present. Some(T) is the value itself; None is null/undefined. */
export type Option<T> = Some<ValueType<T>> | None;

/** Extracts the value type from an Option type. */
export type OptionValue<TOption> = TOption extends Option<infer TValue> ? TValue : never;

/** Type predicate: true if T is an Option type. */
export type IsOption<T> = T extends Option<any> ? true : false;

/** Infers the Some type from a value, preserving the inner type. */
export type InferSome<T> = T extends Some<infer TValue> ? Some<ValueType<TValue>> : never;

/**
 * Checks if an Option contains a value (is Some).
 * @param opt - The Option to check
 * @returns true if the Option is Some, false if None
 * @example
 * isSome(42)        // true
 * isSome(null)      // false
 * isSome(undefined) // false
 */
export function isSome<T>(opt: Some<T>): true;
export function isSome(opt: None): false;
export function isSome<T>(opt: unknown): opt is Some<T>;
export function isSome(opt: unknown): boolean {
  return opt !== null && opt !== undefined;
}

/**
 * Checks if an Option is None (absent).
 * @param opt - The Option to check
 * @returns true if the Option is None, false if Some
 * @example
 * isNone(null)      // true
 * isNone(undefined) // true
 * isNone(42)        // false
 */
export function isNone<T>(opt: Some<T>): false;
export function isNone(opt: None): true;
export function isNone(opt: unknown): opt is None;
export function isNone(opt: unknown): boolean {
  return opt === null || opt === undefined;
}

/**
 * Creates an Option from a nullable value. Returns None for null/undefined, Some otherwise.
 * @param value - The value to wrap
 * @returns Some(value) if value is non-null, None otherwise
 * @example
 * optionOf(42)        // Some(42)
 * optionOf(null)      // None
 * optionOf(undefined) // None
 */
export function optionOf(value: null): None;
export function optionOf(value: undefined): None;
export function optionOf<T>(value: T): T extends NoneValueType ? None : Some<T>;
export function optionOf<T>(value: T): Option<T> {
  return isNone(value as Option<T>) ? NONE : (value as Some<T>);
}

/**
 * Creates a Some value. Does not validate - use safe.some() for validation.
 * @param value - The value to wrap (must be non-null)
 * @returns The value typed as Some
 * @example
 * some(42) // Some(42)
 */
export function some<T>(value: ValueType<T>): Some<ValueType<T>> {
  return value as Some<ValueType<T>>;
}

/** Constant representing None. Alias for NONE. */
export const none: None = NONE;

declare const OK_BRAND: unique symbol;

/** Represents a successful Result value. The value itself is the Ok - no wrapper object. */
export type Ok<T> = T & { readonly [OK_BRAND]: true };

const ERR_BRAND = Symbol.for('nalloc.ResultError');

interface ResultErrorShape<E> {
  readonly error: E;
  readonly [ERR_BRAND]: true;
}

function ResultErrorCtor<E>(this: ResultErrorShape<E>, error: E): void {
  (this as { error: E }).error = error;
}
(ResultErrorCtor.prototype as { [ERR_BRAND]: true })[ERR_BRAND] = true;

/** The error wrapper type used internally. */
export type ResultError<E> = ResultErrorShape<E>;

function hasErrBrand(value: unknown): value is ResultError<unknown> {
  return (value as Record<symbol, unknown>)?.[ERR_BRAND] === true;
}

/** Represents a failed Result containing an error. */
export type Err<E> = ResultError<E>;

/** A value that is either successful (Ok) or failed (Err). Ok is the value itself; Err wraps the error. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Extracts the success value type from a Result type. */
export type ResultValue<TResult> = TResult extends Result<infer TValue, any> ? TValue : never;

/** Extracts the error type from a Result type. */
export type ResultErrorType<TResult> = TResult extends Result<any, infer TError> ? TError : never;

/** Type predicate: true if T is a Result type. */
export type IsResult<T> = T extends Result<any, any> ? true : false;

/** Infers the Err type from a value, preserving the error type. */
export type InferErr<T> = T extends Err<infer TError> ? Err<TError> : never;

/**
 * Checks if a Result is Ok (successful).
 * @param result - The Result to check
 * @returns true if the Result is Ok, false if Err
 * @example
 * isOk(42)           // true (Ok value)
 * isOk(err('fail'))  // false
 */
export function isOk<T>(result: Ok<T>): true;
export function isOk<E>(result: Err<E>): false;
export function isOk<T, E>(result: Result<T, E>): result is Ok<T>;
export function isOk<T, E>(result: Result<T, E>): boolean {
  return !hasErrBrand(result);
}

/**
 * Checks if a Result is Err (failed).
 * @param result - The Result to check
 * @returns true if the Result is Err, false if Ok
 * @example
 * isErr(err('fail')) // true
 * isErr(42)          // false (Ok value)
 */
export function isErr<E>(result: Err<E>): true;
export function isErr(result: Ok<any>): false;
export function isErr<T, E>(result: Result<T, E>): result is Err<E>;
export function isErr<T, E>(result: Result<T, E>): boolean {
  return hasErrBrand(result);
}

/**
 * Creates an Ok value. Does not validate - use safe.ok() for validation.
 * @param value - The success value
 * @returns The value typed as Ok
 * @example
 * ok(42) // Ok(42)
 */
export function ok<T>(value: T): Ok<T> {
  return value as Ok<T>;
}

/**
 * Creates an Err value wrapping an error.
 * @param error - The error value
 * @returns An Err containing the error
 * @example
 * err('something went wrong') // Err('something went wrong')
 * err(new Error('failed'))    // Err(Error)
 */
export function err<E>(error: E): Err<E> {
  return new (ResultErrorCtor as unknown as new (error: E) => Err<E>)(error);
}
