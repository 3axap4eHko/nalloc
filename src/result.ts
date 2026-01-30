import { err as ERR, isOk, isErr, isSome, isNone, NONE, optionOf, isThenable } from './types.js';
import type { Ok, Err, Result, Option, Widen, WidenNever, MaybePromise } from './types.js';

export type { Ok, Err, Result };
export { isOk, isErr };

/**
 * Executes a function and captures the result or error.
 * @param fn - Function to execute
 * @param onError - Optional error transformer
 * @returns Ok(result) if successful, Err(error) if thrown
 * @example
 * tryCatch(() => JSON.parse('{"a":1}'))     // Ok({a: 1})
 * tryCatch(() => JSON.parse('invalid'))     // Err(SyntaxError)
 * tryCatch(() => { throw 'oops' }, e => e)  // Err('oops')
 */
export function tryCatch<T, E = unknown>(fn: () => T, onError?: (error: unknown) => E): Result<T, E> {
  try {
    return fn() as Ok<T>;
  } catch (error) {
    return ERR(onError ? onError(error) : (error as E));
  }
}

/**
 * Alias for tryCatch. Executes a function and captures the result or error.
 * @param fn - Function to execute
 * @returns Ok(result) if successful, Err(error) if thrown
 */
export function of<T, E = unknown>(fn: () => T): Result<T, E> {
  return tryCatch(fn);
}

/**
 * Executes an async function and captures the result or error.
 * @param fn - Async function to execute
 * @param onError - Optional error transformer
 * @returns Promise of Ok(result) if successful, Err(error) if rejected
 * @example
 * await tryAsync(() => fetch('/api').then(r => r.json())) // Ok(data) or Err(error)
 */
export async function tryAsync<T, E = unknown>(fn: () => Promise<T>, onError?: (error: unknown) => E): Promise<Result<T, E>> {
  try {
    return (await fn()) as Ok<T>;
  } catch (error) {
    return ERR(onError ? onError(error) : (error as E));
  }
}

/**
 * Alias for tryAsync. Executes an async function and captures the result or error.
 * @param fn - Async function to execute
 * @returns Promise of Ok(result) if successful, Err(error) if rejected
 */
export function ofAsync<T, E = unknown>(fn: () => Promise<T>): Promise<Result<T, E>> {
  return tryAsync(fn);
}

/**
 * Executes a function that may return sync or async, preserving sync execution when possible.
 * @param fn - Function that may return T or Promise<T>
 * @param onError - Optional error transformer
 * @returns Result<T, E> if sync, Promise<Result<T, E>> if async
 * @example
 * tryCatchMaybePromise(() => 42)                    // Ok(42) - sync
 * tryCatchMaybePromise(() => Promise.resolve(42))   // Promise<Ok(42)> - async
 * tryCatchMaybePromise(() => { throw 'err' })       // Err('err') - sync
 */
export function tryCatchMaybePromise<T, E = unknown>(
  fn: () => MaybePromise<T>,
  onError?: (error: unknown) => E
): Result<T, E> | Promise<Result<T, E>> {
  try {
    const result = fn();
    if (isThenable(result)) {
      return Promise.resolve(result).then(
        value => value as Ok<T>,
        error => ERR(onError ? onError(error) : (error as E))
      );
    }
    return result as Ok<T>;
  } catch (error) {
    return ERR(onError ? onError(error) : (error as E));
  }
}

/**
 * Converts a Promise to a Result.
 * @param promise - The promise to convert
 * @param onRejected - Optional rejection handler
 * @returns Promise of Ok(value) if resolved, Err(error) if rejected
 * @example
 * await fromPromise(Promise.resolve(42))        // Ok(42)
 * await fromPromise(Promise.reject('error'))    // Err('error')
 */
export async function fromPromise<T, E = unknown>(promise: Promise<T>, onRejected?: (reason: unknown) => E): Promise<Result<T, E>> {
  try {
    return (await promise) as Ok<T>;
  } catch (error) {
    return ERR(onRejected ? onRejected(error) : (error as E));
  }
}

/**
 * Unwraps an Ok value or returns a computed value for Err.
 * @param result - The Result to unwrap
 * @param onErr - Function called with error if Err
 * @returns The Ok value or result of onErr(error)
 * @example
 * unwrapOrReturn(ok(42), e => 0)          // 42
 * unwrapOrReturn(err('fail'), e => 0)     // 0
 */
export function unwrapOrReturn<T, E, const R>(result: Result<T, E>, onErr: (error: E) => R): T | R {
  return isOk(result) ? result : onErr(result.error);
}

/**
 * Asserts that a Result is Ok, throwing if Err.
 * @param result - The Result to assert
 * @param message - Custom error message
 * @throws Error if result is Err
 * @example
 * assertOk(ok(42))        // passes
 * assertOk(err('failed')) // throws Error
 */
export function assertOk<T, E>(result: Result<T, E>, message?: string): asserts result is Ok<T> {
  if (isErr(result)) {
    throw new Error(message ?? `Expected Ok result. Received error: ${String((result as Err<E>).error)}`);
  }
}

/**
 * Asserts that a Result is Err, throwing if Ok.
 * @param result - The Result to assert
 * @param message - Custom error message
 * @throws Error if result is Ok
 * @example
 * assertErr(err('failed')) // passes
 * assertErr(ok(42))        // throws Error
 */
export function assertErr<T, E>(result: Result<T, E>, message?: string): asserts result is Err<E> {
  if (isOk(result)) {
    throw new Error(message ?? 'Expected Err result.');
  }
}

/**
 * Checks if result is Err with a non-null error value.
 * @param result - The Result to check
 * @returns true if Err with Some error value
 */
export function isSomeErr<T, E>(result: Result<T, E>): boolean {
  return isErr(result) && isSome((result as Err<E>).error);
}

/**
 * Transforms the Ok value, leaving Err unchanged.
 * @param result - The Result to map
 * @param fn - Transform function
 * @returns Ok(fn(value)) if Ok, Err unchanged
 * @example
 * map(ok(2), x => x * 2)   // Ok(4)
 * map(err('e'), x => x * 2) // Err('e')
 */
export function map<T, U, E>(result: Err<E>, fn: (value: T) => U): Err<E>;
export function map<T, U>(result: Ok<T>, fn: (value: T) => U): Ok<U>;
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isErr(result)) return result as Err<E>;
  return fn(result as Ok<T>) as Ok<U>;
}

/**
 * Transforms the Err value, leaving Ok unchanged.
 * @param result - The Result to map
 * @param fn - Error transform function
 * @returns Err(fn(error)) if Err, Ok unchanged
 * @example
 * mapErr(err('e'), e => e.toUpperCase()) // Err('E')
 * mapErr(ok(42), e => e.toUpperCase())   // Ok(42)
 */
export function mapErr<T, E, F>(result: Ok<T>, fn: (error: E) => F): Ok<T>;
export function mapErr<E, F>(result: Err<E>, fn: (error: E) => F): Err<F>;
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isOk(result)) return result;
  return ERR(fn(result.error));
}

/**
 * Chains Result-returning functions. Returns Err if the input is Err.
 * @param result - The Result to chain
 * @param fn - Function returning a Result
 * @returns The result of fn(value) if Ok, Err unchanged
 * @example
 * flatMap(ok(2), x => ok(x * 2))    // Ok(4)
 * flatMap(ok(2), x => err('fail'))  // Err('fail')
 * flatMap(err('e'), x => ok(x * 2)) // Err('e')
 */
export function flatMap<T, U, E>(result: Err<E>, fn: (value: T) => Result<U, E>): Err<E>;
export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>;
export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  if (isErr(result)) return result as Err<E>;
  return fn(result as Ok<T>);
}

/**
 * Alias for flatMap. Chains Result-returning functions.
 * @param result - The Result to chain
 * @param fn - Function returning a Result
 * @returns The result of fn(value) if Ok, Err unchanged
 */
export function andThen<T, U, E>(result: Err<E>, fn: (value: T) => Result<U, E>): Err<E>;
export function andThen<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>;
export function andThen<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  return isErr(result) ? result : fn(result);
}

/**
 * Executes a side effect if Ok, then returns the original Result.
 * @param result - The Result to tap
 * @param fn - Side effect function
 * @returns The original Result unchanged
 * @example
 * tap(ok(42), x => console.log(x)) // logs 42, returns Ok(42)
 */
export function tap<T, E>(result: Err<E>, fn: (value: T) => void): Err<E>;
export function tap<T>(result: Ok<T>, fn: (value: T) => void): Ok<T>;
export function tap<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E>;
export function tap<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E> {
  if (isOk(result)) {
    fn(result);
  }
  return result;
}

/**
 * Executes a side effect if Err, then returns the original Result.
 * @param result - The Result to tap
 * @param fn - Side effect function for error
 * @returns The original Result unchanged
 * @example
 * tapErr(err('fail'), e => console.log(e)) // logs 'fail', returns Err('fail')
 */
export function tapErr<T, E>(result: Ok<T>, fn: (error: E) => void): Ok<T>;
export function tapErr<E>(result: Err<E>, fn: (error: E) => void): Err<E>;
export function tapErr<T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E>;
export function tapErr<T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E> {
  if (isErr(result)) {
    fn((result as Err<E>).error);
  }
  return result;
}

/**
 * Maps both Ok and Err values simultaneously.
 * @param result - The Result to map
 * @param okFn - Transform for Ok value
 * @param errFn - Transform for Err value
 * @returns Ok(okFn(value)) if Ok, Err(errFn(error)) if Err
 * @example
 * bimap(ok(2), x => x * 2, e => e.toUpperCase())   // Ok(4)
 * bimap(err('e'), x => x * 2, e => e.toUpperCase()) // Err('E')
 */
export function bimap<T, U, E, F>(result: Ok<T>, okFn: (value: T) => U, errFn: (error: E) => F): Ok<U>;
export function bimap<T, U, E, F>(result: Err<E>, okFn: (value: T) => U, errFn: (error: E) => F): Err<F>;
export function bimap<T, U, E, F>(result: Result<T, E>, okFn: (value: T) => U, errFn: (error: E) => F): Result<U, F>;
export function bimap<T, U, E, F>(result: Result<T, E>, okFn: (value: T) => U, errFn: (error: E) => F): Result<U, F> {
  return isOk(result) ? (okFn(result) as Ok<U>) : ERR(errFn(result.error));
}

/**
 * Extracts the Ok value, throws Err if not Ok.
 * Use with safeTry for Rust-like ? operator ergonomics.
 * @param result - The Result to unwrap
 * @returns The contained Ok value
 * @throws The Err object itself
 * @example
 * unwrap(ok(42))        // 42
 * unwrap(err('failed')) // throws Err
 * safeTry(() => {
 *   const a = unwrap(getValue());
 *   return a + 1;
 * });
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isErr(result)) throw result;
  return result;
}

/**
 * Extracts the Err value, throws if Ok.
 * @param result - The Result to unwrap
 * @returns The contained error
 * @throws Error if result is Ok
 * @example
 * unwrapErr(err('failed')) // 'failed'
 * unwrapErr(ok(42))        // throws Error
 */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (isOk(result)) {
    throw new Error(`Called unwrapErr on Ok: ${String(result)}`);
  }
  return result.error;
}

/**
 * Extracts the Ok value, or returns a default.
 * @param result - The Result to unwrap
 * @param defaultValue - Value if Err
 * @returns The Ok value or defaultValue
 * @example
 * unwrapOr(ok(42), 0)        // 42
 * unwrapOr(err('failed'), 0) // 0
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result : defaultValue;
}

/**
 * Extracts the Ok value, or computes a default from the error.
 * @param result - The Result to unwrap
 * @param fn - Function to compute default from error
 * @returns The Ok value or fn(error)
 * @example
 * unwrapOrElse(ok(42), e => 0)        // 42
 * unwrapOrElse(err('failed'), e => 0) // 0
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  return isOk(result) ? result : fn(result.error);
}

/**
 * Maps the Ok value and returns it, or returns a default.
 * @param result - The Result to map
 * @param defaultValue - Value if Err
 * @param fn - Transform function
 * @returns fn(value) if Ok, defaultValue otherwise
 * @example
 * mapOr(ok(2), 0, x => x * 2)   // 4
 * mapOr(err('e'), 0, x => x * 2) // 0
 */
export function mapOr<T, E, U>(result: Result<T, E>, defaultValue: U, fn: (value: T) => U): U {
  return isOk(result) ? fn(result) : defaultValue;
}

/**
 * Maps the Ok value and returns it, or computes a default.
 * @param result - The Result to map
 * @param defaultFn - Function to compute default
 * @param fn - Transform function
 * @returns fn(value) if Ok, defaultFn() otherwise
 * @example
 * mapOrElse(ok(2), () => 0, x => x * 2)   // 4
 * mapOrElse(err('e'), () => 0, x => x * 2) // 0
 */
export function mapOrElse<T, E, U>(result: Result<T, E>, defaultFn: () => U, fn: (value: T) => U): U {
  return isOk(result) ? fn(result) : defaultFn();
}

/**
 * Extracts the Ok value, throws with custom message if Err.
 * @param result - The Result to unwrap
 * @param message - Error message prefix if Err
 * @returns The Ok value
 * @throws Error with message if Err
 * @example
 * expect(ok(42), 'missing value')        // 42
 * expect(err('fail'), 'missing value')   // throws Error('missing value: fail')
 */
export function expect<T, E>(result: Result<T, E>, message: string): T {
  if (isErr(result)) {
    throw new Error(`${message}: ${String((result as Err<E>).error)}`);
  }
  return result as Ok<T>;
}

/**
 * Extracts the Err value, throws with custom message if Ok.
 * @param result - The Result to unwrap
 * @param message - Error message prefix if Ok
 * @returns The error value
 * @throws Error with message if Ok
 * @example
 * expectErr(err('fail'), 'expected error')  // 'fail'
 * expectErr(ok(42), 'expected error')       // throws Error
 */
export function expectErr<T, E>(result: Result<T, E>, message: string): E {
  if (isOk(result)) {
    throw new Error(`${message}: ${String(result)}`);
  }
  return result.error;
}

/**
 * Returns other if result is Ok, otherwise returns the Err.
 * @param result - First Result
 * @param other - Second Result
 * @returns other if result is Ok, result (Err) otherwise
 * @example
 * and(ok(1), ok(2))   // Ok(2)
 * and(err('e'), ok(2)) // Err('e')
 */
export function and<T, U, E>(result: Result<T, E>, other: Result<U, E>): Result<U, E> {
  return isOk(result) ? other : result;
}

/**
 * Returns result if Ok, otherwise returns other.
 * @param result - First Result
 * @param other - Fallback Result
 * @returns result if Ok, other otherwise
 * @example
 * or(ok(1), ok(2))    // Ok(1)
 * or(err('e'), ok(2)) // Ok(2)
 */
export function or<T, E, F>(result: Result<T, E>, other: Result<T, F>): Result<T, F> {
  return isOk(result) ? result : other;
}

/**
 * Returns result if Ok, otherwise computes a fallback from the error.
 * @param result - First Result
 * @param fn - Function to compute fallback
 * @returns result if Ok, fn(error) otherwise
 * @example
 * orElse(ok(1), e => ok(0))    // Ok(1)
 * orElse(err('e'), e => ok(0)) // Ok(0)
 */
export function orElse<T, E, F>(result: Result<T, E>, fn: (error: E) => Result<T, F>): Result<T, F> {
  return isOk(result) ? result : fn(result.error);
}

/**
 * Converts a Result to an Option, discarding the error.
 * @param result - The Result to convert
 * @returns Some(value) if Ok, None if Err
 * @example
 * toOption(ok(42))        // Some(42)
 * toOption(err('failed')) // None
 */
export function toOption<T, E>(result: Result<T, E>): Option<T> {
  return isOk(result) ? optionOf(result) : NONE;
}

/**
 * Converts a Result's error to an Option.
 * @param result - The Result to convert
 * @returns Some(error) if Err, None if Ok
 * @example
 * toErrorOption(err('failed')) // Some('failed')
 * toErrorOption(ok(42))        // None
 */
export function toErrorOption<T, E>(result: Result<T, E>): Option<E> {
  return isErr(result) ? optionOf((result as Err<E>).error) : NONE;
}

/**
 * Combines two Results into a Result of a tuple.
 * @param left - First Result
 * @param right - Second Result
 * @returns Ok([a, b]) if both Ok, first Err otherwise
 * @example
 * zip(ok(1), ok('a')) // Ok([1, 'a'])
 * zip(ok(1), err('e')) // Err('e')
 */
export function zip<T, U, E>(left: Result<T, E>, right: Result<U, E>): Result<[T, U], E> {
  if (isErr(left)) return left as Err<E>;
  if (isErr(right)) return right as Err<E>;
  return [left as Ok<T>, right as Ok<U>] as Ok<[T, U]>;
}

/**
 * Combines two Results using a function.
 * @param left - First Result
 * @param right - Second Result
 * @param fn - Combining function
 * @returns Ok(fn(a, b)) if both Ok, first Err otherwise
 * @example
 * zipWith(ok(2), ok(3), (a, b) => a + b) // Ok(5)
 */
export function zipWith<T, U, V, E>(left: Result<T, E>, right: Result<U, E>, fn: (left: T, right: U) => V): Result<V, E> {
  if (isErr(left)) return left as Err<E>;
  if (isErr(right)) return right as Err<E>;
  return fn(left as Ok<T>, right as Ok<U>) as Ok<V>;
}

/**
 * Flattens a nested Result.
 * @param result - Result containing a Result
 * @returns The inner Result
 * @example
 * flatten(ok(ok(42)))    // Ok(42)
 * flatten(ok(err('e')))  // Err('e')
 * flatten(err('outer'))  // Err('outer')
 */
export function flatten<T, E>(result: Result<Result<T, E>, E>): Result<T, E> {
  return isErr(result) ? (result as Err<E>) : (result as Result<T, E>);
}

/**
 * Pattern matches on a Result, handling both Ok and Err cases.
 * @param result - The Result to match
 * @param onOk - Handler for Ok case
 * @param onErr - Handler for Err case
 * @returns Result of the matching handler
 * @example
 * match(ok(42), x => x * 2, e => 0)   // 84
 * match(err('e'), x => x * 2, e => 0) // 0
 */
export function match<T, E, U>(result: Result<T, E>, onOk: (value: T) => U, onErr: (error: E) => U): U {
  return isOk(result) ? onOk(result) : onErr(result.error);
}

/**
 * Separates an array of Results into Ok values and Err values.
 * @param results - Array of Results
 * @returns Tuple of [Ok values, Err values]
 * @example
 * partition([ok(1), err('a'), ok(2)]) // [[1, 2], ['a']]
 */
export function partition<T, E>(results: Result<T, E>[]): [T[], E[]] {
  const oks: T[] = [];
  const errs: E[] = [];

  for (const result of results) {
    if (isOk(result)) {
      oks.push(result);
    } else {
      errs.push(result.error);
    }
  }

  return [oks, errs];
}

/**
 * Extracts all Ok values from an iterable of Results.
 * @param results - Iterable of Results
 * @returns Array of Ok values
 * @example
 * filterOk([ok(1), err('a'), ok(2)]) // [1, 2]
 */
export function filterOk<T, E>(results: Iterable<Result<T, E>>): T[] {
  const oks: T[] = [];
  for (const result of results) {
    if (isOk(result)) oks.push(result);
  }
  return oks;
}

/**
 * Extracts all Err values from an iterable of Results.
 * @param results - Iterable of Results
 * @returns Array of error values
 * @example
 * filterErr([ok(1), err('a'), ok(2)]) // ['a']
 */
export function filterErr<T, E>(results: Iterable<Result<T, E>>): E[] {
  const errs: E[] = [];
  for (const result of results) {
    if (isErr(result)) errs.push(result.error);
  }
  return errs;
}

/**
 * Collects an array of Results into a Result of an array. Fails on first Err.
 * @param results - Array of Results
 * @returns Ok(values) if all Ok, first Err otherwise
 * @example
 * collect([ok(1), ok(2)])       // Ok([1, 2])
 * collect([ok(1), err('e')])    // Err('e')
 */
export function collect<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (isErr(result)) return result;
    values.push(result);
  }

  return values as Ok<T[]>;
}

/**
 * Collects all Results, returning all errors if any exist.
 * @param results - Array of Results
 * @returns Ok(values) if all Ok, Err(allErrors) otherwise
 * @example
 * collectAll([ok(1), ok(2)])           // Ok([1, 2])
 * collectAll([ok(1), err('a'), err('b')]) // Err(['a', 'b'])
 */
export function collectAll<T, E>(results: Result<T, E>[]): Result<T[], E[]> {
  const [oks, errs] = partition(results);
  return errs.length > 0 ? ERR(errs) : (oks as Ok<T[]>);
}

/**
 * Alias for collect with widened types. Collects Results into a Result of array.
 * @param results - Array of Results
 * @returns Ok(values) if all Ok, first Err otherwise
 */
export function all<T, E>(results: Result<T, E>[]): Result<readonly Widen<T>[], WidenNever<E>> {
  return collect(results) as Result<readonly Widen<T>[], WidenNever<E>>;
}

/**
 * Returns the first Ok, or all errors if none succeed.
 * @param results - Array of Results
 * @returns First Ok found, or Err(allErrors) if all fail
 * @example
 * any([err('a'), ok(1), err('b')]) // Ok(1)
 * any([err('a'), err('b')])        // Err(['a', 'b'])
 */
export function any<T, E>(results: Result<T, E>[]): Result<Widen<T>, WidenNever<E>[]> {
  const errors: WidenNever<E>[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (isOk(result)) return result as Ok<Widen<T>>;
    errors.push((result as Err<WidenNever<E>>).error);
  }
  return ERR(errors);
}

/**
 * Transposes a Result of Option to an Option of Result.
 * @param result - Result containing an Option
 * @returns Some(Ok(value)) if Ok(Some), None if Ok(None), Some(Err) if Err
 * @example
 * transpose(ok(some(42)))  // Some(Ok(42))
 * transpose(ok(none))      // None
 * transpose(err('e'))      // Some(Err('e'))
 */
export function transpose<T, E>(result: Result<Option<T>, E>): Option<Result<T, E>> {
  if (isErr(result)) {
    return ERR((result as Err<E>).error) as Option<Result<T, E>>;
  }
  const opt = result as Option<T>;
  return isNone(opt) ? NONE : (opt as unknown as Ok<T> as Option<Result<T, E>>);
}

/**
 * Checks if Ok and the value satisfies a predicate.
 * @param result - The Result to check
 * @param predicate - Test function
 * @returns true if Ok and predicate returns true
 * @example
 * isOkAnd(ok(4), x => x > 2)   // true
 * isOkAnd(ok(1), x => x > 2)   // false
 * isOkAnd(err('e'), x => x > 2) // false
 */
export function isOkAnd<T, E>(result: Result<T, E>, predicate: (value: T) => boolean): boolean {
  return isOk(result) && predicate(result);
}

/**
 * Checks if Err and the error satisfies a predicate.
 * @param result - The Result to check
 * @param predicate - Test function
 * @returns true if Err and predicate returns true
 * @example
 * isErrAnd(err('fatal'), e => e.includes('fatal')) // true
 * isErrAnd(ok(42), e => true)                       // false
 */
export function isErrAnd<T, E>(result: Result<T, E>, predicate: (error: E) => boolean): boolean {
  return isErr(result) && predicate((result as Err<E>).error);
}

/**
 * Maps an async function over an Ok value.
 * @param result - The Result to map
 * @param fn - Async transform function
 * @param onRejected - Optional rejection handler
 * @returns Promise of mapped Result
 * @example
 * await mapAsync(ok(2), async x => x * 2) // Ok(4)
 */
export async function mapAsync<T, U, E = unknown>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>,
  onRejected?: (error: unknown) => E,
): Promise<Result<U, E>> {
  if (isErr(result)) return result as Err<E>;
  return fromPromise(fn(result as Ok<T>), onRejected);
}

/**
 * Chains an async Result-returning function.
 * @param result - The Result to chain
 * @param fn - Async function returning a Result
 * @returns Promise of the chained Result
 * @example
 * await andThenAsync(ok(2), async x => ok(x * 2)) // Ok(4)
 */
export async function andThenAsync<T, U, E>(result: Result<T, E>, fn: (value: T) => Promise<Result<U, E>>): Promise<Result<U, E>> {
  if (isErr(result)) return result as Err<E>;
  return fn(result as Ok<T>);
}

/**
 * Pattern matches with async handlers.
 * @param result - The Result to match
 * @param onOk - Async handler for Ok
 * @param onErr - Async handler for Err
 * @returns Promise of the handler result
 */
export async function matchAsync<T, E, U>(result: Result<T, E>, onOk: (value: T) => Promise<U>, onErr: (error: E) => Promise<U>): Promise<U> {
  return isOk(result) ? onOk(result) : onErr(result.error);
}

export function settledToResult<T, E>(result: PromiseSettledResult<Result<T, E>>): Result<T, E> {
  if (result.status === 'fulfilled') return result.value;
  return ERR(result.reason);
}

/**
 * Partitions an async iterable of Results.
 * @param results - Iterable of Promise Results
 * @returns Promise of [Ok values, Err values]
 * @example
 * await partitionAsync([Promise.resolve(ok(1)), Promise.resolve(err('a'))])
 * // [[1], ['a']]
 */
export async function partitionAsync<T, E>(promises: Iterable<Promise<Result<T, E>>>): Promise<[Widen<T>[], WidenNever<E>[]]> {
  const settled = await Promise.allSettled(promises);
  return partition(settled.map(settledToResult)) as [Widen<T>[], WidenNever<E>[]];
}

/**
 * Settles an array of MaybePromise values into Results.
 * Returns synchronously if all inputs are sync, avoiding Promise overhead.
 * @param values - Array of values that may or may not be Promises
 * @returns Array of Results (sync) or Promise of Results (if any async)
 * @example
 * settleMaybePromise([1, 2, 3])                    // [Ok(1), Ok(2), Ok(3)] - sync
 * settleMaybePromise([1, Promise.resolve(2)])     // Promise<[Ok(1), Ok(2)]>
 * settleMaybePromise([Promise.reject('e')])       // Promise<[Err('e')]>
 */
export function settleMaybePromise<T, E = unknown>(
  values: MaybePromise<T>[]
): Result<T, E>[] | Promise<Result<T, E>[]> {
  const len = values.length;
  const results: Result<T, E>[] = new Array(len);
  let pendingIndices: number[] | undefined;
  let pendingPromises: Promise<T>[] | undefined;

  for (let i = 0; i < len; i++) {
    const v = values[i];
    if (isThenable(v)) {
      (pendingIndices ??= []).push(i);
      (pendingPromises ??= []).push(Promise.resolve(v));
    } else {
      results[i] = v as Ok<T>;
    }
  }

  if (!pendingPromises) return results;

  return Promise.allSettled(pendingPromises).then(settled => {
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i];
      results[pendingIndices![i]] = s.status === 'fulfilled'
        ? s.value as Ok<T>
        : ERR(s.reason as E);
    }
    return results;
  });
}

/**
 * Partitions MaybePromise Results into Ok and Err values.
 * Returns synchronously if all inputs are sync, avoiding Promise overhead.
 * @param values - Array of MaybePromise Results
 * @returns [Ok values, Err values] (sync) or Promise of same (if any async)
 * @example
 * partitionMaybePromise([ok(1), err('a')])                   // [[1], ['a']] - sync
 * partitionMaybePromise([ok(1), Promise.resolve(err('a'))]) // Promise<[[1], ['a']]>
 */
export function partitionMaybePromise<T, E>(
  values: MaybePromise<Result<T, E>>[]
): [Widen<T>[], WidenNever<E>[]] | Promise<[Widen<T>[], WidenNever<E>[]]> {
  const len = values.length;
  let hasAsync = false;

  for (let i = 0; i < len; i++) {
    if (isThenable(values[i])) {
      hasAsync = true;
      break;
    }
  }

  if (!hasAsync) {
    return partition(values as Result<T, E>[]) as [Widen<T>[], WidenNever<E>[]];
  }

  return Promise.allSettled(values.map(v => Promise.resolve(v))).then(settled =>
    partition(settled.map(settledToResult)) as [Widen<T>[], WidenNever<E>[]]
  );
}

/**
 * Executes a function, catching thrown Err values.
 * Use with unwrap for Rust-like ? operator ergonomics.
 * @param fn - Function that may throw Err via unwrap
 * @returns Ok(return value) or the caught Err
 * @example
 * const result = safeTry(() => {
 *   const a = unwrap(parseNumber('10'));
 *   const b = unwrap(parseNumber('5'));
 *   return a + b;
 * }); // Ok(15) or Err(...)
 */
export function safeTry<T>(fn: () => T): Result<T, unknown> {
  try {
    return fn() as Ok<T>;
  } catch (e) {
    if (isErr(e)) return e;
    return ERR(e);
  }
}

/**
 * Async version of safeTry.
 * @param fn - Async function that may throw Err via unwrap
 * @returns Promise of Ok(return value) or the caught Err
 * @example
 * const result = await safeTryAsync(async () => {
 *   const user = unwrap(await fetchUser(id));
 *   const posts = unwrap(await fetchPosts(user.id));
 *   return { user, posts };
 * });
 */
export async function safeTryAsync<T>(fn: () => Promise<T>): Promise<Result<T, unknown>> {
  try {
    return await fn() as Ok<T>;
  } catch (e) {
    if (isErr(e)) return e;
    return ERR(e);
  }
}

