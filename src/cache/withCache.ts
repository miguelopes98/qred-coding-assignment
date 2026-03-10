import cache from './client';

/**
 * Wraps an async function with cache-aside logic.
 *
 * On each call, the cache is checked first using the key derived by `keyFn`.
 * On a hit, the cached value is returned immediately without calling `fn`.
 * On a miss, `fn` is called, its result is stored in the cache, and then returned.
 *
 * @param keyFn - Derives the cache key from the same arguments passed to `fn`.
 * @param fn    - The async function to wrap. Called only on a cache miss.
 * @returns A wrapped function with the same signature as `fn`.
 */
export function withCache<TArgs extends unknown[], TResult>(
  keyFn: (...args: TArgs) => string,
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyFn(...args);
    const cached = cache.get<TResult>(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
}
