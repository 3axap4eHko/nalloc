import { describe, it, expect } from 'vitest';
import * as safe from '../safe.js';
import { err } from '../types.js';

describe('nalloc/safe exports', () => {
  it('exports match nalloc', () => {
    expect(safe.some).toBeDefined();
    expect('none' in safe).toBe(true);
    expect(safe.ok).toBeDefined();
    expect(safe.err).toBeDefined();
    expect(safe.Option).toBeDefined();
    expect(safe.Result).toBeDefined();
  });

  it('safe some throws on null/undefined', () => {
    expect(() => safe.some(null as any)).toThrow();
    expect(() => safe.some(undefined as any)).toThrow();
  });

  it('safe ok throws on Err', () => {
    const error = err('test');
    expect(() => safe.ok(error)).toThrow();
  });
});
