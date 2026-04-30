// ============================================================
// TradeumDiary — Проверка кошельков через Blockchain Explorer API
// ============================================================

import { getChainConfig, type BlockchainNetwork } from './chains';

interface WalletValidationResult {
  exists: boolean;
  balance?: string;
  transactionsCount?: number;
  isContract?: boolean;
  error?: string;
}

/**
 * Проверка EVM-совместимых адресов через Etherscan API
 */
async function checkEVMAddress(address: string, apiUrl: string): Promise<WalletValidationResult> {
  try {
    // Проверяем баланс
    const balanceUrl = `${apiUrl}?module=account&action=balance&address=${address}&tag=latest`;
    const balanceRes = await fetch(balanceUrl);
    const balanceData = await balanceRes.json();

    if (balanceData.status === '0' && balanceData.message === 'NOTOK') {
      return { exists: false, error: 'Адрес не найден в сети' };
    }

    // Проверяем количество транзакций
    const txUrl = `${apiUrl}?module=account&action=txlist&address=${address}&page=1&offset=1`;
    const txRes = await fetch(txUrl);
    const txData = await txRes.json();

    // Проверяем является ли адрес контрактом
    const codeUrl = `${apiUrl}?module=proxy&action=eth_getCode&address=${address}`;
    const codeRes = await fetch(codeUrl);
    const codeData = await codeRes.json();

    const isContract = codeData.result && codeData.result !== '0x';

    return {
      exists: true,
      balance: balanceData.result || '0',
      transactionsCount: Array.isArray(txData.result) ? txData.result.length : 0,
      isContract,
    };
  } catch (err) {
    return { exists: false, error: 'Ошибка проверки адреса. Попробуйте позже.' };
  }
}

/**
 * Проверка Solana адресов через RPC
 */
async function checkSolanaAddress(address: string): Promise<WalletValidationResult> {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [address, { encoding: 'base58' }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { exists: false, error: 'Адрес не найден в сети Solana' };
    }

    if (data.result === null) {
      return { exists: false, error: 'Адрес не существует или не активен' };
    }

    // Получаем баланс
    const balanceResponse = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });

    const balanceData = await balanceResponse.json();

    return {
      exists: true,
      balance: balanceData.result?.value?.toString() || '0',
      isContract: data.result.executable || false,
    };
  } catch (err) {
    return { exists: false, error: 'Ошибка проверки адреса Solana. Попробуйте позже.' };
  }
}

/**
 * Основная функция проверки кошелька
 */
export async function verifyWallet(
  address: string,
  chain: BlockchainNetwork
): Promise<WalletValidationResult> {
  const config = getChainConfig(chain);

  if (chain === 'solana') {
    return checkSolanaAddress(address.trim());
  }

  return checkEVMAddress(address.trim(), config.explorerApiUrl);
}