import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import plugin, { rules, mustUse, noUnwrap } from '../eslint.js';

describe('eslint plugin', () => {
  it('exposes both rules with create + meta', () => {
    for (const name of ['must-use', 'no-unwrap'] as const) {
      expect(typeof rules[name].create).toBe('function');
      expect(rules[name].meta.messages).toBeTypeOf('object');
    }
  });

  it('wires the recommended config', () => {
    expect(plugin.meta.name).toBe('nalloc');
    const recommended = plugin.configs.recommended as { plugins: Record<string, unknown>; rules: Record<string, string> };
    expect(recommended.plugins.nalloc).toBe(plugin);
    expect(recommended.rules['nalloc/must-use']).toBe('error');
    expect(recommended.rules['nalloc/no-unwrap']).toBe('error');
  });
});

const typedTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: { allowDefaultProject: ['*.ts*'] },
      tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
    },
  },
});

typedTester.run('must-use', mustUse, {
  valid: [
    `type Result<T, E> = readonly [T] | { error: E }; declare function f(): Result<number, string>; const r = f();`,
    `declare function g(): number; g();`,
    `type Foo<T> = readonly [T]; declare function f(): Foo<number>; f();`,
    {
      code: `type Result<T, E> = readonly [T] | { error: E }; declare function f(): Result<number, string>; f();`,
      options: [{ typeNames: ['Option'] }],
    },
  ],
  invalid: [
    {
      code: `type Result<T, E> = readonly [T] | { error: E }; declare function f(): Result<number, string>; f();`,
      errors: [{ messageId: 'mustUse', data: { name: 'Result' } }],
    },
    {
      code: `type Option<T> = T | undefined; declare function f(): Option<number>; f();`,
      errors: [{ messageId: 'mustUse', data: { name: 'Option' } }],
    },
    {
      code: `type Result<T, E> = readonly [T] | { error: E }; declare function f(): Promise<Result<number, string>>; async function run() { await f(); }`,
      errors: [{ messageId: 'mustUse', data: { name: 'Result' } }],
    },
    {
      code: `type Mine<T> = readonly [T]; declare function f(): Mine<number>; f();`,
      options: [{ typeNames: ['Mine'] }],
      errors: [{ messageId: 'mustUse', data: { name: 'Mine' } }],
    },
  ],
});

const tester = new RuleTester({ languageOptions: { parserOptions: { sourceType: 'module' } } });

tester.run('no-unwrap', noUnwrap, {
  valid: [
    `import { unwrap } from 'other-lib'; declare const r: unknown; unwrap(r);`,
    `import { Result } from 'nalloc'; declare const r: unknown; Result.unwrapOr(r, 0);`,
    `const Result = { unwrap(x: unknown) { return x; } }; Result.unwrap(1);`,
    `function unwrap(x: unknown) { return x; } unwrap(1);`,
  ],
  invalid: [
    {
      code: `import { unwrap } from 'nalloc'; declare const r: unknown; unwrap(r);`,
      errors: [{ messageId: 'noUnwrap', data: { name: 'unwrap' } }],
    },
    {
      code: `import { Result } from 'nalloc'; declare const r: unknown; Result.unwrap(r);`,
      errors: [{ messageId: 'noUnwrap', data: { name: 'unwrap' } }],
    },
    {
      code: `import { Option } from 'nalloc'; declare const o: unknown; Option.expect(o, 'm');`,
      errors: [{ messageId: 'noUnwrap', data: { name: 'expect' } }],
    },
    {
      code: `import { Result } from 'nalloc'; declare const r: unknown; Result.unwrapErr(r);`,
      errors: [{ messageId: 'noUnwrap', data: { name: 'unwrapErr' } }],
    },
    {
      code: `import { unwrap as uw } from 'nalloc'; declare const r: unknown; uw(r);`,
      errors: [{ messageId: 'noUnwrap', data: { name: 'unwrap' } }],
    },
    {
      code: `import { unwrap } from '@me/x'; declare const r: unknown; unwrap(r);`,
      options: [{ modules: ['@me/x'] }],
      errors: [{ messageId: 'noUnwrap', data: { name: 'unwrap' } }],
    },
  ],
});
