import { err } from './types.js';
import type { Ok, Result } from './types.js';

declare const BRAND: unique symbol;

/** A branded type - a base type T with a compile-time brand B. */
export type Branded<T, B extends string> = T & { readonly [BRAND]: B };

/**
 * Creates a branded value without validation.
 * @returns The value as the branded type
 * @example
 * type UserId = Branded<string, 'UserId'>;
 * const id = make<UserId>('user-123');
 */
export function make<B extends Branded<unknown, string>>(
  value: B extends Branded<infer T, string> ? T : never
): B {
  return value as B;
}

/**
 * Parses and validates a value into a branded type.
 * @param value - Value to validate
 * @param validator - Validation function
 * @param error - Error to return if validation fails
 * @returns Ok(branded) if valid, Err(error) if invalid
 * @example
 * type Email = Branded<string, 'Email'>;
 * const email = parse<Email>(input, isValidEmail, 'Invalid email');
 */
export function parse<B extends Branded<unknown, string>, E = string>(
  value: unknown,
  validator: (v: unknown) => boolean,
  error?: E
): Result<B, E> {
  return validator(value) ? (value as Ok<B>) : err(error ?? ('Validation failed' as E));
}
