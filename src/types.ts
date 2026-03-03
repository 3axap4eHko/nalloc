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

/** Shared frozen empty array to avoid allocations. */
export const EMPTY: readonly unknown[] = Object.freeze([]);

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

export function someUnchecked<T>(value: T): Some<ValueType<T>> {
  return value as Some<ValueType<T>>;
}

/**
 * Creates a Some value with runtime validation.
 * @param value - The value to wrap
 * @returns The value typed as Some
 * @throws TypeError if value is null or undefined
 * @example
 * some(42) // Some(42)
 */
export function some<T>(value: ValueType<T>): Some<ValueType<T>> {
  if (value === null || value === undefined) {
    throw new TypeError('some() requires a non-nullable value');
  }
  return someUnchecked(value);
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
export function isOk(result: unknown): boolean;
export function isOk(result: unknown): boolean {
  return !(result as Record<symbol, unknown>)?.[ERR_BRAND];
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
export function isErr(result: Ok<unknown>): false;
export function isErr<T, E>(result: Result<T, E>): result is Err<E>;
export function isErr(result: unknown): result is Err<unknown>;
export function isErr(result: unknown): boolean {
  return (result as Record<symbol, unknown>)?.[ERR_BRAND] === true;
}

export function okUnchecked<T>(value: T): Ok<T> {
  return value as Ok<T>;
}

/**
 * Creates an Ok value with runtime validation.
 * @param value - The success value
 * @returns The value typed as Ok
 * @throws TypeError if value is an Err
 * @example
 * ok(42) // Ok(42)
 */
export function ok<T>(value: T): Ok<T> {
  if (isErr(value)) {
    throw new TypeError('ok() cannot wrap an Err value');
  }
  return okUnchecked(value);
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

/** A value that may or may not be a Promise. */
export type MaybePromise<T> = T | Promise<T> | PromiseLike<T>;

/**
 * Checks if a value is a thenable (has a .then method).
 * @param value - The value to check
 * @returns true if value is a PromiseLike
 */
export function isThenable<T>(value: MaybePromise<T>): value is PromiseLike<T> {
  return typeof (value as PromiseLike<T>)?.then === 'function';
}

/**
 * Checks if a value is synchronous (not a thenable).
 * @param value - The value to check
 * @returns true if value is not a PromiseLike
 */
export function isSync<T>(value: MaybePromise<T>): value is T {
  return typeof (value as PromiseLike<T>)?.then !== 'function';
}
