import { describe, it, expect } from 'vitest';
import { Branded, make, parse } from '../brand.js';
import { isOk, isErr } from '../types.js';

type UserId = Branded<string, 'UserId'>;
type PositiveInt = Branded<number, 'PositiveInt'>;

describe('brand', () => {
  describe('make', () => {
    it('creates branded value', () => {
      const id = make<UserId>('user-123');
      expect(id).toBe('user-123');
    });
  });

  describe('parse', () => {
    const isPositive = (v: unknown): boolean => typeof v === 'number' && v > 0;

    it('returns Ok for valid value', () => {
      const result = parse<PositiveInt>(5, isPositive);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(5);
    });

    it('returns Err for invalid value', () => {
      const result = parse<PositiveInt>(-1, isPositive, 'Must be positive');
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('Must be positive');
    });

    it('returns default error message', () => {
      const result = parse<PositiveInt>(-1, isPositive);
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('Validation failed');
    });
  });
});
