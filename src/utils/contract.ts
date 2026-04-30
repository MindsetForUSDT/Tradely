import { rpcManager } from './rpc';

interface ContractConfig {
  address: string;
  abi: ReadonlyArray<unknown>;
}

export function getContractConfig(): ContractConfig {
  const contractAddress =
    import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

  // Minimal ABI (заглушка)
  const abi = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'trader', type: 'address' },
        { indexed: false, name: 'tradeId', type: 'bytes32' },
        { indexed: false, name: 'timestamp', type: 'uint256' },
      ],
      name: 'TradeRecorded',
      type: 'event',
    },
    {
      inputs: [
        { name: 'tradeId', type: 'bytes32' },
        { name: 'symbol', type: 'string' },
        { name: 'side', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'price', type: 'uint256' },
      ],
      name: 'recordTrade',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  return { address: contractAddress, abi };
}

export function getReadOnlyProvider() {
  return rpcManager;
}