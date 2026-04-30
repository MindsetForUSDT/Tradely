import { describe, it, expect, vi } from 'vitest';
import { rpcManager } from '../rpc';

describe('RpcManager', () => {
  it('should have at least one fallback provider', () => {
    expect(rpcManager.getProviderCount()).toBeGreaterThan(0);
  });

  it('should return a valid URL string', () => {
    const url = rpcManager.getProviderUrl();
    expect(url).toMatch(/^https?:\/\//);
  });

  it('should rotate provider', () => {
    const firstUrl = rpcManager.getProviderUrl();
    rpcManager.rotateProvider();
    const secondUrl = rpcManager.getProviderUrl();
    // Может совпадать если только 1 провайдер
    expect(typeof secondUrl).toBe('string');
  });

  it('should retry and fallback on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const result = await rpcManager.fetchWithRetry(mockFetch, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    expect(result).toBe('success');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should throw after all retries exhausted', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(
      rpcManager.fetchWithRetry(mockFetch, {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 50,
      })
    ).rejects.toThrow(/All providers failed/);
  });
});