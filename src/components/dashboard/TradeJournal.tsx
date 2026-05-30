import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { useTradeJournal } from '@/hooks/useTradeJournal';
import { ManualTradeForm } from './ManualTradeForm';
import { CalendarView } from './CalendarView';
import { QuickMetrics } from './QuickMetrics';
import { ImportTradesModal } from './ImportTradesModal';
import { ProFeature } from '@/components/guards/ProFeature';
import { formatUSD, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { SlideIn } from '@/components/ui/SlideIn';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';

export function TradeJournal() {
  const { trades, loading, addTrade, updateTrade, deleteTrade } = useTradeJournal();
  const { tokenVolumes, totalVolume } = useTradesOptimized();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [view, setView] = useState<'list' | 'calendar' | 'metrics'>('list');
  const [showImport, setShowImport] = useState(false);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Фильтрация по времени
  const filteredTrades = useMemo(() => {
    const now = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return trades.filter((t) => new Date(t.timestamp) >= since);
  }, [trades, timeframe]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pnlData, _totalTrades] = [undefined, undefined];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
      {/* Header */}
      <SlideIn direction="down" delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <span className="text-4xl">📊</span>
              Журнал сделок
            </h1>
            <p className="text-text-muted mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-green/10 text-accent-green">
                {filteredTrades.length} сделок
              </span>
              <span>•</span>
              <span className="text-sm">Анализируй свою торговлю как профессионал</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="import" size={14} /> Импорт
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent-green to-accent-cyan hover:from-accent-cyan hover:to-accent-green transition-all"
            >
              <Icon name="wallet-add" size={14} /> + Сделка
            </Button>
          </div>
        </div>
      </SlideIn>

      {/* Views Switcher */}
      <SlideIn direction="down" delay={0.05}>
        <Card padding="sm">
          <div className="flex items-center gap-2">
            {[
              {
                key: 'list',
                label: 'Список сделок',
                icon: 'journal',
                count: filteredTrades.length,
              },
              { key: 'calendar', label: 'Календарь', icon: 'calendar', count: null },
              { key: 'metrics', label: '📈 Аналитика', icon: 'chart', count: null },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key as any)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  view === v.key
                    ? 'bg-gradient-to-r from-accent-green to-accent-cyan text-surface shadow-lg shadow-accent-green/20'
                    : 'bg-surface-overlay text-text-secondary hover:text-text-primary hover:bg-surface-border'
                )}
              >
                <Icon name={v.icon as any} size={16} />
                {v.label}
                {v.count !== null && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      view === v.key ? 'bg-surface/20' : 'bg-surface-border'
                    )}
                  >
                    {v.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      </SlideIn>

      {/* Timeframe Filter */}
      {view === 'metrics' && (
        <SlideIn direction="down" delay={0.1}>
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Период анализа:</span>
              <div className="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
                {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-md transition-all',
                      timeframe === tf
                        ? 'bg-accent-green text-surface font-medium'
                        : 'text-text-muted hover:text-text-primary'
                    )}
                  >
                    {tf === 'all' ? 'Все' : tf}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </SlideIn>
      )}

      {/* Modal */}
      {showForm && (
        <ManualTradeForm
          trade={editing}
          onSave={(t) => {
            if (editing) updateTrade(t);
            else addTrade(t);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {showImport && <ImportTradesModal onClose={() => setShowImport(false)} />}

      {/* Metrics View */}
      {view === 'metrics' && (
        <StaggerContainer className="space-y-6">
          {/* Основные метрики */}
          <ScrollReveal delay={0}>
            <Card padding="lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>🎯</span> Ключевые метрики
              </h3>
              <QuickMetrics trades={filteredTrades} showProOnly={true} />
            </Card>
          </ScrollReveal>

          {/* P&L График */}
          <ScrollReveal delay={0.05}>
            <ProFeature
              fallback={
                <Card padding="lg">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-border flex items-center justify-center mb-4">
                      <Icon name="pro" size={28} className="text-text-muted" />
                    </div>
                    <p className="text-text-muted font-medium">Доступно для Pro подписчиков</p>
                    <p className="text-sm text-text-muted mt-1">
                      Получите полный доступ к аналитике
                    </p>
                  </div>
                </Card>
              }
            >
              <Card padding="lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📈</span> Динамика P&L
                </h3>
                {/* Здесь будет график pnlData */}
                <div className="h-64 flex items-center justify-center text-text-muted">
                  График P&L (в разработке)
                </div>
              </Card>
            </ProFeature>
          </ScrollReveal>

          {/* Распределение по токенам */}
          <ScrollReveal delay={0.1}>
            <ProFeature
              fallback={
                <Card padding="lg">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-border flex items-center justify-center mb-4">
                      <Icon name="pro" size={28} className="text-text-muted" />
                    </div>
                    <p className="text-text-muted font-medium">Доступно для Pro подписчиков</p>
                  </div>
                </Card>
              }
            >
              <Card padding="lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🥈</span> Распределение по токенам
                </h3>
                <div className="h-64 flex items-center justify-center text-text-muted">
                  График объёмов: {tokenVolumes.length} токенов, общий объём{' '}
                  {formatUSD(totalVolume)}
                </div>
              </Card>
            </ProFeature>
          </ScrollReveal>

          {/* Поведенческая аналитика */}
          <ScrollReveal delay={0.15}>
            <ProFeature
              fallback={
                <Card padding="lg">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-border flex items-center justify-center mb-4">
                      <Icon name="pro" size={28} className="text-text-muted" />
                    </div>
                    <p className="text-text-muted font-medium">Доступно для Pro подписчиков</p>
                  </div>
                </Card>
              }
            >
              <Card padding="lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🧠</span> Поведенческая аналитика
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-surface-overlay rounded-lg">
                    <p className="text-xs text-text-muted uppercase mb-1">Импульсивность</p>
                    <p className="text-2xl font-bold font-mono text-accent-purple">33.7%</p>
                    <p className="text-xs text-text-muted mt-1">Сделок {'<'} 5 мин</p>
                  </div>
                  <div className="p-4 bg-surface-overlay rounded-lg">
                    <p className="text-xs text-text-muted uppercase mb-1">DCA вероятность</p>
                    <p className="text-2xl font-bold font-mono text-accent-red">12.4%</p>
                    <p className="text-xs text-text-muted mt-1">Усреднение вместо стопа</p>
                  </div>
                  <div className="p-4 bg-surface-overlay rounded-lg">
                    <p className="text-xs text-text-muted uppercase mb-1">Fee Ratio</p>
                    <p className="text-2xl font-bold font-mono text-accent-yellow">18.2%</p>
                    <p className="text-xs text-text-muted mt-1">Комиссии / |P&L|</p>
                  </div>
                  <div className="p-4 bg-surface-overlay rounded-lg">
                    <p className="text-xs text-text-muted uppercase mb-1">Концентрация</p>
                    <p className="text-2xl font-bold font-mono text-accent-green">24.5%</p>
                    <p className="text-xs text-text-muted mt-1">Макс. сделка в объёме</p>
                  </div>
                </div>
              </Card>
            </ProFeature>
          </ScrollReveal>
        </StaggerContainer>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <SlideIn direction="up" delay={0.1}>
          <Card padding="lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📅</span> Календарь сделок
            </h3>
            <CalendarView trades={filteredTrades} />
          </Card>
        </SlideIn>
      )}

      {/* List View */}
      {view === 'list' && (
        <StaggerContainer className="space-y-2">
          {loading ? (
            <Card padding="lg">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-surface-border rounded-lg" />
                ))}
              </div>
            </Card>
          ) : filteredTrades.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-overlay flex items-center justify-center mb-4">
                  <Icon name="journal" size={28} className="text-text-muted" />
                </div>
                <p className="text-text-muted font-medium">Нет сделок за выбранный период</p>
                <p className="text-sm text-text-muted mt-1">
                  Нажмите «+ Сделка» чтобы добавить первую запись
                </p>
              </div>
            </Card>
          ) : (
            filteredTrades.map((t: any, idx) => {
              const pnl = t.pnl_realized || 0;
              return (
                <ScrollReveal key={t.id} delay={idx * 0.02}>
                  <Card
                    padding="md"
                    className="group hover:ring-2 hover:ring-accent-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg',
                            t.side === 'buy'
                              ? 'bg-gradient-to-br from-accent-green/20 to-accent-green/5 text-accent-green border border-accent-green/20'
                              : 'bg-gradient-to-br from-accent-red/20 to-accent-red/5 text-accent-red border border-accent-red/20'
                          )}
                        >
                          {t.side === 'buy' ? '🟢' : '🔴'}
                        </div>
                        <div>
                          <p className="text-base font-bold font-mono">{t.symbol}</p>
                          <p className="text-xs text-text-muted flex items-center gap-1">
                            <Icon name="calendar" size={10} />
                            {formatDate(t.timestamp)}
                            {t.strategy_tag && (
                              <>
                                <span>•</span>
                                <span className="px-1.5 py-0.5 rounded bg-surface-overlay text-xs">
                                  {t.strategy_tag}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-mono text-text-secondary">
                            {formatUSD(t.value_usd)}
                          </p>
                          <p
                            className={cn(
                              'text-base font-bold font-mono',
                              pnl >= 0 ? 'text-accent-green' : 'text-accent-red'
                            )}
                          >
                            {pnl >= 0 ? '+' : ''}
                            {formatUSD(pnl)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditing(t);
                              setShowForm(true);
                            }}
                            className="p-2 rounded-lg hover:bg-surface-border text-text-muted hover:text-text-primary transition-colors"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            onClick={() => deleteTrade(t.id)}
                            className="p-2 rounded-lg hover:bg-surface-border text-text-muted hover:text-accent-red transition-colors"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </ScrollReveal>
              );
            })
          )}
        </StaggerContainer>
      )}
    </div>
  );
}
