import { isOk, isErr, isSome, isNone, Result, Err, Option } from './types.js';
import { formatOption, formatResult } from './devtools.js';

/** Result shape returned by custom matchers. */
type MatcherResult = { pass: boolean; message(): string };

/**
 * Asserts that a Result is Ok and returns the value.
 * Throws if the Result is Err.
 * @param result - The Result to check
 * @param message - Optional custom error message
 * @returns The Ok value
 * @throws {Error} If the Result is Err
 * @example
 * expectOk(ok(42))        // returns 42
 * expectOk(err('fail'))   // throws Error
 */
export function expectOk<T, E>(result: Result<T, E>, message?: string): T {
  if (isOk(result)) {
    return result;
  }

  const fallback = message ?? `Expected Ok(...) but received ${formatResult(result)}`;
  throw new Error(fallback);
}

/**
 * Asserts that a Result is Err and returns the error.
 * Throws if the Result is Ok.
 * @param result - The Result to check
 * @param message - Optional custom error message
 * @returns The error value
 * @throws {Error} If the Result is Ok
 * @example
 * expectErr(err('fail'))  // returns 'fail'
 * expectErr(ok(42))       // throws Error
 */
export function expectErr<T, E>(result: Result<T, E>, message?: string): E {
  if (isErr(result)) {
    return (result as Err<E>).error;
  }

  const fallback = message ?? `Expected Err(...) but received ${formatResult(result)}`;
  throw new Error(fallback);
}

/**
 * Asserts that an Option is Some and returns the value.
 * Throws if the Option is None.
 * @param opt - The Option to check
 * @param message - Optional custom error message
 * @returns The Some value
 * @throws {Error} If the Option is None
 * @example
 * expectSome(42)   // returns 42
 * expectSome(null) // throws Error
 */
export function expectSome<T>(opt: Option<T>, message?: string): T {
  if (isSome(opt)) {
    return opt;
  }
  const fallback = message ?? `Expected Some(...) but received ${formatOption(opt)}`;
  throw new Error(fallback);
}

/**
 * Asserts that an Option is None.
 * Throws if the Option is Some.
 * @param opt - The Option to check
 * @param message - Optional custom error message
 * @throws {Error} If the Option is Some
 * @example
 * expectNone(null) // succeeds
 * expectNone(42)   // throws Error
 */
export function expectNone<T>(opt: Option<T>, message?: string): void {
  if (isNone(opt)) {
    return;
  }
  const fallback = message ?? `Expected None but received ${formatOption(opt)}`;
  throw new Error(fallback);
}

const resultMatchers = {
  toBeOk(this: unknown, received: Result<unknown, unknown>): MatcherResult {
    const pass = isOk(received);
    return {
      pass,
      message: () => (pass ? 'Result is Ok as expected.' : `Expected Ok(...) but received ${formatResult(received)}`),
    };
  },
  toBeErr(this: unknown, received: Result<unknown, unknown>): MatcherResult {
    const pass = isErr(received);
    return {
      pass,
      message: () => (pass ? 'Result is Err as expected.' : `Expected Err(...) but received ${formatResult(received)}`),
    };
  },
  toContainErr(this: unknown, received: Result<unknown, unknown>, expected: unknown): MatcherResult {
    const pass = isErr(received) && (received as Err<unknown>).error === expected;
    return {
      pass,
      message: () => {
        if (pass) return `Err matched expected value ${String(expected)}.`;
        return `Expected Err(${String(expected)}) but received ${formatResult(received)}`;
      },
    };
  },
};

const optionMatchers = {
  toBeSome(this: unknown, received: Option<unknown>): MatcherResult {
    const pass = isSome(received);
    return {
      pass,
      message: () => (pass ? 'Option is Some as expected.' : `Expected Some(...) but received ${formatOption(received)}`),
    };
  },
  toBeNone(this: unknown, received: Option<unknown>): MatcherResult {
    const pass = isNone(received);
    return {
      pass,
      message: () => (pass ? 'Option is None as expected.' : `Expected None but received ${formatOption(received)}`),
    };
  },
};

/**
 * Custom matchers for Jest/Vitest.
 * Includes toBeOk, toBeErr, toContainErr, toBeSome, toBeNone.
 * Use with expect.extend(matchers) or extendExpect(expect).
 */
export const matchers = {
  ...resultMatchers,
  ...optionMatchers,
};

/** Interface for test frameworks with an extend method (Jest, Vitest). */
export type ExpectLike = {
  extend(matchers: Record<string, (...args: any[]) => MatcherResult>): void;
};

/**
 * Extends a test framework's expect with Option and Result matchers.
 * @param expectLike - The expect object to extend (Jest/Vitest)
 * @example
 * import { expect } from 'vitest';
 * import { extendExpect } from 'nalloc/testing';
 * extendExpect(expect);
 *
 * // Now you can use:
 * expect(result).toBeOk();
 * expect(result).toBeErr();
 * expect(option).toBeSome();
 * expect(option).toBeNone();
 */
export function extendExpect(expectLike: ExpectLike): void {
  expectLike.extend(matchers);
}
