import { assert, type Not, type Equals } from 'tsafe';
import {
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  bimap,
  unwrapOr,
  unwrapOrElse,
  and,
  or,
  orElse,
  flatten,
  match,
  partition,
  collect,
  collectAll,
  transpose,
  isOkAnd,
  isErrAnd,
  of,
  tryCatch,
  unwrapOrReturn,
  assertOk,
  assertErr,
  all,
  any,
  partitionAsync
} from '../result.js';
import { Result, Ok, Err, ok, err, Option, type InferErr } from '../types.js';

const okValue = ok<number>(42);
assert<Equals<typeof okValue, Ok<number>>>;
assert<Not<Equals<typeof okValue, Err<any>>>>;

const okValue2 = ok<number>(5);
assert<Equals<typeof okValue2, Ok<number>>>;

const errValue = err("error");
assert<Equals<typeof errValue, Err<string>>>;
assert<Not<Equals<typeof errValue, Ok<any>>>>;

const errValue2 = err<number>(404);
assert<Equals<typeof errValue2, Err<number>>>;

const result: Result<number, string> = Math.random() > 0 ? ok(42) : err("error");
if (isOk(result)) {
  assert<Equals<typeof result, Ok<number>>>;
  assert<Not<Equals<typeof result, Err<string>>>>;
  const value: number = result;
} else {
  assert<Equals<typeof result, Err<string>>>;
  assert<Not<Equals<typeof result, Ok<number>>>>;
  const error: string = result.error;
}

const knownOk = ok(123);
const isOkResult = isOk(knownOk);
assert<Equals<typeof isOkResult, true>>;
assert<Not<Equals<typeof isOkResult, false>>>;
assert<Not<Equals<typeof isOkResult, boolean>>>;

const knownErr = err("error");
const isErrResult = isErr(knownErr);
assert<Equals<typeof isErrResult, true>>;
assert<Not<Equals<typeof isErrResult, false>>>;
assert<Not<Equals<typeof isErrResult, boolean>>>;

const isOkOnErr = isOk(knownErr);
assert<Equals<typeof isOkOnErr, false>>;
assert<Not<Equals<typeof isOkOnErr, true>>>;

const isErrOnOk = isErr(knownOk);
assert<Equals<typeof isErrOnOk, false>>;
assert<Not<Equals<typeof isErrOnOk, true>>>;

const mapped = map(ok<number>(5) as Result<number, never>, x => x * 2);
assert<Equals<typeof mapped, Result<number, never>>>;

const mappedErr = map(err<string>("error") as Result<number, string>, (x: number) => x * 2);
assert<Equals<typeof mappedErr, Result<number, string>>>;

const errorMapped = mapErr(err<string>("error") as Result<never, string>, e => e.length);
// errorMapped has type Result<never, number>

const errorMappedOk = mapErr(ok<number>(42) as Result<number, string>, e => e.length);
assert<Equals<typeof errorMappedOk, Result<number, number>>>;

const chained = flatMap(ok<number>(5) as Result<number, string>, x => 
  x > 0 ? ok(x * 2) : err("negative")
);
assert<Equals<typeof chained, Result<number, string>>>;

const flatMapped = flatMap(ok<number>(5) as Result<number, string>, x => ok(x.toString()));
assert<Equals<typeof flatMapped, Result<string, string>>>;

const bimapped = bimap(
  result,
  v => v.toString(),
  e => e.length
);
assert<Equals<typeof bimapped, Result<string, number>>>;

const andResult = and(ok<number>(1) as Result<number, string>, ok<number>(2) as Result<number, string>);
assert<Equals<typeof andResult, Result<number, string>>>;

const orResult = or(err<string>("error") as Result<number, string>, ok<number>(42) as Result<number, boolean>);
assert<Equals<typeof orResult, Result<number, boolean>>>;

const orElseResult = orElse(err<string>("error") as Result<number, string>, e => ok<number>(e.length) as Result<number, number>);
assert<Equals<typeof orElseResult, Result<number, number>>>;

const numErr: Result<string, number> = err(404);
const strErr: Result<string, string> = err("not found");
assert<Not<Equals<typeof numErr, typeof strErr>>>;

const okNum: Ok<number> = ok(100);
const plainNum: number = okNum;
assert<Equals<typeof plainNum, number>>;

const nested: Result<Result<number, string>, Error> = ok(ok(42));
const flattened = flatten(nested as Result<Result<number, string>, string>);
assert<Equals<typeof flattened, Result<number, string>>>;


const matchResult = match(
  result,
  v => v.toString(),
  e => e,
);
assert<Equals<typeof matchResult, string>>;

const results: Result<number, string>[] = [ok(1), err("error"), ok(2)];
const [oks, errs] = partition(results);
assert<Equals<typeof oks, number[]>>;
assert<Equals<typeof errs, string[]>>;

const collected = collect(results);
assert<Equals<typeof collected, Result<number[], string>>>;

const collectedAll = collectAll(results);
assert<Equals<typeof collectedAll, Result<number[], [string, ...string[]]>>>;

const transposed = transpose(ok(42 as Option<number>) as Result<Option<number>, string>);
assert<Equals<typeof transposed, Option<Result<number, string>>>>;

const isOkAndResult = isOkAnd(ok<number>(42) as Result<number, never>, x => x > 0);
assert<Equals<typeof isOkAndResult, boolean>>;

const isErrAndResult = isErrAnd(err<string>("error") as Result<never, string>, e => e.length > 0);
assert<Equals<typeof isErrAndResult, boolean>>;

const tryResult = of(() => {
  if (Math.random() > 0.5) throw new Error("oops");
  return 42;
});
assert<Equals<typeof tryResult, Result<number, unknown>>>;

const tryResultTyped = of(() => {
  if (Math.random() > 0.5) throw new Error("oops");
  return 42;
});
assert<Equals<typeof tryResultTyped, Result<number, unknown>>>;

const tryResultResult= of(() => {
  if (Math.random() > 0.5) err("error");
  return 42;
});
assert<Equals<typeof tryResultResult, Result<number, unknown>>>;


const unwrapOrResult = unwrapOr(err<string>("error") as Result<number, string>, 42);
assert<Equals<typeof unwrapOrResult, number>>;

const unwrapOrElseResult = unwrapOrElse(err<string>("error") as Result<number, string>, e => e.length);
assert<Equals<typeof unwrapOrElseResult, number>>;

const complexResult: Result<{ id: number; name: string }, Error> = 
  Math.random() > 0.5 
    ? ok({ id: 1, name: "test" })
    : err(new Error("failed"));

if (isOk(complexResult)) {
  assert<Equals<typeof complexResult, Ok<{ id: number; name: string }>>>;
  const obj: { id: number; name: string } = complexResult;
  const id: number = complexResult.id;
  const name: string = complexResult.name;
}

if (isErr(complexResult)) {
  // complexResult is narrowed to Err<Error> here
  const error: Error = (complexResult as Err<Error>).error;
}

const okString: Result<string, never> = ok<string>("hello");
const mappedString = map(okString, s => s.length);
// mappedString is Result<number, never>

const errString: Result<never, string> = err<string>("error");
const mappedErrString = mapErr(errString, s => s.length);
// mappedErrString is Result<never, number>

const tryCatchResult = tryCatch(() => 1);
assert<Equals<typeof tryCatchResult, Result<number, unknown>>>;

const tryCatchTyped = tryCatch<number, string>(() => {
  throw new Error('boom');
}, error => (error as Error).message);
assert<Equals<typeof tryCatchTyped, Result<number, string>>>;

const tryCatchPassthroughErr = tryCatch(() => err('payload'));
assert<Equals<typeof tryCatchPassthroughErr, Err<unknown>>>;

const tryCatchPassthroughResult = tryCatch(() => Math.random() > 0.5 ? ok(1) : err('fail'));
assert<Equals<typeof tryCatchPassthroughResult, Result<1, unknown>>>;

const tryCatchPassthroughErrTyped = tryCatch(
  () => err('payload'),
  () => 0,
);
assert<Equals<typeof tryCatchPassthroughErrTyped, Err<string | number>>>;

const unwrapFallback = unwrapOrReturn(ok(1) as Result<number, string>, () => 'fallback');
assert<Equals<typeof unwrapFallback, number | 'fallback'>>;

declare const maybeResult: Result<number, string>;
assertOk(maybeResult);
const narrowedOk: Ok<number> = maybeResult;

declare const maybeErr: Result<number, string>;
assertErr(maybeErr);
const narrowedErr: Err<string> = maybeErr;

const allResult = all([ok(1), ok(2)]);
assert<Equals<typeof allResult, Result<readonly number[], unknown>>>;

const anyResult = any([err('a'), ok(3)]);
assert<Equals<typeof anyResult, Result<number, [string, ...string[]]>>>;

const partitionAsyncResult = partitionAsync([Promise.resolve(ok(1)), Promise.resolve(err('a'))]);
assert<Equals<typeof partitionAsyncResult, Promise<[number[], string[]]>>>;

type ExtractedErr = InferErr<Result<number, string>>;
assert<Equals<ExtractedErr, Err<string>>>;
