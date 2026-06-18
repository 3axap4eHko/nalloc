# nalloc

**Rust-like safety at JavaScript speed.**

Type-safe `Option` and `Result` for TypeScript with near-zero allocations for extreme performance.

[![npm version](https://img.shields.io/npm/v/nalloc.svg)](https://www.npmjs.com/package/nalloc)
[![npm downloads](https://img.shields.io/npm/dw/nalloc.svg)](https://www.npmjs.com/package/nalloc)

## Why nalloc?

Most Option/Result libraries wrap every value in an object. nalloc doesn't.

```
Other libraries:    Some(42) --> { _tag: 'Some', value: 42 }   // allocates
nalloc:            Some(42) --> 42                            // zero allocation

Other libraries:    Ok(data) --> { _tag: 'Ok', value: data }   // allocates
nalloc:            Ok(data) --> data                          // zero allocation
```

- **Rust-like types** - `Option<T>` and `Result<T, E>` with full pattern matching and combinators
- **Near-zero allocations** - `Some` and `Ok` are the values themselves. Only `Err` allocates.
- **Extreme performance** - Up to 2x faster than alternatives on the happy path

## Benchmarks

| Operation    | nalloc        | neverthrow | ts-results | oxide.ts  |
| ------------ | ------------- | ---------- | ---------- | --------- |
| `ok()`       | **91M ops/s** | 75M ops/s  | 56M ops/s  | 40M ops/s |
| `err()`      | **55M ops/s** | 52M ops/s  | 0.1M ops/s | 47M ops/s |
| `some()`     | **85M ops/s** | -          | 40M ops/s  | 50M ops/s |
| `Result.map` | **74M ops/s** | 53M ops/s  | 47M ops/s  | 64M ops/s |
| `Option.map` | **71M ops/s** | -          | 52M ops/s  | 41M ops/s |

Run `pnpm bench` to reproduce.

## Install

```bash
npm install nalloc
```

## Quick start

```ts
import { Option, Result, ok, err, none, pipe, gen } from 'nalloc';

// Option: the value IS the Option
const port = Option.fromNullable(process.env.PORT);
const portNum = Option.unwrapOr(port, '3000');

// Result: Ok is the value itself, Err wraps the error
const config = Result.tryCatch(
  () => JSON.parse(raw),
  () => 'invalid json',
);
const data = Result.match(
  config,
  (cfg) => cfg,
  (error) => ({ fallback: true }),
);

// gen: Rust-like ? operator with type-safe errors
const result = gen(function* ($) {
  const a = yield* $(parseNumber('10'));
  const b = yield* $(parseNumber('5'));
  return a + b;
}); // Result<number, ParseError>

// pipe: left-to-right composition
const userId = pipe(
  Result.tryCatch(() => JSON.parse(raw)),
  (r) => Result.map(r, (data) => data.userId),
  (r) => Result.unwrapOr(r, 0),
);
```

## How it works

| Type        | Representation                 | Allocation |
| ----------- | ------------------------------ | ---------- |
| `Option<T>` | `T \| null \| undefined`       | Zero       |
| `Some<T>`   | The value itself               | Zero       |
| `None`      | `null` or `undefined`          | Zero       |
| `Ok<T>`     | The value itself (branded)     | Zero       |
| `Err<E>`    | Minimal wrapper `{ error: E }` | One object |

This means zero GC pressure on the happy path - your success values stay as plain values.

## Coming from other libraries?

### From neverthrow

```ts
// neverthrow
import { ok, err, Result } from 'neverthrow';
const result: Result<number, string> = ok(42);
result.map((x) => x * 2);

// nalloc - same concepts, faster execution
import { Result, ok, err } from 'nalloc';
const result = ok(42); // zero allocation
Result.map(result, (x) => x * 2); // function-based API
```

### From fp-ts

```ts
// fp-ts
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
pipe(
  O.some(42),
  O.map((x) => x * 2),
);

// nalloc - simpler, faster
import { Option, pipe } from 'nalloc';
pipe(42, (v) => Option.map(v, (x) => x * 2)); // built-in pipe, value IS the Option
```

### From oxide.ts

```ts
// oxide.ts
import { Some, None, Ok, Err } from 'oxide.ts';
const opt = Some(42);
opt.map((x) => x * 2);
const result = Ok(42);
result.mapErr((e) => new Error(e));

// nalloc - no wrapper objects on the happy path
import { Option, Result, ok } from 'nalloc';
Option.map(42, (x) => x * 2); // 42 is the Option itself
const result = ok(42); // zero allocation
Result.mapErr(result, (e) => new Error(e));
```

### From ts-results

```ts
// ts-results
import { Ok, Err, Some, None } from 'ts-results';
const result = new Ok(42);
result.map((x) => x * 2);
const opt = Some(42);
opt.unwrapOr(0);

// nalloc - same safety, zero allocations
import { Option, Result, ok } from 'nalloc';
const result = ok(42); // no wrapper
Result.map(result, (x) => x * 2);
Option.unwrapOr(42, 0); // value IS the Option
```

### From Rust

The API mirrors Rust's `Option` and `Result`:

```ts
import { Option, Result, ok, err, none, gen } from 'nalloc';

// Rust: Some(42).map(|x| x * 2)
Option.map(42, (x) => x * 2);

// Rust: Ok(42).and_then(|x| if x > 0 { Ok(x) } else { Err("negative") })
Result.andThen(ok(42), (x) => (x > 0 ? ok(x) : err('negative')));

// Rust: result.unwrap_or(0)
Result.unwrapOr(result, 0);

// Rust: let value = get_value()?
const value = gen(function* ($) {
  const a = yield* $(getValue());
  return a + 1;
});
```

## Option

An `Option<T>` is `T | null | undefined`. The value itself is the Option.

```ts
import { Option, none } from 'nalloc';

// Create from nullable
const maybePort = Option.fromNullable(process.env.PORT);

// Transform
const doubled = Option.map(maybePort, (p) => parseInt(p) * 2);
const validated = Option.filter(doubled, (n) => n > 0);

// Extract
const port = Option.unwrapOr(maybePort, '3000');

// Pattern match
const label = Option.match(
  maybePort,
  (value) => `Port: ${value}`,
  () => 'Port: default',
);

// Assert and narrow
Option.assertSome(maybePort, 'PORT is required');

// Filter collections
const activeIds = Option.filterMap(users, (user) => (user.isActive ? user.id : none));

// Async
const maybeUser = await Option.fromPromise(fetchUserById(id));
```

## Result

A `Result<T, E>` is either `Ok<T>` (the value itself) or `Err<E>` (a wrapper).

```ts
import { Result, Schema, ok, err, gen, genAsync, pipe } from 'nalloc';

// Wrap throwing functions
const parsed = Result.tryCatch(
  () => JSON.parse(raw),
  (e) => 'invalid json',
);

// gen: Rust-like ? operator with preserved error types
const result = gen(function* ($) {
  const config = yield* $(parseConfig(raw));
  const db = yield* $(connectDb(config.url));
  return db.query('SELECT 1');
}); // Result<QueryResult, ConfigError | DbError>

// Async gen
const data = await genAsync(async function* ($) {
  const res = yield* $(await Result.fromPromise(fetchUser(id)));
  const posts = yield* $(await Result.fromPromise(fetchPosts(res.id)));
  return { user: res, posts };
}); // Promise<Result<{user, posts}, unknown>>

// wrap / toThrowable: ecosystem boundaries
const safeParse = Result.wrap(JSON.parse); // throwing -> Result
safeParse('{"a":1}'); // Ok({a: 1})
const throwingFind = Result.toThrowable(findUser); // Result -> throwing
throwingFind('123'); // returns User or throws

// Standard Schema validation (Zod, Valibot, ArkType, etc.)
const validated = Schema.fromSchema(userSchema, input);
// Result<User, readonly SchemaIssue[]>

// wrapSchema: bind a schema once, reuse the validator
const parseUser = Schema.wrapSchema(userSchema);

// Transform with pipe
const userId = pipe(
  parsed,
  (r) => Result.map(r, (data) => data.userId),
  (r) => Result.flatMap(r, (id) => (id > 0 ? ok(id) : err('invalid id'))),
);

// Pattern match
const user = Result.match(
  parsed,
  (data) => data.user,
  (error) => null,
);

// Assert and narrow
Result.assertOk(loaded, 'Config required');

// Collections
const combined = Result.all([ok(1), ok(2), ok(3)]); // Ok([1, 2, 3])
const first = Result.any([err('a'), ok(42), err('b')]); // Ok(42)
const [oks, errs] = Result.partition(results);
```

## Iter

Iterator utilities for working with fallible iteration and Result streams.

```ts
import { Iter } from 'nalloc';

// Safe iteration: wraps throws as Err, values as Ok
for (const result of Iter.safeIter(riskyIterator)) {
  if (isOk(result)) handleValue(result);
  else handleError(result.error);
}

// mapWhile: yields mapped values while fn returns Some
const taken = [...Iter.mapWhile([1, 2, 3, 4, 5], (n) => (n < 4 ? n * 10 : null))]; // [10, 20, 30]

// tryCollect: collect Results into Result<T[], E>
const collected = Iter.tryCollect(results); // Ok([1, 2, 3]) or first Err

// tryFold: fold with early exit on Err
const sum = Iter.tryFold([1, 2, 3], 0, (acc, n) => ok(acc + n));

// tryForEach: iterate with early exit on Err
Iter.tryForEach(items, (item) => processItem(item));
```

## NonEmpty

Proves at the type level that an array has at least one element. The runtime
value is a plain array - no wrapper, no class, no cloning. `fromArray` returns
the original array value when it is non-empty.

```ts
import { NonEmpty, Option } from 'nalloc';

NonEmpty.isNonEmpty([]); // false
NonEmpty.isNonEmpty([1]); // true, narrows to ReadonlyNonEmptyArray<number>

const values: readonly number[] = loadValues();
if (NonEmpty.isNonEmpty(values)) {
  const first: number = values[0]; // typed, no undefined
}

// fromArray returns None for [] and Some(values) otherwise
const opt = NonEmpty.fromArray(values); // Option<ReadonlyNonEmptyArray<number>>
```

Two Result combinators now carry the non-empty guarantee in their error type:

- `Result.collectAll(results)` returns `Result<T[], NonEmptyArray<E>>` - if the
  result is `Err`, the error array is guaranteed to contain at least one entry.
- `Result.any(results)` returns `Result<Widen<T>, NonEmptyArray<WidenNever<E>>>`
  for the same reason: `any` only fails when every input failed.

## API Reference

### Option

| Function                        | Description                          |
| ------------------------------- | ------------------------------------ |
| `fromNullable(value)`           | Convert nullable to Option           |
| `fromPromise(promise)`          | Promise to Option (rejection = None) |
| `map(opt, fn)`                  | Transform Some value                 |
| `flatMap(opt, fn)`              | Chain Option-returning functions     |
| `andThen(opt, fn)`              | Alias for flatMap                    |
| `tap(opt, fn)`                  | Side effect on Some, return original |
| `tapNone(opt, fn)`              | Side effect on None, return original |
| `filter(opt, predicate)`        | Keep Some if predicate passes        |
| `match(opt, onSome, onNone)`    | Pattern match                        |
| `unwrap(opt)`                   | Extract or throw                     |
| `unwrapOr(opt, default)`        | Extract or default                   |
| `unwrapOrElse(opt, fn)`         | Extract or compute default           |
| `unwrapOrReturn(opt, fn)`       | Extract or return computed value     |
| `expect(opt, msg)`              | Extract or throw with message        |
| `assertSome(opt, msg?)`         | Assert and narrow to Some            |
| `isSome(opt)` / `isNone(opt)`   | Type guards                          |
| `isSomeAnd(opt, pred)`          | Some and predicate passes            |
| `isNoneOr(opt, pred)`           | None or predicate passes             |
| `or(opt, other)`                | Return first Some                    |
| `orElse(opt, fn)`               | Return Some or compute fallback      |
| `and(opt, other)`               | Return second if first is Some       |
| `xor(opt, other)`               | Some if exactly one is Some          |
| `zip(opt, other)`               | Combine two Options into tuple       |
| `unzip(opt)`                    | Split tuple Option into two          |
| `flatten(opt)`                  | Flatten nested Option                |
| `contains(opt, value)`          | Check if Some contains value         |
| `mapOr(opt, default, fn)`       | Map or return default                |
| `mapOrElse(opt, defaultFn, fn)` | Map or compute default               |
| `toArray(opt)`                  | Some to [value], None to []          |
| `toNullable(opt)`               | Some to value, None to null          |
| `toUndefined(opt)`              | Some to value, None to undefined     |
| `okOr(opt, error)`              | Option to Result                     |
| `okOrElse(opt, fn)`             | Option to Result with computed error |
| `ofOk(result)`                  | Ok to Some, Err to None              |
| `ofErr(result)`                 | Err to Some, Ok to None              |
| `filterMap(items, fn)`          | Map and filter in one pass           |
| `findMap(items, fn)`            | Find first Some from mapping         |

### Result

| Function                             | Description                                   |
| ------------------------------------ | --------------------------------------------- |
| `tryCatch(fn, onError?)`             | Wrap throwing function                        |
| `tryCatchMaybePromise(fn, onError?)` | Wrap sync-or-async, preserving sync           |
| `of(fn)`                             | Alias for tryCatch (no error mapper)          |
| `wrap(fn, onError?)`                 | Wrap throwing function once, reuse            |
| `toThrowable(fn)`                    | Inverse of wrap: Result-returning to throwing |
| `gen(fn)`                            | Generator do-notation with typed errors       |
| `genAsync(fn)`                       | Async generator do-notation                   |
| `safeTry(fn)`                        | Imperative error handling with unwrap         |
| `safeTryAsync(fn)`                   | Async version of safeTry                      |
| `unwrap(result)`                     | Extract Ok or throw error value               |
| `unwrapErr(result)`                  | Extract Err or throw                          |
| `unwrapOr(result, default)`          | Extract Ok or default                         |
| `unwrapOrElse(result, fn)`           | Extract Ok or compute from error              |
| `unwrapOrReturn(result, fn)`         | Extract Ok or return computed value           |
| `expect(result, msg)`                | Extract Ok or throw with message              |
| `expectErr(result, msg)`             | Extract Err or throw with message             |
| `map(result, fn)`                    | Transform Ok value                            |
| `mapErr(result, fn)`                 | Transform Err value                           |
| `bimap(result, okFn, errFn)`         | Transform both Ok and Err                     |
| `flatMap(result, fn)`                | Chain Result-returning functions              |
| `andThen(result, fn)`                | Alias for flatMap                             |
| `tap(result, fn)`                    | Side effect on Ok, return original            |
| `tapErr(result, fn)`                 | Side effect on Err, return original           |
| `match(result, onOk, onErr)`         | Pattern match                                 |
| `assertOk(result, msg?)`             | Assert and narrow to Ok                       |
| `assertErr(result, msg?)`            | Assert and narrow to Err                      |
| `isOk(result)` / `isErr(result)`     | Type guards                                   |
| `isOkAnd(result, pred)`              | Ok and predicate passes                       |
| `isErrAnd(result, pred)`             | Err and predicate passes                      |
| `isSomeErr(result)`                  | Err with non-null error                       |
| `and(result, other)`                 | Return second if first is Ok                  |
| `or(result, other)`                  | Return first Ok                               |
| `orElse(result, fn)`                 | Ok or compute fallback from error             |
| `zip(a, b)`                          | Combine two Ok into tuple                     |
| `zipWith(a, b, fn)`                  | Combine two Ok with function                  |
| `flatten(result)`                    | Flatten nested Result                         |
| `transpose(result)`                  | Result<Option> to Option<Result>              |
| `toOption(result)`                   | Ok to Some, Err to None                       |
| `toErrorOption(result)`              | Err to Some, Ok to None                       |
| `mapOr(result, default, fn)`         | Map Ok or return default                      |
| `mapOrElse(result, defaultFn, fn)`   | Map Ok or compute default                     |
| `all(results)`                       | Collect all Ok or first Err                   |
| `any(results)`                       | First Ok or all Errs                          |
| `collect(results)`                   | Collect Ok values or first Err                |
| `collectAll(results)`                | All Ok or all Errs                            |
| `partition(results)`                 | Split into [oks, errs]                        |
| `partitionAsync(promises)`           | Async partition                               |
| `filterOk(results)`                  | Extract all Ok values                         |
| `filterErr(results)`                 | Extract all Err values                        |
| `settleMaybePromise(values)`         | Settle sync/async values to Results           |
| `partitionMaybePromise(values)`      | Partition sync/async Results                  |

### Schema

Standard Schema v1 validation. Tree-shakeable: import the `Schema` namespace from `nalloc`, or directly from `nalloc/schema`.

| Function                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `fromSchema(schema, value)` | Validate via Standard Schema v1, returns Result  |
| `wrapSchema(schema)`        | Bind a schema once, returns a reusable validator |

### HTTP

Optional `nalloc/http` subpath. Works in any runtime with `fetch` (browser, Node 18+, Bun, Deno, edge workers); kept out of the main entry so the core stays free of environment-typed globals.

Native `fetch` resolves successfully on 4xx/5xx - only transport failures reject. So the generic helpers alone let an HTTP error flow down the Ok path looking like success:

```ts
const r = await Result.fromPromise(fetch(url)); // Ok(Response { status: 404 }) - not an Err!
```

`fromFetch` closes that gap: Ok means the request connected AND returned 2xx, and every failure mode lands in the error channel, typed:

```ts
import { fromFetch } from 'nalloc/http';

const res = await fromFetch(url);
// Result<Response, Response | TypeError | DOMException>
// Ok(Response)      -> connected and 2xx
// Err(Response)     -> reached the server, non-2xx (read status/body from it)
// Err(TypeError)    -> network/CORS failure
// Err(DOMException) -> aborted or timed out
```

Already holding a `Response` (custom fetch wrapper, middleware, a different HTTP client)? `fromResponse` is the status check alone, and composes with `fromPromise` if you need the two steps separately:

```ts
import { fromResponse } from 'nalloc/http';

const checked = fromResponse(response); // Ok(response) if response.ok, else Err(response)
```

| Function                  | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `fromFetch(input, init?)` | Run fetch: Ok(response) for 2xx, Err on non-2xx or transport failure |
| `fromResponse(response)`  | Ok(response) if response.ok, else Err(response)                      |

### Iter

| Function                    | Description                                |
| --------------------------- | ------------------------------------------ |
| `safeIter(source)`          | Wrap iterable: values as Ok, throws as Err |
| `mapWhile(source, fn)`      | Yield mapped values while fn returns Some  |
| `tryCollect(source)`        | Collect Results into Result<T[], E>        |
| `tryFold(source, init, fn)` | Fold with early exit on Err                |
| `tryForEach(source, fn)`    | Iterate with early exit on Err             |

### Utilities

| Function              | Description                                  |
| --------------------- | -------------------------------------------- |
| `pipe(value, ...fns)` | Thread value through functions left-to-right |

## ESLint plugin

nalloc ships an optional ESLint plugin (flat config) at `nalloc/eslint`. It is dev-time only and
never enters your runtime bundle. The typescript-eslint toolchain is an optional peer - install it
alongside ESLint:

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/utils typescript
```

```js
// eslint.config.js
import nalloc from 'nalloc/eslint';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { nalloc },
    rules: {
      'nalloc/must-use': 'error',
      'nalloc/no-unwrap': 'error',
    },
  },
  { files: ['**/*.test.ts'], rules: { 'nalloc/no-unwrap': 'off' } },
];
```

| Rule               | What it flags                                                           | Type info                                 |
| ------------------ | ----------------------------------------------------------------------- | ----------------------------------------- |
| `nalloc/must-use`  | A `Result`/`Option` value used as a bare statement and discarded        | Required (`parserOptions.projectService`) |
| `nalloc/no-unwrap` | `unwrap` / `unwrapErr` / `expect` / `expectErr`, which throw on failure | Not required                              |

`nalloc.configs.recommended` turns both rules on; it does not configure the parser, so a type-aware
setup for `must-use` is still your config's responsibility. Without type info, `must-use` reports the
standard typescript-eslint parserServices error while `no-unwrap` keeps working.

## Codemod: migrate from neverthrow

nalloc bundles a best-effort codemod that rewrites neverthrow code to nalloc. It needs the
optional `oxc-parser` peer (dev-time only, never in your runtime bundle):

```bash
npm install -D oxc-parser
npx nalloc-codemod src --report migration-report.md   # add --dry to preview
```

What it converts: the neverthrow import (aliases preserved); method calls to function calls
(`r.map(f)` -> `Result.map(r, f)`, `.andThen` -> `Result.flatMap`, `.mapErr`, `.orElse`, `.match`,
`.unwrapOr`, `.isOk`/`.isErr`, `.andTee`/`.orTee` -> `tap`/`tapErr`, `_unsafeUnwrap` -> `Result.unwrap`);
chains of two or more methods fold into `pipe(...)`; `fromThrowable` -> `Result.wrap`;
`combine` -> `Result.all`; `combineWithAllErrors` -> `Result.collectAll`; directly-awaited
`fromPromise` -> `Result.fromPromise`; `Result<T, E>` type annotations -> `ResultType<T, E>`.
Edits are text splices, so untouched code keeps its formatting byte for byte.

What it refuses and reports instead: `ResultAsync` and everything that produces one
(`okAsync`, `errAsync`, chained `fromPromise`, `asyncMap`, ...) - the nalloc idiom is `genAsync`,
which is a manual rewrite; `safeTry` generators (use `gen`); namespace imports
(`import * as nt`). Those keep a residual neverthrow import so the file still compiles mid-migration.

Two safety properties to know. Conversion is provenance-based: ambiguous method names like `.map`
are only rewritten when the receiver provably holds a Result (constructed from `ok`/`err`/`combine`/
a `fromThrowable`-wrapped function, annotated with a neverthrow type, or chained with
neverthrow-only methods) - a bare `.map` on an unknown receiver is assumed to be an array and left
alone. And migrate the whole project in one run: converted call sites assume their values are
nalloc values, which only holds once the constructors producing them are converted too.

## Comparison

| Feature            | nalloc | neverthrow | fp-ts | oxide.ts | ts-results |
| ------------------ | ------ | ---------- | ----- | -------- | ---------- |
| Zero-alloc Option  | Yes    | No         | No    | No       | No         |
| Zero-alloc Ok      | Yes    | No         | No    | No       | No         |
| Bundle size        | Tiny   | Small      | Large | Small    | Small      |
| Learning curve     | Low    | Low        | High  | Low      | Low        |
| Async support      | Yes    | Yes        | Yes   | Limited  | No         |
| Tree-shakeable     | Yes    | Yes        | Yes   | Yes      | Yes        |
| Iterator utilities | Yes    | No         | Yes   | No       | No         |
| gen (? operator)   | Yes    | Yes        | No    | No       | No         |
| pipe               | Yes    | No         | Yes   | No       | No         |
| Schema validation  | Yes    | No         | No    | No       | No         |
| Ecosystem interop  | Yes    | No         | No    | No       | No         |

## Alternatives

Looking for a TypeScript Result/Option library? Here's how nalloc compares:

- **neverthrow** - Popular, method-chaining API. Allocates a wrapper for every Ok and Err. nalloc avoids allocation on the happy path entirely.
- **fp-ts / effect** - Full functional programming ecosystem with Either and Option. Powerful but heavy and steep learning curve. nalloc focuses on Result/Option with a simpler API.
- **oxide.ts** - Rust-inspired with class-based wrappers. Every Some/Ok allocates an object. nalloc represents Some/Ok as the raw value.
- **ts-results / ts-results-es** - Direct Rust port with class instances. Similar API surface to nalloc, but allocates on every construction.
- **true-myth** - Result and Maybe with a functional API. Wraps all values. nalloc is a similar philosophy with zero-allocation design.

nalloc is designed for codebases where allocation pressure matters - high-throughput servers, hot loops, and performance-sensitive paths - while keeping the same safety guarantees.

## License

MIT

## Contributing

Contributions welcome! Open an issue or PR for ideas, bug fixes, or docs.
