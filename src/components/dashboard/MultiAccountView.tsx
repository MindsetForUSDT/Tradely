import { CheckCircle, Stack } from '@phosphor-icons/react';
import { useMultiAccounts } from '@/hooks/useMultiAccounts';
import { formatUSD } from '@/lib/utils';

export function MultiAccountView() {
  const { accounts, selectedAccounts, toggleAccount, aggregated, maxAccounts } = useMultiAccounts();

  return (
    <section className="multi-source-page">
      <header>
        <div>
          <span>Сводка</span>
          <h1>Сравнение источников</h1>
          <p>Соберите результат выбранных торговых счетов без смешения исходных данных.</p>
        </div>
        <small>
          Выбрано {selectedAccounts.size} / {maxAccounts}
        </small>
      </header>

      <div className="multi-source-selector">
        {accounts.map((account) => {
          const selected = selectedAccounts.has(account.id);
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => toggleAccount(account.id)}
              className={selected ? 'active' : ''}
            >
              <Stack size={17} />
              {account.label || account.address.slice(0, 8)}
              {selected ? <CheckCircle size={16} weight="fill" /> : null}
            </button>
          );
        })}
      </div>

      {aggregated ? (
        <>
          <div className="multi-source-metrics">
            <article>
              <span>Объём</span>
              <strong>{formatUSD(aggregated.totalVolume)}</strong>
            </article>
            <article>
              <span>Сделок</span>
              <strong>{aggregated.totalTrades}</strong>
            </article>
            <article>
              <span>Net P&amp;L</span>
              <strong className={aggregated.totalPnl >= 0 ? 'positive' : 'negative'}>
                {formatUSD(aggregated.totalPnl)}
              </strong>
            </article>
          </div>
          <div className="multi-source-table">
            <header>
              <span>Источник</span>
              <span>Сделок</span>
              <span>Net P&amp;L</span>
            </header>
            {aggregated.byAccount?.map((account) => (
              <div key={account.walletId}>
                <strong>{account.label}</strong>
                <span>{account.trades}</span>
                <span className={account.pnl >= 0 ? 'positive' : 'negative'}>
                  {formatUSD(account.pnl)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!accounts.length ? (
        <div className="multi-source-empty">
          <Stack size={24} />
          <strong>Нет источников для сравнения</strong>
          <span>Подключите первый торговый счёт в разделе «Источники».</span>
        </div>
      ) : null}
    </section>
  );
}
