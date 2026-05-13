// lib/walletValidator.ts — Валидация адресов кошельков
export type Chain =
  | 'ethereum'
  | 'solana'
  | 'polygon'
  | 'bsc'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche'
  | 'base';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const EVM_CHAINS: Chain[] = [
  'ethereum',
  'polygon',
  'bsc',
  'arbitrum',
  'optimism',
  'avalanche',
  'base',
];

/**
 * Валидация EVM адреса (0x + 40 hex символов)
 */
export function validateEVMAddress(address: string): ValidationResult {
  const normalized = address.trim();

  if (!normalized) {
    return { isValid: false, error: 'Адрес не может быть пустым' };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    return {
      isValid: false,
      error: 'Невалидный EVM адрес. Ожидается формат 0x... (40 hex символов)',
    };
  }

  return { isValid: true };
}

/**
 * Валидация Solana адреса (Base58, 32-44 символа)
 */
export function validateSolanaAddress(address: string): ValidationResult {
  const normalized = address.trim();

  if (!normalized) {
    return { isValid: false, error: 'Адрес не может быть пустым' };
  }

  // Solana адреса используют Base58 (без 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  if (!base58Regex.test(normalized)) {
    return {
      isValid: false,
      error: 'Невалидный Solana адрес. Ожидается 32-44 символа Base58',
    };
  }

  return { isValid: true };
}

/**
 * Валидация адреса для указанной сети
 */
export function validateAddress(address: string, chain: Chain): ValidationResult {
  if (EVM_CHAINS.includes(chain)) {
    return validateEVMAddress(address);
  } else if (chain === 'solana') {
    return validateSolanaAddress(address);
  }

  return { isValid: false, error: 'Неподдерживаемая сеть' };
}

/**
 * Проверка, является ли адрес дубликатом для пользователя
 */
export async function checkDuplicateAddress(
  userId: string,
  address: string,
  chain: Chain
): Promise<ValidationResult> {
  try {
    const { supabase } = await import('./supabase');

    const { data, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('address', address.toLowerCase())
      .eq('chain', chain)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { isValid: false, error: 'Ошибка проверки дубликатов' };
    }

    if (data) {
      return { isValid: false, error: 'Этот кошелек уже добавлен' };
    }

    return { isValid: true };
  } catch {
    // При ошибке сети пропускаем проверку дубликатов
    return { isValid: true };
  }
}

/**
 * Нормализация адреса (приведение к нижнему регистру для EVM)
 */
export function normalizeAddress(address: string, chain: Chain): string {
  const trimmed = address.trim();

  if (EVM_CHAINS.includes(chain)) {
    return trimmed.toLowerCase();
  }

  return trimmed;
}

/**
 * Форматирование адреса для отображения
 */
export function formatAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
