import { describe, it, expect } from 'vitest';
import * as unsafe from '../unsafe.js';
import { err } from '../types.js';

describe('nalloc/unsafe exports', () => {
  it('exports match nalloc', () => {
    expect(unsafe.some).toBeDefined();
    expect('none' in unsafe).toBe(true);
    expect(unsafe.ok).toBeDefined();
    expect(unsafe.err).toBeDefined();
    expect(unsafe.Option).toBeDefined();
    expect(unsafe.Result).toBeDefined();
  });

  it('unsafe some does not throw on null/undefined', () => {
    expect(() => unsafe.some(null)).not.toThrow();
    expect(() => unsafe.some(undefined)).not.toThrow();
  });

  it('unsafe ok does not throw on Err', () => {
    const error = err('test');
    expect(() => unsafe.ok(error)).not.toThrow();
  });
});
