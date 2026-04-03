import { isSome, isErr, err as ERR } from './types.js';
import type { Option, Result, Ok } from './types.js';

const ITER_DONE: IteratorResult<never> = Object.freeze({ value: undefined as never, done: true as const });

/**
 * Yields mapped values while the mapping function returns Some, stops at the first None.
 * @param source - The iterable to map over
 * @param fn - Mapping function returning Some(value) to continue or None to stop
 * @returns Generator of mapped values
 * @example
 * [...mapWhile([1, 2, 3, 4], n => n < 3 ? some(n * 10) : none)] // [10, 20]
 */
export function* mapWhile<T, U>(source: Iterable<T>, fn: (value: T) => Option<U>): Generator<U> {
  for (const item of source) {
    const mapped = fn(item);
    if (!isSome(mapped)) return;
    yield mapped as U;
  }
}

/**
 * Wraps an iterable so that each yielded value becomes Ok and any throw becomes a single Err.
 * Stops after the first error - the source's internal state is unknown after an exception.
 *
 * Uses a manual iterator instead of a generator to avoid coroutine suspend/resume overhead.
 *
 * Follows the for-of IteratorClose spec:
 * - iter.return() is never called on natural exhaustion or after a caught error
 * - iter.return() is only called on early consumer exit (break/return)
 * - Cleanup errors from iter.return() are suppressed
 *
 * @param source - The iterable to wrap
 * @returns Iterable iterator of Result values
 * @example
 * [...safeIter([1, 2, 3])]       // [Ok(1), Ok(2), Ok(3)]
 * [...safeIter(throwingIter())]   // [Ok(1), Err(error)]
 */
export function safeIter<T>(source: Iterable<T>): IterableIterator<Result<T, unknown>> {
  const iter = source[Symbol.iterator]();
  let done = false;
  return {
    [Symbol.iterator]() {
      return this;
    },
    next(): IteratorResult<Result<T, unknown>> {
      if (done) return ITER_DONE;
      try {
        const next = iter.next();
        if (next.done) {
          done = true;
          return next;
        }
        return { value: next.value as Ok<T>, done: false };
      } catch (e) {
        done = true;
        return { value: ERR(e), done: false };
      }
    },
    return(): IteratorResult<Result<T, unknown>> {
      if (!done) {
        done = true;
        try {
          iter.return?.();
        } catch {
          // suppressed
        }
      }
      return ITER_DONE;
    },
  };
}

// -- Result-oriented terminal operations --

/**
 * Collects an iterable of Results into a single Result containing an array.
 * Short-circuits on the first Err.
 * @param source - Iterable of Result values
 * @returns Ok(values[]) if all Ok, or the first Err encountered
 * @example
 * tryCollect([ok(1), ok(2), ok(3)])   // Ok([1, 2, 3])
 * tryCollect([ok(1), err('x')])       // Err('x')
 */
export function tryCollect<T, E>(source: Iterable<Result<T, E>>): Result<T[], E> {
  const collected: T[] = [];
  for (const result of source) {
    if (isErr(result)) return result;
    collected.push(result as T);
  }
  return collected as Ok<T[]>;
}

/**
 * Folds an iterable with a fallible accumulator function.
 * Short-circuits on the first Err returned by fn.
 * @param source - The iterable to fold over
 * @param init - Initial accumulator value
 * @param fn - Folding function returning Ok(newAcc) or Err
 * @returns Ok(finalAcc) if all steps succeed, or the first Err
 * @example
 * tryFold([1, 2, 3], 0, (acc, n) => ok(acc + n))   // Ok(6)
 * tryFold([1, 2, 3], 0, (acc, n) => n === 2 ? err('stop') : ok(acc + n))  // Err('stop')
 */
export function tryFold<T, Acc, E>(source: Iterable<T>, init: Acc, fn: (acc: Acc, item: T) => Result<Acc, E>): Result<Acc, E> {
  let acc = init;
  for (const item of source) {
    const result = fn(acc, item);
    if (isErr(result)) return result;
    acc = result as Acc;
  }
  return acc as Ok<Acc>;
}

/**
 * Iterates over a source, calling a fallible function for each item.
 * Short-circuits on the first Err returned by fn.
 * @param source - The iterable to iterate over
 * @param fn - Function to call for each item, returning Ok(void) or Err
 * @returns Ok(void) if all calls succeed, or the first Err
 * @example
 * tryForEach([1, 2, 3], n => ok(console.log(n)))  // Ok(void), logs 1, 2, 3
 * tryForEach([1, 2, 3], n => n === 2 ? err('stop') : ok(undefined))  // Err('stop')
 */
export function tryForEach<T, E>(source: Iterable<T>, fn: (item: T) => Result<void, E>): Result<void, E> {
  for (const item of source) {
    const result = fn(item);
    if (isErr(result)) return result;
  }
  return undefined as Ok<void>;
}
