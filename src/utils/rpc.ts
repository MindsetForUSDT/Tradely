interface RpcConfig {
  url: string;
  weight: number;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

class RpcManager {
  private providers: RpcConfig[] = [];
  private currentIndex = 0;

  constructor() {
    this.loadProviders();
  }

  private loadProviders(): void {
    try {
      const providersJson = import.meta.env.VITE_RPC_PROVIDERS;
      if (providersJson) {
        const urls: string[] = JSON.parse(providersJson);
        this.providers = urls.map((url: string) => ({ url, weight: 1 }));
      }
    } catch {
      console.warn('[RPC] Failed to parse VITE_RPC_PROVIDERS, using fallback');
    }

    if (this.providers.length === 0) {
      this.providers = [
        { url: 'https://eth.llamarpc.com', weight: 1 },
        { url: 'https://rpc.ankr.com/eth', weight: 1 },
        { url: 'https://ethereum.publicnode.com', weight: 1 },
      ];
    }
  }

  async fetchWithRetry(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchFn: (rpcUrl: string) => Promise<any>,
    options: RetryOptions = {}
  ): Promise<any> {
    const { maxRetries = 3, baseDelayMs = 500, maxDelayMs = 5000 } = options;

    if (this.providers.length === 0) {
      throw new Error('[RPC] No providers configured');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const providerIndex = (this.currentIndex + attempt) % this.providers.length;
      const provider = this.providers[providerIndex];

      try {
        const result = await fetchFn(provider.url);
        this.currentIndex = providerIndex;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`[RPC] All providers failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  getProviderUrl(): string {
    return this.providers[this.currentIndex]?.url || this.providers[0].url;
  }

  rotateProvider(): void {
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;
  }

  getProviderCount(): number {
    return this.providers.length;
  }
}

export const rpcManager = new RpcManager();