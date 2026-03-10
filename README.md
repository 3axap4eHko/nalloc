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

| Operation | nalloc | neverthrow | ts-results | oxide.ts |
|-----------|---------|------------|------------|----------|
| `ok()` | **91M ops/s** | 75M ops/s | 56M ops/s | 40M ops/s |
| `err()` | **55M ops/s** | 52M ops/s | 0.1M ops/s | 47M ops/s |
| `some()` | **85M ops/s** | - | 40M ops/s | 50M ops/s |
| `Result.map` | **74M ops/s** | 53M ops/s | 47M ops/s | 64M ops/s |
| `Option.map` | **71M ops/s** | - | 52M ops/s | 41M ops/s |

Run `pnpm bench` to reproduce.

## Install

```bash
npm install nalloc
```

## Quick start

```ts
import { Option, Result, ok, err, none, safeTry, unwrap } from 'nalloc';

// Option: the value IS the Option
const port = Option.fromNullable(process.env.PORT);
const portNum = Option.unwrapOr(port, '3000');

// Result: Ok is the value itself, Err wraps the error
const config = Result.tryCatch(() => JSON.parse(raw), () => 'invalid json');
const data = Result.match(
  config,
  cfg => cfg,
  error => ({ fallback: true })
);

// safeTry: Rust-like ? operator
const result = safeTry(() => {
  const a = unwrap(parseNumber('10'));
  const b = unwrap(parseNumber('5'));
  return a + b;
}); // Ok(15) or Err(...)
```

## How it works

| Type | Representation | Allocation |
|------|----------------|------------|
| `Option<T>` | `T \| null \| undefined` | Zero |
| `Some<T>` | The value itself | Zero |
| `None` | `null` or `undefined` | Zero |
| `Ok<T>` | The value itself (branded) | Zero |
| `Err<E>` | Minimal wrapper `{ error: E }` | One object |

This means zero GC pressure on the happy path - your success values stay as plain values.

## Coming from other libraries?

### From neverthrow

```ts
// neverthrow
import { ok, err, Result } from 'neverthrow';
const result: Result<number, string> = ok(42);
result.map(x => x * 2);

// nalloc - same concepts, faster execution
import { Result, ok, err } from 'nalloc';
const result = ok(42);                    // zero allocation
Result.map(result, x => x * 2);           // function-based API
```

### From fp-ts

```ts
// fp-ts
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
pipe(O.some(42), O.map(x => x * 2));

// nalloc - simpler, faster
import { Option } from 'nalloc';
Option.map(42, x => x * 2);               // value IS the Option
```

### From oxide.ts

```ts
// oxide.ts
import { Some, None, Ok, Err } from 'oxide.ts';
const opt = Some(42);
opt.map(x => x * 2);
const result = Ok(42);
result.mapErr(e => new Error(e));

// nalloc - no wrapper objects on the happy path
import { Option, Result, ok } from 'nalloc';
Option.map(42, x => x * 2);              // 42 is the Option itself
const result = ok(42);                    // zero allocation
Result.mapErr(result, e => new Error(e));
```

### From ts-results

```ts
// ts-results
import { Ok, Err, Some, None } from 'ts-results';
const result = new Ok(42);
result.map(x => x * 2);
const opt = Some(42);
opt.unwrapOr(0);

// nalloc - same safety, zero allocations
import { Option, Result, ok } from 'nalloc';
const result = ok(42);                    // no wrapper
Result.map(result, x => x * 2);
Option.unwrapOr(42, 0);                  // value IS the Option
```

### From Rust

The API mirrors Rust's `Option` and `Result`:

```ts
import { Option, Result, ok, err, none, safeTry, unwrap } from 'nalloc';

// Rust: Some(42).map(|x| x * 2)
Option.map(42, x => x * 2);

// Rust: Ok(42).and_then(|x| if x > 0 { Ok(x) } else { Err("negative") })
Result.andThen(ok(42), x => x > 0 ? ok(x) : err('negative'));

// Rust: result.unwrap_or(0)
Result.unwrapOr(result, 0);

// Rust: let value = try!(get_value())  /  let value = get_value()?
const value = safeTry(() => {
  const a = unwrap(getValue());
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
const doubled = Option.map(maybePort, p => parseInt(p) * 2);
const validated = Option.filter(doubled, n => n > 0);

// Extract
const port = Option.unwrapOr(maybePort, '3000');

// Pattern match
const label = Option.match(
  maybePort,
  value => `Port: ${value}`,
  () => 'Port: default'
);

// Assert and narrow
Option.assertSome(maybePort, 'PORT is required');

// Filter collections
const activeIds = Option.filterMap(users, user =>
  user.isActive ? user.id : none
);

// Async
const maybeUser = await Option.fromPromise(fetchUserById(id));
```

## Result

A `Result<T, E>` is either `Ok<T>` (the value itself) or `Err<E>` (a wrapper).

```ts
import { Result, ok, err, safeTry, safeTryAsync, unwrap } from 'nalloc';

// Wrap throwing functions
const parsed = Result.tryCatch(
  () => JSON.parse(raw),
  e => 'invalid json'
);

// safeTry: Rust-like ? operator for imperative error handling
const result = safeTry(() => {
  const config = unwrap(parseConfig(raw));
  const db = unwrap(connectDb(config.url));
  return db.query('SELECT 1');
});

// Async safeTry
const data = await safeTryAsync(async () => {
  const res = unwrap(await fetchUser(id));
  const posts = unwrap(await fetchPosts(res.id));
  return { user: res, posts };
});

// Transform
const userId = Result.map(parsed, data => data.userId);
const validated = Result.flatMap(userId, id =>
  id > 0 ? ok(id) : err('invalid id')
);

// Pattern match
const user = Result.match(
  parsed,
  data => data.user,
  error => null
);

// Assert and narrow
Result.assertOk(loaded, 'Config required');

// Collections
const combined = Result.all([ok(1), ok(2), ok(3)]);      // Ok([1, 2, 3])
const first = Result.any([err('a'), ok(42), err('b')]);  // Ok(42)
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
const taken = [...Iter.mapWhile([1, 2, 3, 4, 5], n =>
  n < 4 ? n * 10 : null
)]; // [10, 20, 30]

// tryCollect: collect Results into Result<T[], E>
const collected = Iter.tryCollect(results); // Ok([1, 2, 3]) or first Err

// tryFold: fold with early exit on Err
const sum = Iter.tryFold([1, 2, 3], 0, (acc, n) => ok(acc + n));

// tryForEach: iterate with early exit on Err
Iter.tryForEach(items, item => processItem(item));
```

## API Reference

### Option

| Function | Description |
|----------|-------------|
| `fromNullable(value)` | Convert nullable to Option |
| `fromPromise(promise)` | Promise to Option (rejection = None) |
| `map(opt, fn)` | Transform Some value |
| `flatMap(opt, fn)` | Chain Option-returning functions |
| `andThen(opt, fn)` | Alias for flatMap |
| `tap(opt, fn)` | Side effect on Some, return original |
| `filter(opt, predicate)` | Keep Some if predicate passes |
| `match(opt, onSome, onNone)` | Pattern match |
| `unwrap(opt)` | Extract or throw |
| `unwrapOr(opt, default)` | Extract or default |
| `unwrapOrElse(opt, fn)` | Extract or compute default |
| `unwrapOrReturn(opt, fn)` | Extract or return computed value |
| `expect(opt, msg)` | Extract or throw with message |
| `assertSome(opt, msg?)` | Assert and narrow to Some |
| `isSome(opt)` / `isNone(opt)` | Type guards |
| `isSomeAnd(opt, pred)` | Some and predicate passes |
| `isNoneOr(opt, pred)` | None or predicate passes |
| `or(opt, other)` | Return first Some |
| `orElse(opt, fn)` | Return Some or compute fallback |
| `and(opt, other)` | Return second if first is Some |
| `xor(opt, other)` | Some if exactly one is Some |
| `zip(opt, other)` | Combine two Options into tuple |
| `unzip(opt)` | Split tuple Option into two |
| `flatten(opt)` | Flatten nested Option |
| `contains(opt, value)` | Check if Some contains value |
| `mapOr(opt, default, fn)` | Map or return default |
| `mapOrElse(opt, defaultFn, fn)` | Map or compute default |
| `toArray(opt)` | Some to [value], None to [] |
| `toNullable(opt)` | Some to value, None to null |
| `toUndefined(opt)` | Some to value, None to undefined |
| `okOr(opt, error)` | Option to Result |
| `okOrElse(opt, fn)` | Option to Result with computed error |
| `ofOk(result)` | Ok to Some, Err to None |
| `ofErr(result)` | Err to Some, Ok to None |
| `filterMap(items, fn)` | Map and filter in one pass |
| `findMap(items, fn)` | Find first Some from mapping |

### Result

| Function | Description |
|----------|-------------|
| `tryCatch(fn, onError?)` | Wrap throwing function |
| `tryCatchMaybePromise(fn, onError?)` | Wrap sync-or-async, preserving sync |
| `of(fn)` | Alias for tryCatch (no error mapper) |
| `safeTry(fn)` | Imperative error handling with unwrap |
| `safeTryAsync(fn)` | Async version of safeTry |
| `unwrap(result)` | Extract Ok or throw error value |
| `unwrapErr(result)` | Extract Err or throw |
| `unwrapOr(result, default)` | Extract Ok or default |
| `unwrapOrElse(result, fn)` | Extract Ok or compute from error |
| `unwrapOrReturn(result, fn)` | Extract Ok or return computed value |
| `expect(result, msg)` | Extract Ok or throw with message |
| `expectErr(result, msg)` | Extract Err or throw with message |
| `map(result, fn)` | Transform Ok value |
| `mapErr(result, fn)` | Transform Err value |
| `bimap(result, okFn, errFn)` | Transform both Ok and Err |
| `flatMap(result, fn)` | Chain Result-returning functions |
| `andThen(result, fn)` | Alias for flatMap |
| `tap(result, fn)` | Side effect on Ok, return original |
| `tapErr(result, fn)` | Side effect on Err, return original |
| `match(result, onOk, onErr)` | Pattern match |
| `assertOk(result, msg?)` | Assert and narrow to Ok |
| `assertErr(result, msg?)` | Assert and narrow to Err |
| `isOk(result)` / `isErr(result)` | Type guards |
| `isOkAnd(result, pred)` | Ok and predicate passes |
| `isErrAnd(result, pred)` | Err and predicate passes |
| `isSomeErr(result)` | Err with non-null error |
| `and(result, other)` | Return second if first is Ok |
| `or(result, other)` | Return first Ok |
| `orElse(result, fn)` | Ok or compute fallback from error |
| `zip(a, b)` | Combine two Ok into tuple |
| `zipWith(a, b, fn)` | Combine two Ok with function |
| `flatten(result)` | Flatten nested Result |
| `transpose(result)` | Result<Option> to Option<Result> |
| `toOption(result)` | Ok to Some, Err to None |
| `toErrorOption(result)` | Err to Some, Ok to None |
| `mapOr(result, default, fn)` | Map Ok or return default |
| `mapOrElse(result, defaultFn, fn)` | Map Ok or compute default |
| `all(results)` | Collect all Ok or first Err |
| `any(results)` | First Ok or all Errs |
| `collect(results)` | Collect Ok values or first Err |
| `collectAll(results)` | All Ok or all Errs |
| `partition(results)` | Split into [oks, errs] |
| `partitionAsync(promises)` | Async partition |
| `filterOk(results)` | Extract all Ok values |
| `filterErr(results)` | Extract all Err values |
| `settleMaybePromise(values)` | Settle sync/async values to Results |
| `partitionMaybePromise(values)` | Partition sync/async Results |

### Iter

| Function | Description |
|----------|-------------|
| `safeIter(source)` | Wrap iterable: values as Ok, throws as Err |
| `mapWhile(source, fn)` | Yield mapped values while fn returns Some |
| `tryCollect(source)` | Collect Results into Result<T[], E> |
| `tryFold(source, init, fn)` | Fold with early exit on Err |
| `tryForEach(source, fn)` | Iterate with early exit on Err |

## Comparison

| Feature | nalloc | neverthrow | fp-ts | oxide.ts | ts-results |
|---------|---------|------------|-------|----------|------------|
| Zero-alloc Option | Yes | No | No | No | No |
| Zero-alloc Ok | Yes | No | No | No | No |
| Bundle size | Tiny | Small | Large | Small | Small |
| Learning curve | Low | Low | High | Low | Low |
| Async support | Yes | Yes | Yes | Limited | No |
| Tree-shakeable | Yes | Yes | Yes | Yes | Yes |
| Iterator utilities | Yes | No | Yes | No | No |
| safeTry (? operator) | Yes | Yes | No | No | No |

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
