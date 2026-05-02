import type { BlockchainNetwork } from './chains';

interface WalletValidationResult {
  exists: boolean;
  balance?: string;
  transactionsCount?: number;
  error?: string;
}

async function checkEVMAddress(address: string, apiUrl: string): Promise<WalletValidationResult> {
  try {
    const res = await fetch(
      `${apiUrl}?module=account&action=balance&address=${address}&tag=latest`
    );
    const data = await res.json();
    return { exists: data.status === '1', balance: data.result };
  } catch {
    return { exists: false, error: 'Wallet verification error' };
  }
}

export async function verifyWallet(
  address: string,
  _chain: BlockchainNetwork
): Promise<WalletValidationResult> {
  const apiUrl = 'https://api.etherscan.io/api';
  return checkEVMAddress(address.trim(), apiUrl);
}
