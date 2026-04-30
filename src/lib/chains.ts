export type BlockchainNetwork = 'ethereum' | 'solana' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism';

export const CHAINS = [
  { value: 'ethereum' as BlockchainNetwork, label: 'Ethereum', icon: '⟠', explorerApiUrl: 'https://api.etherscan.io/api', explorerUrl: 'https://etherscan.io/address', addressPattern: /^0x[a-fA-F0-9]{40}$/, addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2', tokenSymbol: 'ETH' },
  { value: 'solana' as BlockchainNetwork, label: 'Solana', icon: '◎', explorerApiUrl: 'https://api.mainnet-beta.solana.com', explorerUrl: 'https://solscan.io/account', addressPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, addressExample: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', tokenSymbol: 'SOL' },
  { value: 'polygon' as BlockchainNetwork, label: 'Polygon', icon: '⬡', explorerApiUrl: 'https://api.polygonscan.com/api', explorerUrl: 'https://polygonscan.com/address', addressPattern: /^0x[a-fA-F0-9]{40}$/, addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2', tokenSymbol: 'MATIC' },
  { value: 'bsc' as BlockchainNetwork, label: 'BSC', icon: '🔶', explorerApiUrl: 'https://api.bscscan.com/api', explorerUrl: 'https://bscscan.com/address', addressPattern: /^0x[a-fA-F0-9]{40}$/, addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2', tokenSymbol: 'BNB' },
  { value: 'arbitrum' as BlockchainNetwork, label: 'Arbitrum', icon: '🔷', explorerApiUrl: 'https://api.arbiscan.io/api', explorerUrl: 'https://arbiscan.io/address', addressPattern: /^0x[a-fA-F0-9]{40}$/, addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2', tokenSymbol: 'ETH' },
  { value: 'optimism' as BlockchainNetwork, label: 'Optimism', icon: '🔴', explorerApiUrl: 'https://api-optimistic.etherscan.io/api', explorerUrl: 'https://optimistic.etherscan.io/address', addressPattern: /^0x[a-fA-F0-9]{40}$/, addressExample: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2', tokenSymbol: 'ETH' },
];

export function getChainConfig(chain: BlockchainNetwork) {
  return CHAINS.find(c => c.value === chain)!;
}

export function validateAddress(address: string, chain: BlockchainNetwork): { valid: boolean; error?: string } {
  const config = getChainConfig(chain);
  if (!address || address.trim().length === 0) return { valid: false, error: 'Введите адрес' };
  if (!config.addressPattern.test(address.trim())) return { valid: false, error: `Неверный формат. Пример: ${config.addressExample}` };
  return { valid: true };
}