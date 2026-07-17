import binance from '@web3icons/core/svgs/exchanges/branded/binance.svg.js';
import bybit from '@web3icons/core/svgs/exchanges/branded/bybit.svg.js';
import coinbase from '@web3icons/core/svgs/exchanges/branded/coinbase.svg.js';
import gateio from '@web3icons/core/svgs/exchanges/branded/gate-io.svg.js';
import kraken from '@web3icons/core/svgs/exchanges/branded/kraken.svg.js';
import kucoin from '@web3icons/core/svgs/exchanges/branded/kucoin.svg.js';
import okx from '@web3icons/core/svgs/exchanges/branded/okx.svg.js';
import metamask from '@web3icons/core/svgs/wallets/branded/metamask.svg.js';
import trust from '@web3icons/core/svgs/wallets/branded/trust.svg.js';
import walletconnect from '@web3icons/core/svgs/wallets/branded/wallet-connect.svg.js';

const brandMarks = {
  binance,
  bybit,
  okx,
  coinbase,
  metamask,
  kucoin,
  kraken,
  gateio,
  trustwallet: trust,
  trust,
  walletconnect,
} as const;

export type SourceBrand = keyof typeof brandMarks;

export function resolveSourceBrand(value?: string): SourceBrand {
  const normalized = (value || '').toLowerCase().replace(/[\s_-]/g, '');
  if (normalized.includes('binance') || normalized.includes('bsc')) return 'binance';
  if (normalized.includes('bybit')) return 'bybit';
  if (normalized.includes('okx')) return 'okx';
  if (normalized.includes('coinbase')) return 'coinbase';
  if (normalized.includes('metamask')) return 'metamask';
  if (normalized.includes('kucoin')) return 'kucoin';
  if (normalized.includes('kraken')) return 'kraken';
  if (normalized.includes('gateio') || normalized.includes('gate.io')) return 'gateio';
  if (normalized.includes('trust')) return 'trustwallet';
  if (normalized.includes('walletconnect')) return 'walletconnect';
  return 'binance';
}

export function SourceLogo({
  brand,
  size = 24,
  className = '',
}: {
  brand: SourceBrand | string;
  size?: number;
  className?: string;
}) {
  const resolved = brand in brandMarks ? (brand as SourceBrand) : resolveSourceBrand(brand);

  return (
    <span
      className={`source-logo ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: brandMarks[resolved] }}
    />
  );
}
