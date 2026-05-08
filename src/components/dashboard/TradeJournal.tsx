import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradeJournal } from '@/hooks/useTradeJournal';
import { ManualTradeForm } from './ManualTradeForm';
import { ImportTradesModal } from './ImportTradesModal';
import { ProFeature } from '@/components/guards/ProFeature';
import { QuickMetrics } from './QuickMetrics';
import { CalendarView } from './CalendarView';
import { formatUSD, formatDate, cn } from '@/lib/utils';

export function TradeJournal() {
  const { trades, loading, addTrade, updateTrade, deleteTrade } = useTradeJournal();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [view, setView] = useState<'list' | 'calendar' | 'metrics'>('list');
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Журнал сделок</h1>
          <p className="text-sm text-text-muted mt-1">{trades.length} сделок вручную</p>
        </div>
        <div className="flex gap-2">
          <ProFeature fallback={null}>
            <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
              📥 Импорт
            </Button>
          </ProFeature>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Сделка
          </Button>
        </div>
      </div>

      {/* Переключатель видов */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('list')}
          className={`px-3 py-1 rounded-lg text-xs ${
            view === 'list' ? 'bg-accent-green text-surface' : 'bg-surface-overlay'
          }`}
        >
          Список
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`px-3 py-1 rounded-lg text-xs ${
            view === 'calendar' ? 'bg-accent-green text-surface' : 'bg-surface-overlay'
          }`}
        >
          Календарь
        </button>
        <button
          onClick={() => setView('metrics')}
          className={`px-3 py-1 rounded-lg text-xs ${
            view === 'metrics' ? 'bg-accent-green text-surface' : 'bg-surface-overlay'
          }`}
        >
          Метрики
        </button>
      </div>

      {showForm && (
        <ManualTradeForm
          trade={editing}
          onSave={(t) => {
            if (editing) {
              updateTrade(t);
            } else {
              addTrade(t);
            }
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Условный рендеринг в зависимости от view */}
      {view === 'metrics' && <QuickMetrics trades={trades} />}

      {view === 'calendar' && <CalendarView trades={trades} />}

      {view === 'list' && (
        <>
          {loading ? (
            <Card padding="md">
              <div className="animate-pulse h-32 bg-surface-border rounded-lg" />
            </Card>
          ) : trades.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8 text-text-muted">
                <span className="text-3xl">📝</span>
                <p className="mt-2">Журнал пуст</p>
                <p className="text-sm mt-1">Нажмите "+ Сделка" чтобы добавить запись</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {trades.map((t: any) => {
                const pnl = t.pnl_realized || 0;
                return (
                  <Card key={t.id} padding="md" className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                          t.side === 'buy'
                            ? 'bg-accent-green/10 text-accent-green'
                            : 'bg-accent-red/10 text-accent-red'
                        )}
                      >
                        {t.side === 'buy' ? 'B' : 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.symbol}</p>
                        <p className="text-xs text-text-muted">
                          {formatDate(t.timestamp)}
                          {t.strategy_tag && ` · ${t.strategy_tag}`}
                          {t.timeframe && ` · ${t.timeframe}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-mono">{formatUSD(t.value_usd)}</p>
                        <p
                          className={cn(
                            'text-xs font-medium',
                            pnl >= 0 ? 'text-accent-green' : 'text-accent-red'
                          )}
                        >
                          {pnl >= 0 ? '+' : ''}
                          {formatUSD(pnl)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditing(t);
                          setShowForm(true);
                        }}
                        className="text-text-muted hover:text-text-primary"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteTrade(t.id)}
                        className="text-text-muted hover:text-accent-red"
                      >
                        🗑
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Модальное окно импорта */}
      {showImport && <ImportTradesModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
