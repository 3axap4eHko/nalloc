import { NONE, EMPTY, isSome, isNone, optionOf as of, err, isOk, isErr } from './types.js';
import type { Some, None, Option, NoneValueType, ValueType, Result, Ok, Widen } from './types.js';

export type { Some, None, Option };
export { isSome, isNone, of };

/**
 * Creates an Option from a nullable value with widened types.
 * @param value - The value to wrap
 * @returns Some(value) if non-null, None otherwise
 * @example
 * fromNullable(42)   // Some(42) with type Option<number>
 * fromNullable(null) // None
 */
export function fromNullable(value: null): None;
export function fromNullable(value: undefined): None;
export function fromNullable<T>(value: T | NoneValueType): Option<Widen<T>>;
export function fromNullable<T>(value: T | NoneValueType): Option<Widen<T>> {
  return of(value) as Option<Widen<T>>;
}

/**
 * Creates an Option from a Promise. Resolves to Some if successful, None on rejection.
 * @param promise - The promise to convert
 * @param onRejected - Optional handler for rejected promises
 * @returns Promise resolving to Some(value) or None
 * @example
 * await fromPromise(Promise.resolve(42))     // Some(42)
 * await fromPromise(Promise.reject('error')) // None
 */
export async function fromPromise<T>(promise: Promise<T | NoneValueType>, onRejected?: (error: unknown) => T | NoneValueType): Promise<Option<T>> {
  try {
    const value = await promise;
    return of(value as T);
  } catch (error) {
    if (!onRejected) {
      return NONE;
    }
    return of(onRejected(error));
  }
}

/**
 * Unwraps an Option or returns a computed value if None.
 * @param opt - The Option to unwrap
 * @param onNone - Function called if opt is None
 * @returns The value if Some, or the result of onNone()
 * @example
 * unwrapOrReturn(some(42), () => 0)  // 42
 * unwrapOrReturn(none, () => 0)      // 0
 */
export function unwrapOrReturn<T, R>(opt: Option<T>, onNone: () => R): Widen<T> | R {
  return isSome(opt) ? (opt as Widen<T>) : onNone();
}

/**
 * Asserts that an Option is Some, throwing if None.
 * @param opt - The Option to assert
 * @param message - Custom error message
 * @throws Error if opt is None
 * @example
 * assertSome(some(42))  // passes
 * assertSome(none)      // throws Error
 */
export function assertSome<T>(opt: Option<T>, message?: string): asserts opt is Some<ValueType<T>> {
  if (isNone(opt)) {
    throw new Error(message ?? 'Expected Option to contain a value');
  }
}

/**
 * Compile-time type assertion helper to satisfy Option type constraints.
 *
 * WARNING: This function performs NO runtime validation. It is a no-op at
 * runtime to preserve zero-allocation semantics. Use assertSome() if you
 * need runtime validation that a value is Some.
 *
 * @param _ - The value to assert as Option (not validated at runtime)
 * @example
 * const value: number | null = getValue();
 * satisfiesOption(value); // Compiles, but no runtime check
 * // value is now typed as Option<number>
 */
export function satisfiesOption<T>(_: Option<T> | T): asserts _ is Option<T> {
  // Compile-time only - no runtime validation to preserve zero-allocation semantics.
}

/**
 * Maps and filters an iterable, collecting only Some values.
 * @param values - The iterable to process
 * @param fn - Function that returns Option for each value
 * @returns Array of unwrapped Some values
 * @example
 * filterMap([1, 2, 3], n => n > 1 ? some(n * 2) : none) // [4, 6]
 */
export function filterMap<T, U>(values: Iterable<T>, fn: (value: T) => Option<U>): U[] {
  const collected: U[] = [];
  for (const value of values) {
    const mapped = fn(value);
    if (isSome(mapped)) collected.push(mapped);
  }
  return collected;
}

/**
 * Finds the first element that maps to Some, returning that value.
 * @param values - Iterable to search
 * @param fn - Function that returns Some for matches
 * @returns The first Some value, or None if no match
 * @example
 * findMap([1, 2, 3], n => n > 1 ? some(n * 2) : none) // Some(4)
 * findMap([1], n => n > 5 ? some(n) : none)           // None
 */
export function findMap<T, U>(values: Iterable<T>, fn: (value: T) => Option<U>): Option<U> {
  for (const value of values) {
    const mapped = fn(value);
    if (isSome(mapped)) return mapped;
  }
  return NONE;
}

/**
 * Transforms the value inside a Some, or returns None.
 * @param opt - The Option to map
 * @param fn - Transform function
 * @returns Some(fn(value)) if Some, None otherwise
 * @example
 * map(some(2), x => x * 2) // Some(4)
 * map(none, x => x * 2)    // None
 */
export function map<T, U>(opt: None, fn: (value: T) => U): None;
export function map<T, U>(opt: Option<T>, fn: (value: T) => U | NoneValueType): Option<U>;
export function map<T, U>(opt: Option<T>, fn: (value: T) => U | NoneValueType): Option<U> {
  if (isNone(opt)) return NONE;
  const result = fn(opt);
  return result === null || result === undefined ? NONE : (result as Some<ValueType<U>>);
}

/**
 * Chains Option-returning functions. Returns None if the input is None.
 * @param opt - The Option to chain
 * @param fn - Function returning an Option
 * @returns The result of fn(value) if Some, None otherwise
 * @example
 * flatMap(some(2), x => some(x * 2)) // Some(4)
 * flatMap(some(2), x => none)        // None
 * flatMap(none, x => some(x * 2))    // None
 */
export function flatMap<T, U>(opt: None, fn: (value: T) => Option<U>): None;
export function flatMap<T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U>;
export function flatMap<T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U> {
  return isNone(opt) ? NONE : fn(opt);
}

/**
 * Alias for flatMap. Chains Option-returning functions.
 * @param opt - The Option to chain
 * @param fn - Function returning an Option
 * @returns The result of fn(value) if Some, None otherwise
 */
export function andThen<T, U>(opt: None, fn: (value: T) => Option<U>): None;
export function andThen<T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U>;
export function andThen<T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U> {
  return isNone(opt) ? NONE : fn(opt);
}

/**
 * Executes a side effect if Some, then returns the original Option.
 * @param opt - The Option to tap
 * @param fn - Side effect function
 * @returns The original Option unchanged
 * @example
 * tap(some(42), x => console.log(x)) // logs 42, returns Some(42)
 */
export function tap<T>(opt: None, fn: (value: T) => void): None;
export function tap<T>(opt: Some<T>, fn: (value: T) => void): Some<T>;
export function tap<T>(opt: Option<T>, fn: (value: T) => void): Option<T>;
export function tap<T>(opt: Option<T>, fn: (value: T) => void): Option<T> {
  if (isSome(opt)) {
    fn(opt);
  }
  return opt;
}

/**
 * Returns true if None, or if Some and predicate returns true.
 * @param opt - The Option to check
 * @param predicate - Test function
 * @returns true if None or predicate(value) is true
 * @example
 * isNoneOr(none, x => x > 2)    // true
 * isNoneOr(some(4), x => x > 2) // true
 * isNoneOr(some(1), x => x > 2) // false
 */
export function isNoneOr<T>(opt: Option<T>, predicate: (value: T) => boolean): boolean {
  return isNone(opt) || predicate(opt);
}

/**
 * Returns Some if the value passes the predicate, None otherwise.
 * @param opt - The Option to filter
 * @param predicate - Test function
 * @returns Some if predicate returns true, None otherwise
 * @example
 * filter(some(4), x => x > 2) // Some(4)
 * filter(some(1), x => x > 2) // None
 */
export function filter<T>(opt: None, predicate: (value: T) => boolean): None;
export function filter<T>(opt: Option<T>, predicate: (value: T) => boolean): Option<T>;
export function filter<T>(opt: Option<T>, predicate: (value: T) => boolean): Option<T> {
  return isSome(opt) && predicate(opt) ? opt : NONE;
}

/**
 * Extracts the value from Some, throws if None.
 * @param opt - The Option to unwrap
 * @returns The contained value
 * @throws Error if opt is None
 * @example
 * unwrap(some(42)) // 42
 * unwrap(none)     // throws Error
 */
export function unwrap<T>(opt: Option<T>): T {
  if (isNone(opt)) {
    throw new Error('Called unwrap on None');
  }
  return opt;
}

/**
 * Extracts the value from Some, or returns a default value.
 * @param opt - The Option to unwrap
 * @param defaultValue - Value to return if None
 * @returns The contained value or defaultValue
 * @example
 * unwrapOr(some(42), 0) // 42
 * unwrapOr(none, 0)     // 0
 */
export function unwrapOr<T>(opt: Option<T>, defaultValue: T): T {
  return isSome(opt) ? opt : defaultValue;
}

/**
 * Extracts the value from Some, or computes a default.
 * @param opt - The Option to unwrap
 * @param fn - Function to compute default value
 * @returns The contained value or fn()
 * @example
 * unwrapOrElse(some(42), () => 0) // 42
 * unwrapOrElse(none, () => 0)     // 0
 */
export function unwrapOrElse<T>(opt: Option<T>, fn: () => T): T {
  return isSome(opt) ? opt : fn();
}

/**
 * Extracts the value from Some, throws with custom message if None.
 * @param opt - The Option to unwrap
 * @param message - Error message if None
 * @returns The contained value
 * @throws Error with message if opt is None
 * @example
 * expect(some(42), 'missing value') // 42
 * expect(none, 'missing value')     // throws Error('missing value')
 */
export function expect<T>(opt: Option<T>, message: string): T {
  if (isNone(opt)) {
    throw new Error(message);
  }
  return opt;
}

/**
 * Returns the first Some, or the second Option if the first is None.
 * @param opt - First Option
 * @param optb - Fallback Option
 * @returns opt if Some, optb otherwise
 * @example
 * or(some(1), some(2)) // Some(1)
 * or(none, some(2))    // Some(2)
 */
export function or<T>(opt: Some<T>, optb: Option<T>): Some<T>;
export function or<T>(opt: Option<T>, optb: Option<T>): Option<T>;
export function or<T>(opt: Option<T>, optb: Option<T>): Option<T> {
  return isSome(opt) ? opt : optb;
}

/**
 * Returns opt if Some, otherwise computes a fallback Option.
 * @param opt - First Option
 * @param fn - Function to compute fallback
 * @returns opt if Some, fn() otherwise
 * @example
 * orElse(some(1), () => some(2)) // Some(1)
 * orElse(none, () => some(2))    // Some(2)
 */
export function orElse<T>(opt: Some<T>, fn: () => Option<T>): Some<T>;
export function orElse<T>(opt: Option<T>, fn: () => Option<T>): Option<T>;
export function orElse<T>(opt: Option<T>, fn: () => Option<T>): Option<T> {
  return isSome(opt) ? opt : fn();
}

/**
 * Returns Some if exactly one of the Options is Some.
 * @param opt - First Option
 * @param optb - Second Option
 * @returns Some if exactly one is Some, None otherwise
 * @example
 * xor(some(1), none)    // Some(1)
 * xor(none, some(2))    // Some(2)
 * xor(some(1), some(2)) // None
 * xor(none, none)       // None
 */
export function xor<T>(opt: Option<T>, optb: Option<T>): Option<T> {
  if (isSome(opt) && isNone(optb)) return opt;
  if (isNone(opt) && isSome(optb)) return optb;
  return NONE;
}

/**
 * Returns optb if opt is Some, None otherwise.
 * @param opt - First Option
 * @param optb - Second Option
 * @returns optb if opt is Some, None otherwise
 * @example
 * and(some(1), some(2)) // Some(2)
 * and(none, some(2))    // None
 */
export function and<U>(opt: None, optb: Option<U>): None;
export function and<T, U>(opt: Option<T>, optb: Option<U>): Option<U>;
export function and<T, U>(opt: Option<T>, optb: Option<U>): Option<U> {
  return isSome(opt) ? optb : NONE;
}

/**
 * Combines two Options into an Option of a tuple.
 * @param opt - First Option
 * @param other - Second Option
 * @returns Some([a, b]) if both are Some, None otherwise
 * @example
 * zip(some(1), some('a')) // Some([1, 'a'])
 * zip(some(1), none)      // None
 */
export function zip<T, U>(opt: Option<T>, other: Option<U>): Option<[T, U]> {
  return isSome(opt) && isSome(other) ? ([opt, other] as Some<[T, U]>) : NONE;
}

/**
 * Splits an Option of a tuple into a tuple of Options.
 * @param opt - Option containing a tuple
 * @returns Tuple of Options
 * @example
 * unzip(some([1, 'a'])) // [Some(1), Some('a')]
 * unzip(none)           // [None, None]
 */
export function unzip<T, U>(opt: Option<[T, U]>): [Option<T>, Option<U>] {
  if (isNone(opt)) return [NONE, NONE];
  const [a, b] = opt;
  return [of(a), of(b)];
}

/**
 * Maps the value and returns it, or returns a default.
 * @param opt - The Option to map
 * @param defaultValue - Value if None
 * @param fn - Transform function
 * @returns fn(value) if Some, defaultValue otherwise
 * @example
 * mapOr(some(2), 0, x => x * 2) // 4
 * mapOr(none, 0, x => x * 2)    // 0
 */
export function mapOr<T, U>(opt: Option<T>, defaultValue: U, fn: (value: T) => U): U {
  return isSome(opt) ? fn(opt) : defaultValue;
}

/**
 * Maps the value and returns it, or computes a default.
 * @param opt - The Option to map
 * @param defaultFn - Function to compute default
 * @param fn - Transform function
 * @returns fn(value) if Some, defaultFn() otherwise
 * @example
 * mapOrElse(some(2), () => 0, x => x * 2) // 4
 * mapOrElse(none, () => 0, x => x * 2)    // 0
 */
export function mapOrElse<T, U>(opt: Option<T>, defaultFn: () => U, fn: (value: T) => U): U {
  return isSome(opt) ? fn(opt) : defaultFn();
}

/**
 * Flattens a nested Option.
 * @param opt - Option containing an Option
 * @returns The inner Option
 * @example
 * flatten(some(some(42))) // Some(42)
 * flatten(some(none))     // None
 * flatten(none)           // None
 */
export function flatten<T>(opt: Option<Option<T>>): Option<T> {
  return isNone(opt) ? NONE : (opt as Option<T>);
}

/**
 * Checks if the Option contains a specific value (using ===).
 * @param opt - The Option to check
 * @param value - The value to compare
 * @returns true if Some and value matches
 * @example
 * contains(some(42), 42) // true
 * contains(some(42), 0)  // false
 * contains(none, 42)     // false
 */
export function contains<T>(opt: Option<T>, value: T): boolean {
  return isSome(opt) && opt === value;
}

/**
 * Checks if Some and the value satisfies a predicate.
 * @param opt - The Option to check
 * @param predicate - Test function
 * @returns true if Some and predicate returns true
 * @example
 * isSomeAnd(some(4), x => x > 2) // true
 * isSomeAnd(some(1), x => x > 2) // false
 * isSomeAnd(none, x => x > 2)    // false
 */
export function isSomeAnd<T>(opt: Option<T>, predicate: (value: T) => boolean): boolean {
  return isSome(opt) && predicate(opt);
}

/**
 * Converts an Option to an array.
 * @param opt - The Option to convert
 * @returns [value] if Some, [] if None
 * @example
 * toArray(some(42)) // [42]
 * toArray(none)     // []
 */
export function toArray<T>(opt: Option<T>): readonly T[] {
  return isSome(opt) ? [opt] : EMPTY as readonly T[];
}

/**
 * Converts an Option to a nullable value.
 * @param opt - The Option to convert
 * @returns The value if Some, null if None
 * @example
 * toNullable(some(42)) // 42
 * toNullable(none)     // null
 */
export function toNullable<T>(opt: Option<T>): T | null {
  return isSome(opt) ? opt : null;
}

/**
 * Converts an Option to an undefined-able value.
 * @param opt - The Option to convert
 * @returns The value if Some, undefined if None
 * @example
 * toUndefined(some(42)) // 42
 * toUndefined(none)     // undefined
 */
export function toUndefined<T>(opt: Option<T>): T | undefined {
  return isSome(opt) ? opt : undefined;
}

/**
 * Pattern matches on an Option, handling both Some and None cases.
 * @param opt - The Option to match
 * @param onSome - Handler for Some case
 * @param onNone - Handler for None case
 * @returns Result of the matching handler
 * @example
 * match(some(42), x => x * 2, () => 0) // 84
 * match(none, x => x * 2, () => 0)     // 0
 */
export function match<T, U>(opt: Option<T>, onSome: (value: T) => U, onNone: () => U): U {
  return isSome(opt) ? onSome(opt) : onNone();
}

/**
 * Converts an Option to a Result, using a provided error if None.
 * @param opt - The Option to convert
 * @param error - Error value if None
 * @returns Ok(value) if Some, Err(error) if None
 * @example
 * okOr(some(42), 'missing') // Ok(42)
 * okOr(none, 'missing')     // Err('missing')
 */
export function okOr<T, E>(opt: Option<T>, error: E): Result<T, E> {
  return isSome(opt) ? (opt as unknown as Ok<T>) : err(error);
}

/**
 * Converts an Option to a Result, computing the error if None.
 * @param opt - The Option to convert
 * @param fn - Function to compute error
 * @returns Ok(value) if Some, Err(fn()) if None
 * @example
 * okOrElse(some(42), () => 'missing') // Ok(42)
 * okOrElse(none, () => 'missing')     // Err('missing')
 */
export function okOrElse<T, E>(opt: Option<T>, fn: () => E): Result<T, E> {
  return isSome(opt) ? (opt as unknown as Ok<T>) : err(fn());
}

/**
 * Extracts the Ok value from a Result as an Option.
 * @param result - The Result to convert
 * @returns Some(value) if Ok, None if Err
 * @example
 * ofOk(ok(42))        // Some(42)
 * ofOk(err('failed')) // None
 */
export function ofOk<T, E>(result: Result<T, E>): Option<T> {
  if (!isOk(result) || !isSome(result)) {
    return NONE;
  }
  return result as Some<T>;
}

/**
 * Extracts the Err value from a Result as an Option.
 * @param result - The Result to convert
 * @returns Some(error) if Err, None if Ok
 * @example
 * ofErr(err('failed')) // Some('failed')
 * ofErr(ok(42))        // None
 */
export function ofErr<T, E>(result: Result<T, E>): Option<E> {
  if (!isErr(result)) {
    return NONE;
  }
  const error = (result as { error: E }).error;
  if (!isSome(error)) {
    return NONE;
  }
  return error as Some<E>;
}
