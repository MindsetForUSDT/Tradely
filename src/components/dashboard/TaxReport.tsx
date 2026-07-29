import { useMemo, useState } from 'react';
import { Calculator, Info } from '@phosphor-icons/react';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { calculateFIFOTax } from '@/lib/taxCalculator';
import { formatUSD } from '@/lib/utils';

export function TaxReport() {
  const { trades } = useTradesOptimized({ limit: 500, daysAgo: 365 });
  const [year, setYear] = useState(new Date().getFullYear());
  const report = useMemo(() => calculateFIFOTax(trades, year), [trades, year]);

  return (
    <section className="workspace-form-page">
      <header>
        <span>Отчёты</span>
        <h1>Налоговый расчёт</h1>
        <p>Предварительная оценка по методу FIFO на основе импортированной истории.</p>
      </header>
      <div className="workspace-tax-panel">
        <div className="workspace-form-title">
          <Calculator size={21} />
          <div>
            <strong>РФ · FIFO</strong>
            <small>Выберите календарный год.</small>
          </div>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {[2024, 2025, 2026].map((value) => (
              <option key={value} value={value}>
                {value} год
              </option>
            ))}
          </select>
        </div>
        <dl>
          <div>
            <dt>Сделок</dt>
            <dd>{report.trades}</dd>
          </div>
          <div>
            <dt>Выручка</dt>
            <dd>{formatUSD(report.totalProceeds)}</dd>
          </div>
          <div>
            <dt>Затраты по FIFO</dt>
            <dd>{formatUSD(report.totalCostBasis)}</dd>
          </div>
          <div>
            <dt>Налоговая база</dt>
            <dd className={report.netGain >= 0 ? 'positive' : 'negative'}>
              {formatUSD(report.netGain)}
            </dd>
          </div>
          <div>
            <dt>Расчётная ставка</dt>
            <dd>{report.taxRate}%</dd>
          </div>
          <div className="total">
            <dt>Предварительный налог</dt>
            <dd>{formatUSD(report.taxAmount)}</dd>
          </div>
        </dl>
        <p>
          <Info size={15} />
          Это аналитическая оценка, а не налоговая или юридическая консультация. Сверьте расчёт с
          актуальным законодательством и документами биржи.
        </p>
      </div>
    </section>
  );
}
