import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

// ============================================
// СТИЛИ И ФОРМАТИРОВАНИЕ
// ============================================

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function pnlClass(value: number): string {
  if (value > 0) return 'text-accent-green';
  if (value < 0) return 'text-accent-red';
  return 'text-text-secondary';
}

// ============================================
// ФОРМАТИРОВАНИЕ ДАННЫХ
// ============================================

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatUSDPrice(value: number): string {
  const absoluteValue = Math.abs(value);
  const fractionDigits =
    absoluteValue === 0
      ? 2
      : absoluteValue >= 100
        ? 2
        : absoluteValue >= 1
          ? 4
          : absoluteValue >= 0.01
            ? 6
            : absoluteValue >= 0.0001
              ? 8
              : 10;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return 'Сегодня';
  if (isYesterday(d)) return 'Вчера';
  return format(d, 'd MMMM yyyy', { locale: ru });
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// ============================================
// ВАЛИДАЦИЯ АДРЕСОВ
// ============================================

/**
 * Валидация адреса кошелька по сети
 */
export function validateWalletAddress(
  address: string,
  network: string
): { valid: boolean; error?: string } {
  if (!address?.trim()) {
    return { valid: false, error: 'Введите адрес' };
  }

  const trimmed = address.trim();

  // EVM-совместимые сети
  const evmNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'base'];
  if (evmNetworks.includes(network)) {
    return isValidEVMAddress(trimmed)
      ? { valid: true }
      : { valid: false, error: 'Неверный формат EVM адреса (ожидается 0x...)' };
  }

  // Solana
  if (network === 'solana') {
    return isValidSolanaAddress(trimmed)
      ? { valid: true }
      : { valid: false, error: 'Неверный формат Solana адреса (base58, 32-44 символа)' };
  }

  return { valid: false, error: `Неподдерживаемая сеть: ${network}` };
}

/**
 * Проверка EVM-адреса (0x + 40 hex символов)
 */
export function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Проверка Solana-адреса (base58, 32-44 символа)
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana адреса в base58: от 32 до 44 символов, исключая I, O, l, 0
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// ============================================
// БЕЗОПАСНОСТЬ
// ============================================

/**
 * Безопасное экранирование HTML (для экспорта и отображения)
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Валидация API ключа (базовая проверка формата)
 */
export function isValidApiKey(key: string, provider: string): boolean {
  const patterns: Record<string, RegExp> = {
    binance: /^[a-zA-Z0-9]{64}$/,
    bybit: /^[a-zA-Z0-9]{18,}$/,
    okx: /^[a-zA-Z0-9-]{32,}$/,
    kucoin: /^[a-f0-9]{24}$/,
  };

  const pattern = patterns[provider];
  if (!pattern) return key.length >= 16;
  return pattern.test(key);
}
