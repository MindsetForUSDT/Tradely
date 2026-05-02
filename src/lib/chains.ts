export type BlockchainNetwork = 'ethereum' | 'solana' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism';

interface ChainConfig {
  value: BlockchainNetwork;
  label: string;
  icon: string;
  explorerUrl: string;
  addressPattern: RegExp;
  addressExample: string;
}

export const CHAINS: ChainConfig[] = [
  {
    value: 'ethereum',
    label: 'Ethereum',
    icon: '⟠',
    explorerUrl: 'https://etherscan.io/address',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  },
  {
    value: 'solana',
    label: 'Solana',
    icon: '◎',
    explorerUrl: 'https://solscan.io/account',
    addressPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    addressExample: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
  },
  {
    value: 'polygon',
    label: 'Polygon',
    icon: '⬡',
    explorerUrl: 'https://polygonscan.com/address',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  },
  {
    value: 'bsc',
    label: 'BSC',
    icon: '🔶',
    explorerUrl: 'https://bscscan.com/address',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  },
  {
    value: 'arbitrum',
    label: 'Arbitrum',
    icon: '🔷',
    explorerUrl: 'https://arbiscan.io/address',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  },
  {
    value: 'optimism',
    label: 'Optimism',
    icon: '🔴',
    explorerUrl: 'https://optimistic.etherscan.io/address',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  },
];

export function getChainConfig(chain: BlockchainNetwork): ChainConfig {
  const config = CHAINS.find((c) => c.value === chain);
  if (!config) throw new Error('Unknown chain: ' + chain);
  return config;
}

export function validateAddress(
  address: string,
  chain: BlockchainNetwork
): { valid: boolean; error?: string } {
  if (!address || address.trim().length === 0) {
    return { valid: false, error: 'Empty address' };
  }

  const config = getChainConfig(chain);

  if (!config.addressPattern.test(address.trim())) {
    return { valid: false, error: 'Invalid format. Example: ' + config.addressExample };
  }

  return { valid: true };
}
