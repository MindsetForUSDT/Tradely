import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { formatUSD } from '@/lib/utils';
import type { Trade } from '@/types';

interface TradesModalProps {
  trades: Trade[];
  onClose: () => void;
}

export function TradesModal({ trades, onClose }: TradesModalProps) {
  return (
    <Modal title="Все сделки" onClose={onClose} size="xl">
      <div className="max-h-[70vh] overflow-auto">
        <Table
          data={trades}
          columns={[
            {
              key: 'timestamp',
              label: 'Дата',
              render: (value, row) => new Date(row.timestamp).toLocaleString('ru-RU'),
              width: '160px',
            },
            {
              key: 'symbol',
              label: 'Символ',
              render: (value) => <span className="font-mono font-medium">{value}</span>,
              width: '120px',
            },
            {
              key: 'side',
              label: 'Тип',
              render: (value) => (
                <span className={value === 'buy' ? 'text-accent-green' : 'text-accent-red'}>
                  {value === 'buy' ? 'Покупка' : 'Продажа'}
                </span>
              ),
              width: '100px',
            },
            {
              key: 'amount',
              label: 'Количество',
              render: (value) => <span className="font-mono">{Number(value).toFixed(4)}</span>,
              width: '120px',
            },
            {
              key: 'price_usd',
              label: 'Цена',
              render: (value) => formatUSD(Number(value)),
              width: '100px',
            },
            {
              key: 'value_usd',
              label: 'Объём',
              render: (value) => formatUSD(Number(value)),
              width: '100px',
            },
            {
              key: 'fee_usd',
              label: 'Комиссия',
              render: (value) => formatUSD(Number(value)),
              width: '100px',
            },
            {
              key: 'pnl_realized',
              label: 'P&L',
              render: (value, row) => {
                const pnl =
                  typeof row.pnl_realized === 'number' ? row.pnl_realized : row.pnl_realized || 0;
                return (
                  <span className={pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                    {pnl >= 0 ? '+' : ''}
                    {formatUSD(pnl)}
                  </span>
                );
              },
              width: '120px',
            },
            {
              key: 'exchange',
              label: 'Биржа',
              render: (value) => <span className="text-text-muted capitalize">{value}</span>,
              width: '100px',
            },
          ]}
          pagination
          searchable
          sortable
        />
      </div>
    </Modal>
  );
}
