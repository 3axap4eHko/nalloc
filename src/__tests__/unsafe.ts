import { describe, expect, it } from 'vitest';
import * as unsafe from '../unsafe.js';
import { err, isErr, isNone } from '../types.js';

describe('unsafe module', () => {
  it('exports constructors', () => {
    expect(unsafe.some).toBeDefined();
    expect(unsafe.ok).toBeDefined();
  });

  it('some does not validate nullish values', () => {
    expect(() => unsafe.some(null)).not.toThrow();
    expect(() => unsafe.some(undefined)).not.toThrow();
    expect(isNone(unsafe.some(null))).toBe(true);
    expect(isNone(unsafe.some(undefined))).toBe(true);
  });

  it('ok does not validate Err payloads', () => {
    const payload = err('unsafe payload');
    expect(() => unsafe.ok(payload)).not.toThrow();
    expect(isErr(unsafe.ok(payload))).toBe(true);
  });
});
