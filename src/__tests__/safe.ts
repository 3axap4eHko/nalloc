import { describe, it, expect } from 'vitest';
import { ok, some, err, isSome } from '../types.js';

describe('safe constructors', () => {
  it('some validates non-nullable input', () => {
    expect(isSome(some(42))).toBe(true);
  });

  it('some throws on null/undefined', () => {
    expect(() => some(null as any)).toThrow('some() requires a non-nullable value');
    expect(() => some(undefined as any)).toThrow('some() requires a non-nullable value');
  });

  it('ok throws on Err', () => {
    const error = err('test');
    expect(() => ok(error)).toThrow('ok() cannot wrap an Err value');
  });
});
