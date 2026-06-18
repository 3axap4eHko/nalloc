import { describe, it, expect } from 'vitest';
import { migrateSource, renderReport } from '../codemod.js';

function migrate(source: string): ReturnType<typeof migrateSource> {
  return migrateSource(source, 'fixture.ts');
}

describe('codemod', () => {
  it('leaves files without neverthrow imports untouched', () => {
    const source = `const xs = [1, 2].map(x => x * 2);\n`;
    const result = migrate(source);
    expect(result.changed).toBe(false);
    expect(result.output).toBe(source);
    expect(result.skipped).toEqual([]);
  });

  it('rewrites the import and converts provenant single-method calls', () => {
    const source = [
      `import { ok, err } from 'neverthrow';`,
      `const r = ok(1);`,
      `const d = r.map(x => x + 1);`,
      `const e = d.andThen(x => x > 0 ? ok(x) : err('neg'));`,
    ].join('\n');
    const result = migrate(source);
    expect(result.changed).toBe(true);
    expect(result.output).toContain(`import { ok, err, Result } from 'nalloc';`);
    expect(result.output).toContain(`const d = Result.map(r, x => x + 1);`);
    expect(result.output).toContain(`const e = Result.flatMap(d, x => x > 0 ? ok(x) : err('neg'));`);
    expect(result.output).not.toContain('neverthrow');
    expect(result.skipped).toEqual([]);
  });

  it('preserves import aliases', () => {
    const source = [`import { ok as okay } from 'neverthrow';`, `const r = okay(1);`, `const d = r.map(x => x + 1);`].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`import { ok as okay, Result } from 'nalloc';`);
    expect(result.output).toContain(`Result.map(r, x => x + 1)`);
  });

  it('folds chains of two or more methods into pipe', () => {
    const source = [`import { ok } from 'neverthrow';`, `const out = ok(1).map(a => a + 1).mapErr(String).unwrapOr(0);`].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`import { ok, Result, pipe } from 'nalloc';`);
    expect(result.output).toContain(
      `const out = pipe(ok(1), ($r) => Result.map($r, a => a + 1), ($r) => Result.mapErr($r, String), ($r) => Result.unwrapOr($r, 0));`,
    );
  });

  it('does not touch bare .map calls without provenance', () => {
    const source = [
      `import { ok } from 'neverthrow';`,
      `const xs = [1, 2].map(x => x * 2);`,
      `declare const unknownValue: { map(fn: (x: number) => number): number[] };`,
      `unknownValue.map(x => x);`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`[1, 2].map(x => x * 2)`);
    expect(result.output).toContain(`unknownValue.map(x => x)`);
  });

  it('converts neverthrow-exclusive methods without provenance', () => {
    const source = [`import { ok } from 'neverthrow';`, `declare const foreign: any;`, `const r = foreign.andThen((x: number) => ok(x));`].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`Result.flatMap(foreign, (x: number) => ok(x))`);
  });

  it('uses type annotations from neverthrow imports as provenance and renames the Result type', () => {
    const source = [
      `import { ok, Result } from 'neverthrow';`,
      `const t: Result<number, string> = ok(2);`,
      `const u = t.map(x => x * 2);`,
      `function f(input: Result<number, string>): Result<number, string> { return input.mapErr(e => e); }`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`import { ok, Result, type ResultType } from 'nalloc';`);
    expect(result.output).toContain(`const t: ResultType<number, string> = ok(2);`);
    expect(result.output).toContain(`Result.map(t, x => x * 2)`);
    expect(result.output).toContain(`function f(input: ResultType<number, string>): ResultType<number, string> { return Result.mapErr(input, e => e); }`);
  });

  it('converts fromThrowable to Result.wrap and tracks wrapped functions as provenance', () => {
    const source = [
      `import { fromThrowable } from 'neverthrow';`,
      `const safeParse = fromThrowable(JSON.parse);`,
      `const p = safeParse('{}');`,
      `const q = p.map(v => v);`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`const safeParse = Result.wrap(JSON.parse);`);
    expect(result.output).toContain(`Result.map(p, v => v)`);
    expect(result.output).not.toContain('neverthrow');
  });

  it('converts combine and combineWithAllErrors including Result statics', () => {
    const source = [
      `import { ok, combine, Result } from 'neverthrow';`,
      `const a = combine([ok(1), ok(2)]);`,
      `const b = Result.combineWithAllErrors([ok(1)]);`,
      `const c = Result.fromThrowable(JSON.parse);`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`const a = Result.all([ok(1), ok(2)]);`);
    expect(result.output).toContain(`const b = Result.collectAll([ok(1)]);`);
    expect(result.output).toContain(`const c = Result.wrap(JSON.parse);`);
  });

  it('converts directly-awaited fromPromise and treats its result as migrated', () => {
    const source = [
      `import { fromPromise } from 'neverthrow';`,
      `async function run(p: Promise<number>) {`,
      `  const r = await fromPromise(p, e => String(e));`,
      `  return r.map(x => x + 1);`,
      `}`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`await Result.fromPromise(p, e => String(e))`);
    expect(result.output).toContain(`Result.map(r, x => x + 1)`);
    expect(result.skipped).toEqual([]);
    expect(result.output).not.toContain('neverthrow');
  });

  it('reports chained fromPromise as result-async and keeps the neverthrow import', () => {
    const source = [`import { fromPromise } from 'neverthrow';`, `const ra = fromPromise(Promise.resolve(1), e => e).map(x => x);`].join('\n');
    const result = migrate(source);
    expect(result.skipped.map((s) => s.reason)).toContain('result-async');
    expect(result.output).toContain(`import { fromPromise } from 'neverthrow';`);
    expect(result.output).toContain(`fromPromise(Promise.resolve(1), e => e).map(x => x)`);
  });

  it('reports ResultAsync values and never converts methods on them', () => {
    const source = [
      `import { okAsync } from 'neverthrow';`,
      `const ra = okAsync(1);`,
      `const rb = ra.map(x => x + 1);`,
      `async function f() { const r = await ra; return r.mapErr(e => e); }`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`const rb = ra.map(x => x + 1);`);
    expect(result.output).toContain(`return r.mapErr(e => e);`);
    expect(result.output).toContain(`import { okAsync } from 'neverthrow';`);
    expect(result.skipped.some((s) => s.reason === 'result-async')).toBe(true);
  });

  it('reports safeTry for manual gen migration', () => {
    const source = [`import { ok, safeTry } from 'neverthrow';`, `const r = safeTry(function* () { return ok(1); });`].join('\n');
    const result = migrate(source);
    expect(result.skipped.map((s) => s.reason)).toContain('safe-try');
    expect(result.output).toContain(`import { safeTry } from 'neverthrow';`);
  });

  it('refuses whole chains containing unsupported methods', () => {
    const source = [`import { ok } from 'neverthrow';`, `const r = ok(1).andThrough(x => ok(x)).map(x => x + 1);`].join('\n');
    const result = migrate(source);
    expect(result.skipped.map((s) => s.reason)).toContain('unsupported');
    expect(result.output).toContain(`ok(1).andThrough(x => ok(x)).map(x => x + 1)`);
  });

  it('skips namespace imports entirely', () => {
    const source = [`import * as nt from 'neverthrow';`, `const r = nt.ok(1);`].join('\n');
    const result = migrate(source);
    expect(result.changed).toBe(false);
    expect(result.skipped.map((s) => s.reason)).toEqual(['namespace-import']);
  });

  it('converts nested chains inside chain arguments', () => {
    const source = [`import { ok, err } from 'neverthrow';`, `const inner = ok(2);`, `const r = ok(1).andThen(x => inner.mapErr(e => e)).map(x => x);`].join(
      '\n',
    );
    const result = migrate(source);
    expect(result.output).toContain(`pipe(ok(1), ($r) => Result.flatMap($r, x => Result.mapErr(inner, e => e)), ($r) => Result.map($r, x => x))`);
  });

  it('converts match and unwrap accessors', () => {
    const source = [
      `import { ok } from 'neverthrow';`,
      `const r = ok(1);`,
      `const m = r.match(x => x, e => 0);`,
      `const v = r._unsafeUnwrap();`,
      `const o = r.isOk();`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`const m = Result.match(r, x => x, e => 0);`);
    expect(result.output).toContain(`const v = Result.unwrap(r);`);
    expect(result.output).toContain(`const o = Result.isOk(r);`);
  });

  it('drops provenance for conflicting bindings', () => {
    const source = [
      `import { ok } from 'neverthrow';`,
      `function a() { const v = ok(1); return v; }`,
      `function b() { const v = [1, 2]; return v.map(x => x); }`,
    ].join('\n');
    const result = migrate(source);
    expect(result.output).toContain(`return v.map(x => x);`);
  });

  it('renders a grouped markdown report', () => {
    const report = renderReport({
      filesChanged: 1,
      converted: 3,
      skipped: [
        { file: 'a.ts', line: 2, reason: 'result-async', text: 'okAsync(1)' },
        { file: 'a.ts', line: 5, reason: 'safe-try', text: 'safeTry(fn)' },
      ],
    });
    expect(report).toContain('# nalloc migration report');
    expect(report).toContain('Files changed: 1. Sites converted: 3. Sites needing manual review: 2.');
    expect(report).toContain('## a.ts');
    expect(report).toContain('- line 2 [result-async]: `okAsync(1)`');
  });
});
