import { useState } from 'react';
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
          <p className="text-sm text-text-muted mt-1">{trades.length} сделок</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'list' ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
          >
            Список
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'calendar' ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
          >
            Календарь
          </button>
          <button
            onClick={() => setView('metrics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'metrics' ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
          >
            Метрики
          </button>
          <ProFeature fallback={null}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="import" size={14} /> Импорт
            </Button>
          </ProFeature>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5"
          >
            <Icon name="wallet-add" size={14} /> Сделка
          </Button>
        </div>
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

      {showImport && <ImportTradesModal onClose={() => setShowImport(false)} />}
      {view === 'metrics' && <QuickMetrics trades={trades} />}
      {view === 'calendar' && <CalendarView trades={trades} />}

      {view === 'list' &&
        (loading ? (
          <Card padding="md">
            <div className="animate-pulse h-32 bg-surface-border rounded-lg" />
          </Card>
        ) : trades.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                <Icon name="journal" size={28} className="text-accent-green" />
              </div>
              <p className="text-text-muted">Журнал пуст</p>
              <p className="text-sm text-text-muted mt-1">
                Нажмите «+ Сделка» чтобы добавить запись
              </p>
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
                      className="text-text-muted hover:text-text-primary p-1"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      onClick={() => deleteTrade(t.id)}
                      className="text-text-muted hover:text-accent-red p-1"
                    >
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
    </div>
  );
}
