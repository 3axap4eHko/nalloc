export { some, none, ok, err, isOk, isErr, isSome, isNone, isThenable, isSync } from './types.js';
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
  MaybePromise,
} from './types.js';
export { safeTry, safeTryAsync, unwrap, gen, genAsync } from './result.js';
export type { NonEmptyArray, ReadonlyNonEmptyArray } from './nonempty.js';
export * as Option from './option.js';
export * as Result from './result.js';
export * as Iter from './iter.js';
export * as NonEmpty from './nonempty.js';

/**
 * Threads a value through a sequence of unary functions, left to right.
 * @param value - The initial value
 * @param fns - Functions to apply in order
 * @returns The result of applying all functions
 * @example
 * pipe(
 *   Result.tryCatch(() => JSON.parse(input)),
 *   r => Result.flatMap(r, validate),
 *   r => Result.map(r, transform),
 * )
 */
export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
export function pipe<A, B, C, D, E>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E;
export function pipe<A, B, C, D, E, F>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): F;
export function pipe<A, B, C, D, E, F, G>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): G;
export function pipe<A, B, C, D, E, F, G, H>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): H;
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): I;
export function pipe(a: unknown, ...fns: ((v: unknown) => unknown)[]): unknown {
  let result = a;
  for (let i = 0; i < fns.length; i++) {
    result = fns[i](result);
  }
  return result;
}
