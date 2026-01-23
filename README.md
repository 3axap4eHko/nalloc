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
import { Option, Result, ok, err, none } from 'nalloc';

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

### From Rust

The API mirrors Rust's `Option` and `Result`:

```ts
import { Option, Result, ok, err, none } from 'nalloc';

// Rust: Some(42).map(|x| x * 2)
Option.map(42, x => x * 2);

// Rust: Ok(42).and_then(|x| if x > 0 { Ok(x) } else { Err("negative") })
Result.andThen(ok(42), x => x > 0 ? ok(x) : err('negative'));

// Rust: result.unwrap_or(0)
Result.unwrapOr(result, 0);
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
import { Result, ok, err } from 'nalloc';

// Wrap throwing functions
const parsed = Result.tryCatch(
  () => JSON.parse(raw),
  e => 'invalid json'
);

// Async operations
const data = await Result.fromPromise(fetch('/api'));
const processed = await Result.tryAsync(async () => {
  const res = await fetch('/api');
  return res.json();
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

## API Reference

### Option

| Function | Description |
|----------|-------------|
| `fromNullable(value)` | Convert nullable to Option |
| `fromPromise(promise)` | Promise to Option (rejection = None) |
| `map(opt, fn)` | Transform Some value |
| `flatMap(opt, fn)` | Chain Option-returning functions |
| `filter(opt, predicate)` | Keep Some if predicate passes |
| `match(opt, onSome, onNone)` | Pattern match |
| `unwrap(opt)` | Extract or throw |
| `unwrapOr(opt, default)` | Extract or default |
| `unwrapOrElse(opt, fn)` | Extract or compute default |
| `assertSome(opt, msg?)` | Assert and narrow to Some |
| `isSome(opt)` / `isNone(opt)` | Type guards |
| `filterMap(items, fn)` | Map and filter in one pass |

### Result

| Function | Description |
|----------|-------------|
| `tryCatch(fn, onError?)` | Wrap throwing function |
| `tryAsync(fn, onError?)` | Wrap async function |
| `fromPromise(promise)` | Promise to Result |
| `map(result, fn)` | Transform Ok value |
| `mapErr(result, fn)` | Transform Err value |
| `flatMap(result, fn)` | Chain Result-returning functions |
| `match(result, onOk, onErr)` | Pattern match |
| `unwrap(result)` | Extract Ok or throw |
| `unwrapOr(result, default)` | Extract Ok or default |
| `assertOk(result, msg?)` | Assert and narrow to Ok |
| `isOk(result)` / `isErr(result)` | Type guards |
| `all(results)` | Collect all Ok or first Err |
| `any(results)` | First Ok or all Errs |
| `partition(results)` | Split into [oks, errs] |
| `partitionAsync(promises)` | Async partition |

## Testing

```ts
import { expectOk, expectErr, expectSome, expectNone, extendExpect } from 'nalloc/testing';
import { expect } from 'vitest';

extendExpect(expect);

expect(result).toBeOk();
expect(result).toBeErr();
expect(option).toBeSome();
expect(option).toBeNone();

const value = expectOk(result);  // returns value or throws
```

## Devtools

```ts
import { formatResult, formatOption, inspectResult, inspectOption } from 'nalloc/devtools';

formatResult(ok(42));    // "Ok(42)"
formatOption(null);      // "None"

inspectResult(ok(42));   // { status: 'ok', value: 42 }
inspectOption(42);       // { kind: 'some', value: 42 }
```

## Comparison

| Feature | nalloc | neverthrow | fp-ts | oxide.ts |
|---------|---------|------------|-------|----------|
| Zero-alloc Option | Yes | No | No | No |
| Zero-alloc Ok | Yes | No | No | No |
| Bundle size | Tiny | Small | Large | Small |
| Learning curve | Low | Low | High | Low |
| Async support | Yes | Yes | Yes | Limited |
| Tree-shakeable | Yes | Yes | Yes | Yes |

## License

MIT

## Contributing

Contributions welcome! Open an issue or PR for ideas, bug fixes, or docs.
