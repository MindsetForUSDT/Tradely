// lib/importAdapter.ts — ЗАГЛУШКА БЕЗ VIEM
// (полная версия требует npm install viem)

export interface UnifiedTrade {
  id: string;
  userId: string;
  walletId: string;
  chain: string;
  txHash: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  valueUsd: number;
  fee: number;
  feeToken: string;
  timestamp: string;
  blockNumber: number;
  dex: string;
  pair: string;
}

export class EVMImportAdapter {
  private chainId: number;

  constructor(chainId: number, rpcUrl?: string) {
    this.chainId = chainId;
  }

  get client() {
    return {
      chain: { name: 'ethereum' },
      getBlockNumber: async () => BigInt(20000000),
      getLogs: async () => [],
    };
  }

  async fetchSwaps(
    _address: string,
    _fromBlock: bigint,
    _toBlock: bigint
  ): Promise<UnifiedTrade[]> {
    // Mock implementation
    return [];
  }

  private parseSwapLog(log: any, userAddress: string): UnifiedTrade {
    return {
      id: '',
      userId: '',
      walletId: '',
      chain: 'ethereum',
      txHash: '',
      symbol: 'ETH/USDT',
      side: 'buy',
      amount: 0,
      price: 0,
      valueUsd: 0,
      fee: 0,
      feeToken: 'ETH',
      timestamp: new Date().toISOString(),
      blockNumber: 0,
      dex: 'Uniswap V2',
      pair: '',
    };
  }
}

export function createAdapter(chain: string, rpcUrl?: string): EVMImportAdapter {
  const chainMap: Record<string, number> = {
    ethereum: 1,
    bsc: 56,
    polygon: 137,
    arbitrum: 42161,
  };

  const chainId = chainMap[chain] || 1;
  return new EVMImportAdapter(chainId, rpcUrl);
}
