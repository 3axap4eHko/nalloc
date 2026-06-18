import { describe, it, expect, vi, afterEach } from 'vitest';
import { fromResponse, fromFetch } from '../http.js';
import { isOk, isErr } from '../types.js';

describe('http', () => {
  describe('fromResponse', () => {
    it('returns Ok carrying the response for a 2xx status', () => {
      const response = new Response('ok', { status: 200 });
      const result = fromResponse(response);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(response);
    });

    it('returns Err carrying the response for a non-2xx status', () => {
      const response = new Response('nope', { status: 404 });
      const result = fromResponse(response);
      expect(isErr(result)).toBe(true);
      expect((result as { error: Response }).error).toBe(response);
    });
  });

  describe('fromFetch', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns Ok carrying the response for a 2xx status', async () => {
      const response = new Response('ok', { status: 200 });
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal('fetch', fetchMock);
      const init = { method: 'POST' };
      const result = await fromFetch('https://example.test', init);
      expect(isOk(result)).toBe(true);
      expect(result).toBe(response);
      expect(fetchMock).toHaveBeenCalledWith('https://example.test', init);
    });

    it('returns Err carrying the response for a non-2xx status', async () => {
      const response = new Response('nope', { status: 500 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      const result = await fromFetch('https://example.test');
      expect(isErr(result)).toBe(true);
      expect((result as { error: Response }).error).toBe(response);
    });

    it('returns Err carrying the thrown value on transport failure', async () => {
      const failure = new TypeError('fetch failed');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));
      const result = await fromFetch('https://example.test');
      expect(isErr(result)).toBe(true);
      expect((result as { error: unknown }).error).toBe(failure);
    });

    it('returns Err with an AbortError DOMException for a pre-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();
      const result = await fromFetch('http://127.0.0.1:1', { signal: controller.signal });
      expect(isErr(result)).toBe(true);
      const error = (result as { error: unknown }).error;
      expect(error).toBeInstanceOf(DOMException);
      expect((error as DOMException).name).toBe('AbortError');
    });
  });
});
