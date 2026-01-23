import { Option, Result, isSome, isOk } from './types.js';

/** Logger function signature for custom logging. */
type Logger = (message: string, ...args: unknown[]) => void;

/**
 * Formats an Option as a human-readable string.
 * @param opt - The Option to format
 * @returns "Some(value)" or "None"
 * @example
 * formatOption(42)        // "Some(42)"
 * formatOption(null)      // "None"
 * formatOption(undefined) // "None"
 */
export function formatOption<T>(opt: Option<T>): string {
  return isSome(opt) ? `Some(${String(opt)})` : 'None';
}

/**
 * Formats a Result as a human-readable string.
 * For Err containing an Error, displays the error message.
 * @param result - The Result to format
 * @returns "Ok(value)" or "Err(error)"
 * @example
 * formatResult(42)                      // "Ok(42)"
 * formatResult(err('fail'))             // "Err(fail)"
 * formatResult(err(new Error('oops')))  // "Err(oops)"
 */
export function formatResult<T, E>(result: Result<T, E>): string {
  if (isOk(result)) {
    return `Ok(${String(result)})`;
  }
  const error = (result as { error: E }).error;
  return `Err(${error instanceof Error ? error.message : String(error)})`;
}

/**
 * Inspects an Option, returning a tagged object for debugging or serialization.
 * @param opt - The Option to inspect
 * @returns `{ kind: 'some', value: T }` or `{ kind: 'none' }`
 * @example
 * inspectOption(42)   // { kind: 'some', value: 42 }
 * inspectOption(null) // { kind: 'none' }
 */
export function inspectOption<T>(opt: Option<T>) {
  return isSome(opt) ? { kind: 'some' as const, value: opt } : { kind: 'none' as const };
}

/**
 * Inspects a Result, returning a tagged object for debugging or serialization.
 * @param result - The Result to inspect
 * @returns `{ status: 'ok', value: T }` or `{ status: 'err', error: E }`
 * @example
 * inspectResult(42)           // { status: 'ok', value: 42 }
 * inspectResult(err('fail'))  // { status: 'err', error: 'fail' }
 */
export function inspectResult<T, E>(result: Result<T, E>) {
  return isOk(result) ? { status: 'ok' as const, value: result } : { status: 'err' as const, error: (result as { error: E }).error };
}

/**
 * Logs an Option using the provided logger (defaults to console.log).
 * @param opt - The Option to log
 * @param logger - The logging function to use
 * @example
 * logOption(42)              // logs "Some(42)"
 * logOption(null)            // logs "None"
 * logOption(42, console.warn) // logs "Some(42)" as warning
 */
export function logOption<T>(opt: Option<T>, logger: Logger = console.log): void {
  logger(formatOption(opt));
}

/**
 * Logs a Result using the provided logger (defaults to console.log).
 * Logs "Ok" with the value or "Err" with the error.
 * @param result - The Result to log
 * @param logger - The logging function to use
 * @example
 * logResult(42)              // logs "Ok", 42
 * logResult(err('fail'))     // logs "Err", "fail"
 * logResult(42, console.warn) // logs "Ok", 42 as warning
 */
export function logResult<T, E>(result: Result<T, E>, logger: Logger = console.log): void {
  const tagged = inspectResult(result);
  if (tagged.status === 'ok') {
    logger(`Ok`, tagged.value);
    return;
  }
  logger(`Err`, tagged.error);
}

/** Alias for inspectOption. Returns a JSON-serializable representation. */
export const toJSONOption = inspectOption;

/** Alias for inspectResult. Returns a JSON-serializable representation. */
export const toJSONResult = inspectResult;
