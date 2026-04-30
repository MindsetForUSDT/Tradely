import { getChainConfig, type BlockchainNetwork } from './chains';

interface WalletValidationResult {
  exists: boolean;
  balance?: string;
  transactionsCount?: number;
  error?: string;
}

async function checkEVMAddress(address: string, apiUrl: string): Promise<WalletValidationResult> {
  try {
    const res = await fetch(`${apiUrl}?module=account&action=balance&address=${address}&tag=latest`);
    const data = await res.json();
    return { exists: data.status === '1', balance: data.result };
  } catch {
    return { exists: false, error: 'Ошибка проверки' };
  }
}

async function checkSolanaAddress(address: string): Promise<WalletValidationResult> {
  try {
    const res = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [address, { encoding: 'base58' }] }),
    });
    const data = await res.json();
    return { exists: data.result !== null };
  } catch {
    return { exists: false, error: 'Ошибка проверки' };
  }
}

export async function verifyWallet(address: string, chain: BlockchainNetwork): Promise<WalletValidationResult> {
  const config = getChainConfig(chain);
  if (chain === 'solana') return checkSolanaAddress(address.trim());
  return checkEVMAddress(address.trim(), config.explorerApiUrl);
}