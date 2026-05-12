/* ✅ Кастомная система иконок TradeumDiary */
/* Использование: <Icon name="wallet" /> */
/* Цвет наследуется от текущего color, размер от font-size */

interface IconProps {
  name:
    | 'wallet'
    | 'chart'
    | 'trades'
    | 'wallet-add'
    | 'metamask'
    | 'trustwallet'
    | 'binance'
    | 'bybit'
    | 'okx'
    | 'manual'
    | 'shield'
    | 'journal'
    | 'risk'
    | 'pro'
    | 'alert'
    | 'tax'
    | 'export-csv'
    | 'export-excel'
    | 'export-pdf'
    | 'close'
    | 'menu'
    | 'back'
    | 'info'
    | 'edit'
    | 'delete'
    | 'star'
    | 'calendar'
    | 'import'
    | 'chevron-down'
    | 'search';
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className = '' }: IconProps) {
  const paths: Record<string, JSX.Element> = {
    wallet: (
      <path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4h-4z" />
    ),
    chart: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    trades: (
      <>
        <path d="M16 3h5v5M8 3H3v5M16 21h5v-5M8 21H3v-5" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </>
    ),
    'wallet-add': (
      <>
        <path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4h-4z" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </>
    ),
    metamask: (
      <path d="M12 2l4 3-1 4-3-1-3 1-1-4 4-3zM5 10l2 5-3 2 1-7zM19 10l-3 7 3 2-1-7zM8 17l1 5h6l1-5-4-2-4 2z" />
    ),
    trustwallet: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M8 12l4 4 4-4M12 8v8" />
      </>
    ),
    binance: <circle cx="12" cy="12" r="9" />,
    bybit: <rect x="3" y="5" width="18" height="14" rx="3" />,
    okx: (
      <>
        <circle cx="12" cy="7" r="3" />
        <circle cx="12" cy="17" r="3" />
        <circle cx="7" cy="12" r="3" />
        <circle cx="17" cy="12" r="3" />
      </>
    ),
    manual: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="15" x2="12" y2="15" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    journal: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </>
    ),
    risk: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="7" x2="12" y2="12" />
        <line x1="12" y1="15" x2="12.01" y2="15" />
      </>
    ),
    pro: <path d="M12 2l3 7 7 1-5 4 2 7-7-4-7 4 2-7-5-4 7-1 3-7z" />,
    alert: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <circle cx="12" cy="16" r="1" />
      </>
    ),
    tax: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </>
    ),
    'export-csv': (
      <>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    'export-excel': (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </>
    ),
    'export-pdf': (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    menu: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    ),
    back: (
      <>
        <polyline points="15 18 9 12 15 6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="7" x2="12.01" y2="7" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
    delete: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      </>
    ),
    star: <path d="M12 2l3 7 7 1-5 4 2 7-7-4-7 4 2-7-5-4 7-1 3-7z" />,
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    import: (
      <>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </>
    ),
    'chevron-down': <polyline points="6 9 12 15 18 9" />,
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] || <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}

export function WalletIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <Icon name="wallet" size={size} className={className} />;
}
export function ChartIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <Icon name="chart" size={size} className={className} />;
}
export function TradesIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <Icon name="trades" size={size} className={className} />;
}
