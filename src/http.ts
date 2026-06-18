import { err as ERR } from './types.js';
import type { Ok, Result } from './types.js';

/**
 * Converts a fetch Response into a Result, treating a non-ok status as an Err.
 * Native fetch only rejects on transport errors, never on 4xx/5xx; this closes that gap.
 * The failed Response itself is the error - read its status, headers, or body from it.
 * @param response - The Response to inspect
 * @returns Ok(response) when response.ok, Err(response) otherwise
 * @example
 * import { Result } from 'nalloc';
 * import { fromResponse } from 'nalloc/http';
 * const res = Result.flatMap(await Result.fromPromise(fetch(url)), fromResponse);
 */
export function fromResponse(response: Response): Result<Response, Response> {
  return response.ok ? (response as Ok<Response>) : ERR(response);
}

/**
 * Runs fetch and forces every failure mode into the error channel.
 * Ok means the request connected AND returned a 2xx status; a non-2xx Response
 * becomes Err(response), and a transport failure becomes Err with the thrown
 * value (per spec: TypeError on network/CORS errors, DOMException on abort/timeout).
 * The body is never read - it stays available to the caller.
 * @param input - The fetch input (URL or Request)
 * @param init - Optional fetch init
 * @returns Promise of Ok(response) for 2xx, Err otherwise
 * @example
 * import { fromFetch } from 'nalloc/http';
 * const res = await fromFetch(url);
 * // Ok(Response)      -> connected and 2xx
 * // Err(Response)     -> reached the server, non-2xx
 * // Err(TypeError)    -> network/CORS failure
 * // Err(DOMException) -> aborted or timed out
 */
export async function fromFetch(input: string | URL | Request, init?: RequestInit): Promise<Result<Response, Response | TypeError | DOMException>> {
  try {
    return fromResponse(await fetch(input, init));
  } catch (error) {
    return ERR(error as TypeError | DOMException);
  }
}
