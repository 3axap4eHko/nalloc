import { describe, it, expect } from 'vitest';
import * as index from '../index.js';

describe('index.ts exports', () => {
  it('exports exist', () => {
    expect(index.some).toBeDefined();
    expect('none' in index).toBe(true);
    expect(index.ok).toBeDefined();
    expect(index.err).toBeDefined();
    expect(index.Option).toBeDefined();
    expect(index.Result).toBeDefined();
  });
});