import { useMemo, useState } from 'react';
import { CaretLeft, CaretRight, MagnifyingGlass, X } from '@phosphor-icons/react';
import { SourceLogo, resolveSourceBrand } from '@/components/brand/SourceLogo';
import { formatDate, formatUSD } from '@/lib/utils';
import type { Trade } from '@/types';

interface TradeListProps {
  trades: Trade[];
  isLoading?: boolean;
  onTradeClick?: (trade: Trade) => void;
}

type ResultFilter = 'all' | 'profit' | 'loss';
type SortMode = 'newest' | 'oldest' | 'pnl-desc' | 'pnl-asc';

const PAGE_SIZE = 15;

function numeric(value: unknown) {
  const result = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function TradeInspector({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const pnl = numeric(trade.pnl_realized);
  return (
    <aside className="trades-v3-inspector">
      <header>
        <div>
          <span>Сделка</span>
          <h2>{trade.symbol}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </button>
      </header>
      <div className="trades-v3-inspector-source">
        <SourceLogo brand={resolveSourceBrand(trade.exchange)} size={27} />
        <span>
          <strong>{trade.exchange || 'Источник'}</strong>
          <small>Импортировано автоматически</small>
        </span>
      </div>
      <dl>
        <div>
          <dt>Дата</dt>
          <dd>{formatDate(trade.timestamp)}</dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{trade.status === 'closed' ? 'Закрыта' : 'Открыта'}</dd>
        </div>
        <div>
          <dt>Направление</dt>
          <dd>{trade.side === 'buy' ? 'Покупка' : 'Продажа'}</dd>
        </div>
        <div>
          <dt>Размер</dt>
          <dd>{numeric(trade.amount).toLocaleString('ru-RU')}</dd>
        </div>
        <div>
          <dt>Стоимость</dt>
          <dd>{formatUSD(numeric(trade.value_usd))}</dd>
        </div>
        <div>
          <dt>P&amp;L</dt>
          <dd className={pnl >= 0 ? 'positive' : 'negative'}>{formatUSD(pnl)}</dd>
        </div>
        <div>
          <dt>Комиссия</dt>
          <dd>{formatUSD(numeric(trade.fee_usd || trade.fee))}</dd>
        </div>
      </dl>
      <section>
        <span>Заметка</span>
        <p>{trade.notes || 'Контекст к сделке пока не добавлен.'}</p>
        {trade.strategy_tag ? <em>{trade.strategy_tag}</em> : null}
      </section>
    </aside>
  );
}

export function TradeList({ trades, isLoading = false, onTradeClick }: TradeListProps) {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [page, setPage] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const filteredTrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = trades.filter((trade) => {
      const pnl = numeric(trade.pnl_realized);
      const matchesSearch =
        !query ||
        trade.symbol.toLowerCase().includes(query) ||
        trade.exchange?.toLowerCase().includes(query) ||
        trade.tx_hash?.toLowerCase().includes(query);
      const matchesResult =
        resultFilter === 'all' || (resultFilter === 'profit' ? pnl > 0 : pnl < 0);
      return matchesSearch && matchesResult;
    });

    return result.sort((a, b) => {
      if (sortMode === 'newest')
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortMode === 'oldest')
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      const difference = numeric(b.pnl_realized) - numeric(a.pnl_realized);
      return sortMode === 'pnl-desc' ? difference : -difference;
    });
  }, [trades, search, resultFilter, sortMode]);

  const pageCount = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleTrades = filteredTrades.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectTrade = (trade: Trade) => {
    setSelectedTrade(trade);
    onTradeClick?.(trade);
  };

  return (
    <section className="trades-v3-page">
      <header className="trades-v3-heading">
        <div>
          <h1>Сделки</h1>
          <p>Единая история из подключённых бирж и кошельков. Импорт работает автоматически.</p>
        </div>
        <span>{trades.length} записей</span>
      </header>

      <div className="trades-v3-toolbar">
        <div className="trades-v3-tabs" aria-label="Фильтр результата">
          {(
            [
              ['all', 'Все'],
              ['profit', 'Прибыльные'],
              ['loss', 'Убыточные'],
            ] as Array<[ResultFilter, string]>
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={resultFilter === value ? 'active' : ''}
              onClick={() => {
                setResultFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="trades-v3-search">
          <MagnifyingGlass size={15} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Пара, источник или хеш"
          />
        </label>
        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          aria-label="Сортировка сделок"
        >
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="pnl-desc">P&L по убыванию</option>
          <option value="pnl-asc">P&L по возрастанию</option>
        </select>
      </div>

      <div className={`trades-v3-table ${isLoading ? 'is-loading' : ''}`}>
        <div className="trades-v3-table-head">
          <span>Дата и время</span>
          <span>Инструмент</span>
          <span>Сторона</span>
          <span>Объём</span>
          <span>Цена</span>
          <span>P&amp;L</span>
          <span>Источник</span>
        </div>
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div className="trades-v3-skeleton" key={index} />
            ))
          : null}
        {!isLoading && visibleTrades.length
          ? visibleTrades.map((trade) => {
              const pnl = numeric(trade.pnl_realized);
              return (
                <button
                  type="button"
                  className="trades-v3-row"
                  key={trade.id}
                  onClick={() => selectTrade(trade)}
                >
                  <span>{formatDate(trade.timestamp)}</span>
                  <span>
                    <strong>{trade.symbol}</strong>
                    <small>{trade.status === 'closed' ? 'Закрыта' : 'Открыта'}</small>
                  </span>
                  <span className={trade.side === 'buy' ? 'positive' : 'negative'}>
                    {trade.side === 'buy' ? 'Покупка' : 'Продажа'}
                  </span>
                  <span>{formatUSD(numeric(trade.value_usd))}</span>
                  <span>{formatUSD(numeric(trade.price_usd || trade.price))}</span>
                  <span className={pnl >= 0 ? 'positive' : 'negative'}>{formatUSD(pnl)}</span>
                  <span className="trades-v3-source">
                    <SourceLogo brand={resolveSourceBrand(trade.exchange)} size={20} />
                    {trade.exchange || 'Источник'}
                    <CaretRight size={13} />
                  </span>
                </button>
              );
            })
          : null}
        {!isLoading && !visibleTrades.length ? (
          <div className="trades-v3-empty">
            <strong>
              {search || resultFilter !== 'all' ? 'Ничего не найдено' : 'История пока пуста'}
            </strong>
            <span>
              {search || resultFilter !== 'all'
                ? 'Измените поиск или фильтр результата.'
                : 'Подключите источник — сделки будут добавляться автоматически.'}
            </span>
          </div>
        ) : null}
      </div>

      <footer className="trades-v3-pagination">
        <span>
          Показано {visibleTrades.length} из {filteredTrades.length}
        </span>
        <div>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            aria-label="Предыдущая страница"
          >
            <CaretLeft size={14} />
          </button>
          <strong>
            {safePage} / {pageCount}
          </strong>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={safePage === pageCount}
            aria-label="Следующая страница"
          >
            <CaretRight size={14} />
          </button>
        </div>
      </footer>

      {selectedTrade ? (
        <TradeInspector trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
      ) : null}
      {selectedTrade ? (
        <button
          type="button"
          className="overview-drawer-backdrop"
          aria-label="Закрыть детали"
          onClick={() => setSelectedTrade(null)}
        />
      ) : null}
    </section>
  );
}
