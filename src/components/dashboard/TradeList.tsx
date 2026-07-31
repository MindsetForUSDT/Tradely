import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Plus,
} from '@phosphor-icons/react';
import { SourceLogo, resolveSourceBrand } from '@/components/brand/SourceLogo';
import { TradeDetailsPanel } from '@/components/dashboard/TradeDetailsPanel';
import { calculateTradeBreakdown, formatSignedUSD, numeric } from '@/lib/tradeAnalytics';
import { summarizeTradePeriod, type ProductRangeDays } from '@/lib/productExperience';
import { formatDate, formatUSDPrice } from '@/lib/utils';
import type { Trade } from '@/types';

interface TradeListProps {
  trades: Trade[];
  totalCount: number;
  hasMore: boolean;
  isLoading?: boolean;
  isFetchingMore?: boolean;
  loadMore: () => Promise<void>;
  rangeDays: ProductRangeDays;
  onRangeChange: (days: ProductRangeDays) => void;
  onTradeClick?: (trade: Trade) => void;
  manualEnabled?: boolean;
  onAddManual?: () => void;
  onTradeUpdate?: (trade: Trade) => void;
}

type ResultFilter = 'all' | 'profit' | 'loss';
type SortMode = 'newest' | 'oldest' | 'pnl-desc' | 'pnl-asc';
type DirectionFilter = 'all' | 'long' | 'short';

const PAGE_SIZE = 15;

export function TradeList({
  trades,
  totalCount,
  hasMore,
  isLoading = false,
  isFetchingMore = false,
  loadMore,
  rangeDays,
  onRangeChange,
  onTradeClick,
  manualEnabled = false,
  onAddManual,
  onTradeUpdate,
}: TradeListProps) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [page, setPage] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const periodSummary = useMemo(() => summarizeTradePeriod(trades), [trades]);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setPage(1);
  }, [searchParams]);

  const sources = useMemo(
    () =>
      [...new Set(trades.map((trade) => trade.exchange).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b)
      ),
    [trades]
  );

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
      const direction = trade.side === 'sell' ? 'short' : 'long';
      const matchesDirection = directionFilter === 'all' || directionFilter === direction;
      const matchesSource = sourceFilter === 'all' || trade.exchange === sourceFilter;
      return matchesSearch && matchesResult && matchesDirection && matchesSource;
    });

    return result.sort((a, b) => {
      if (sortMode === 'newest')
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortMode === 'oldest')
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      const difference = numeric(b.pnl_realized) - numeric(a.pnl_realized);
      return sortMode === 'pnl-desc' ? difference : -difference;
    });
  }, [trades, search, resultFilter, directionFilter, sourceFilter, sortMode]);

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
          <p>Импортированные финальные сделки. Net P&amp;L уже включает комиссии и funding.</p>
        </div>
        <div className="trades-v3-heading-actions">
          <div className="trades-v6-period" role="group" aria-label="Период сделок">
            {([7, 30, 90] as ProductRangeDays[]).map((days) => (
              <button
                type="button"
                key={days}
                className={rangeDays === days ? 'active' : ''}
                aria-pressed={rangeDays === days}
                onClick={() => {
                  onRangeChange(days);
                  setPage(1);
                  setSelectedTrade(null);
                }}
              >
                {days} дней
              </button>
            ))}
          </div>
          {manualEnabled ? (
            <button type="button" onClick={onAddManual}>
              <Plus size={14} /> Добавить вручную
            </button>
          ) : null}
          <span>
            Загружено {trades.length} из {totalCount}
          </span>
        </div>
      </header>

      <div className="trades-v6-summary" aria-label={`Итог за ${rangeDays} дней`}>
        <article>
          <span>Net P&amp;L</span>
          <strong className={periodSummary.netPnl >= 0 ? 'positive' : 'negative'}>
            {formatSignedUSD(periodSummary.netPnl)}
          </strong>
          <small>после комиссий и funding</small>
        </article>
        <article>
          <span>Комиссии</span>
          <strong className="negative">{formatSignedUSD(-periodSummary.fees)}</strong>
          <small>по закрытым сделкам</small>
        </article>
        <article>
          <span>Win rate</span>
          <strong>{periodSummary.winRate.toFixed(1)}%</strong>
          <small>
            {periodSummary.winners} из {periodSummary.closedTrades} прибыльных
          </small>
        </article>
        <article>
          <span>Закрытые сделки</span>
          <strong>{periodSummary.closedTrades}</strong>
          <small>выборка за {rangeDays} дней</small>
        </article>
      </div>

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
          value={sourceFilter}
          onChange={(event) => {
            setSourceFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Фильтр по источнику"
        >
          <option value="all">Все источники</option>
          {sources.map((source) => (
            <option value={source} key={source}>
              {source}
            </option>
          ))}
        </select>
        <select
          value={directionFilter}
          onChange={(event) => {
            setDirectionFilter(event.target.value as DirectionFilter);
            setPage(1);
          }}
          aria-label="Фильтр по направлению"
        >
          <option value="all">Любое направление</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
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
          <span>Направление</span>
          <span>Вход → выход</span>
          <span>Количество</span>
          <span>Брутто</span>
          <span>Комиссии</span>
          <span>Net P&amp;L</span>
          <span>R / сетап</span>
        </div>
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div className="trades-v3-skeleton" key={index} />
            ))
          : null}
        {!isLoading && visibleTrades.length
          ? visibleTrades.map((trade) => {
              const item = calculateTradeBreakdown(trade);
              return (
                <button
                  type="button"
                  className={`trades-v3-row ${item.netPnl >= 0 ? 'profit' : 'loss'} ${
                    selectedTrade?.id === trade.id ? 'selected' : ''
                  }`}
                  key={trade.id}
                  onClick={() => selectTrade(trade)}
                >
                  <span>{formatDate(trade.timestamp)}</span>
                  <span>
                    <strong>{trade.symbol}</strong>
                    <small>
                      <SourceLogo brand={resolveSourceBrand(trade.exchange)} size={15} />
                      {trade.exchange || 'Источник'}
                    </small>
                  </span>
                  <span className={`trades-v3-direction ${item.direction}`}>
                    {item.direction === 'long' ? (
                      <ArrowUpRight size={14} weight="bold" />
                    ) : (
                      <ArrowDownRight size={14} weight="bold" />
                    )}
                    {item.direction === 'long' ? 'Long' : 'Short'}
                  </span>
                  <span>
                    {formatUSDPrice(item.entryPrice)} → {formatUSDPrice(item.exitPrice)}
                  </span>
                  <span>
                    {item.amount.toLocaleString('ru-RU', { maximumFractionDigits: 6 })}{' '}
                    {trade.symbol.replace(/USDT$/i, '') || 'ед.'}
                  </span>
                  <span className={item.grossPnl >= 0 ? 'positive' : 'negative'}>
                    {formatSignedUSD(item.grossPnl)}
                  </span>
                  <span className="negative">{formatSignedUSD(-item.fees)}</span>
                  <span className={item.netPnl >= 0 ? 'positive' : 'negative'}>
                    {formatSignedUSD(item.netPnl)}
                  </span>
                  <span className="trades-v3-context">
                    <strong>
                      {item.rMultiple === null ? '—' : `${item.rMultiple.toFixed(2)}R`}
                    </strong>
                    <small>
                      {String(item.meta.strategy || trade.strategy_tag || 'Без сетапа')}
                    </small>
                    <CaretRight size={13} />
                  </span>
                </button>
              );
            })
          : null}
        {!isLoading && !visibleTrades.length ? (
          <div className="trades-v3-empty">
            <strong>
              {search ||
              resultFilter !== 'all' ||
              directionFilter !== 'all' ||
              sourceFilter !== 'all'
                ? 'Ничего не найдено'
                : 'История пока пуста'}
            </strong>
            <span>
              {search ||
              resultFilter !== 'all' ||
              directionFilter !== 'all' ||
              sourceFilter !== 'all'
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
          {hasMore ? (
            <button
              type="button"
              className="trades-v3-load-more"
              onClick={() => void loadMore()}
              disabled={isFetchingMore}
            >
              {isFetchingMore
                ? 'Загружаем…'
                : `Загрузить ещё (${Math.max(0, totalCount - trades.length)})`}
            </button>
          ) : null}
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

      <AnimatePresence>
        {selectedTrade ? (
          <>
            <motion.button
              type="button"
              className="premium-sheet-backdrop"
              aria-label="Закрыть детали"
              onClick={() => setSelectedTrade(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <TradeDetailsPanel
              trade={selectedTrade}
              onClose={() => setSelectedTrade(null)}
              onTradeUpdate={(updatedTrade) => {
                setSelectedTrade(updatedTrade);
                onTradeUpdate?.(updatedTrade);
              }}
            />
          </>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
