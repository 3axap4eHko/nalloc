import { beforeAll, describe, expect, it } from 'vitest';
import { ok, err, none, some } from '../types.js';
import {
  expectOk,
  expectErr,
  expectSome,
  expectNone,
  extendExpect,
} from '../testing.js';
import {
  formatOption,
  formatResult,
  inspectOption,
  inspectResult,
  logOption,
  logResult,
  toJSONOption,
  toJSONResult,
} from '../devtools.js';

describe('testing utilities', () => {
  beforeAll(() => {
    extendExpect(expect as any);
  });

  it('expectOk returns Ok payload or throws', () => {
    const value = expectOk(ok(5));
    expect(value).toBe(5);
    expect(() => expectOk(err('nope'))).toThrow(/Err/);
  });

  it('expectErr returns error payload or throws', () => {
    const error = expectErr(err('boom'));
    expect(error).toBe('boom');
    expect(() => expectErr(ok(1))).toThrow(/Ok/);
  });

  it('expectSome / expectNone validate Option', () => {
    const value = expectSome(some(3));
    expect(value).toBe(3);
    expect(() => expectSome(none)).toThrow(/None/);
    expect(() => expectNone(some(2))).toThrow(/Some/);
  });

  it('adds matchers to expect', () => {
    expect(ok(1)).toBeOk();
    expect(err('oops')).toBeErr();
    expect(some(4)).toBeSome();
    expect(none).toBeNone();
  });
});

describe('devtools utilities', () => {
  it('formats option', () => {
    expect(formatOption(some('x'))).toBe('Some(x)');
    expect(formatOption(none)).toBe('None');
  });

  it('formats result', () => {
    expect(formatResult(ok(7))).toBe('Ok(7)');
    expect(formatResult(err('fail'))).toBe('Err(fail)');
  });

  it('inspects option/result', () => {
    expect(inspectOption(some('x'))).toEqual({ kind: 'some', value: 'x' });
    expect(inspectOption(none)).toEqual({ kind: 'none' });
    expect(inspectResult(ok('y'))).toEqual({ status: 'ok', value: 'y' });
    expect(inspectResult(err('fail'))).toEqual({ status: 'err', error: 'fail' });
  });

  it('logs option/result via logger', () => {
    const calls: unknown[][] = [];
    const logger = (...args: unknown[]) => calls.push(args);
    logOption(some(1), logger);
    logResult(err('fail'), logger);
    expect(calls[0]).toEqual(['Some(1)']);
    expect(calls[1]).toEqual(['Err', 'fail']);
  });

  it('serialises option/result to JSON friendly data', () => {
    expect(toJSONOption(some(2))).toEqual({ kind: 'some', value: 2 });
    expect(toJSONOption(none)).toEqual({ kind: 'none' });
    expect(toJSONResult(ok(3))).toEqual({ status: 'ok', value: 3 });
    expect(toJSONResult(err('fail'))).toEqual({ status: 'err', error: 'fail' });
  });
});
