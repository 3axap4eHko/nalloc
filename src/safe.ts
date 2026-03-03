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
export { safeTry, safeTryAsync, unwrap } from './result.js';
export * as Option from './option.js';
export * as Result from './result.js';
export * as Iter from './iter.js';
