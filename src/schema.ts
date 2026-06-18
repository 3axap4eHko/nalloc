import { err as ERR, isThenable } from './types.js';
import type { Ok, Result } from './types.js';

/** A validation issue from a Standard Schema validator. */
export interface SchemaIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}

/** Minimal Standard Schema v1 interface (duck-typed, no external dependency). */
export interface StandardSchema<O = unknown> {
  readonly '~standard': {
    readonly validate: (value: unknown) => StandardSchemaResult<O> | Promise<StandardSchemaResult<O>>;
  };
}

type StandardSchemaResult<O> = { readonly value: O; readonly issues?: undefined } | { readonly issues: ReadonlyArray<SchemaIssue> };

function schemaResultToResult<O>(sr: StandardSchemaResult<O>): Result<O, readonly SchemaIssue[]> {
  return sr.issues ? ERR(sr.issues) : (sr.value as Ok<O>);
}

/**
 * Validates a value against a Standard Schema and returns a Result.
 * Works with any Standard Schema v1 compliant library (Zod, Valibot, ArkType, etc.).
 * Returns synchronously if the schema validates synchronously.
 * @param schema - A Standard Schema v1 compliant schema
 * @param value - The value to validate
 * @returns Ok(parsed) if valid, Err(issues) if invalid
 * @example
 * import { z } from 'zod';
 * const result = fromSchema(z.string().email(), input);
 * // Result<string, readonly SchemaIssue[]>
 */
export function fromSchema<O>(schema: StandardSchema<O>, value: unknown): Result<O, readonly SchemaIssue[]> | Promise<Result<O, readonly SchemaIssue[]>> {
  const sr = schema['~standard'].validate(value);
  if (isThenable(sr)) return sr.then(schemaResultToResult);
  return schemaResultToResult(sr);
}

/**
 * Binds a Standard Schema once and returns a reusable validator function.
 * The partial-application form of fromSchema - validate many values against one schema.
 * @param schema - A Standard Schema v1 compliant schema
 * @returns A function that validates a value and returns a Result
 * @example
 * const parseUser = wrapSchema(userSchema);
 * const result = parseUser(input); // Result<User, readonly SchemaIssue[]>
 */
export function wrapSchema<O>(schema: StandardSchema<O>): (value: unknown) => Result<O, readonly SchemaIssue[]> | Promise<Result<O, readonly SchemaIssue[]>> {
  return (value) => fromSchema(schema, value);
}
