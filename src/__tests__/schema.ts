import { describe, it, expect } from 'vitest';
import { fromSchema, wrapSchema } from '../schema.js';
import type { StandardSchema } from '../schema.js';
import { isOk, isErr } from '../types.js';

describe('Schema', () => {
  const validSchema: StandardSchema<string> = {
    '~standard': {
      validate: (value) => (typeof value === 'string' ? { value } : { issues: [{ message: 'Expected string' }] }),
    },
  };

  const asyncSchema: StandardSchema<number> = {
    '~standard': {
      validate: (value) => Promise.resolve(typeof value === 'number' ? { value } : { issues: [{ message: 'Expected number' }] }),
    },
  };

  describe('fromSchema', () => {
    it('returns Ok for valid sync schema', () => {
      const result = fromSchema(validSchema, 'hello');
      expect(isOk(result)).toBe(true);
      expect(result).toBe('hello');
    });

    it('returns Err with issues for invalid sync schema', () => {
      const result = fromSchema(validSchema, 42);
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toEqual([{ message: 'Expected string' }]);
    });

    it('returns Ok for valid async schema', async () => {
      const result = await fromSchema(asyncSchema, 42);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(42);
    });

    it('returns Err for invalid async schema', async () => {
      const result = await fromSchema(asyncSchema, 'hello');
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toEqual([{ message: 'Expected number' }]);
    });
  });

  describe('wrapSchema', () => {
    it('creates a reusable sync validator', () => {
      const parse = wrapSchema(validSchema);
      expect(parse('hello')).toBe('hello');
      expect(isErr(parse(42))).toBe(true);
    });

    it('creates a reusable async validator', async () => {
      const parse = wrapSchema(asyncSchema);
      expect(await parse(42)).toBe(42);
      expect(isErr(await parse('hello'))).toBe(true);
    });
  });
});
