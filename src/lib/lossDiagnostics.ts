import type { Trade } from '@/types';
import { calculateTradeBreakdown, parseTradeMeta } from './tradeAnalytics';

export interface DiagnosticBucket {
  key: string;
  label: string;
  trades: number;
  netPnl: number;
  grossPnl: number;
  fees: number;
  winRate: number;
  averagePnl: number;
}

export interface DiagnosticInsight {
  id: 'fees' | 'time' | 'symbol' | 'behavior' | 'drawdown' | 'sample';
  tone: 'critical' | 'warning' | 'positive' | 'neutral';
  eyebrow: string;
  title: string;
  description: string;
  evidence: string;
}

export interface LossDiagnostics {
  trades: number;
  grossPnl: number;
  netPnl: number;
  fees: number;
  adjustments: number;
  turnover: number;
  feeRateOfTurnover: number | null;
  feeShareOfGrossPnl: number | null;
  averageFee: number;
  winRate: number;
  profitFactor: number | null;
  averageTrade: number;
  maxDrawdown: number;
  maxLoss: number;
  averageHoldingMinutes: number | null;
  holdingCoverage: number;
  averageRMultiple: number | null;
  riskCoverage: number;
  contextCoverage: number;
  hourly: DiagnosticBucket[];
  daily: DiagnosticBucket[];
  symbols: DiagnosticBucket[];
  emotions: DiagnosticBucket[];
  mistakes: DiagnosticBucket[];
  insights: DiagnosticInsight[];
}

interface MutableBucket {
  key: string;
  label: string;
  trades: number;
  wins: number;
  netPnl: number;
  grossPnl: number;
  fees: number;
}

const emotionLabels: Record<string, string> = {
  calm: 'Спокойствие',
  fear: 'Страх',
  fomo: 'FOMO',
  greed: 'Жадность',
  anger: 'Злость',
};

const mistakeLabels: Record<string, string> = {
  'early-entry': 'Ранний вход',
  'late-exit': 'Поздний выход',
  oversize: 'Завышенный риск',
  revenge: 'Revenge trading',
  'no-plan': 'Без плана',
};

function toBucket(bucket: MutableBucket): DiagnosticBucket {
  return {
    key: bucket.key,
    label: bucket.label,
    trades: bucket.trades,
    netPnl: bucket.netPnl,
    grossPnl: bucket.grossPnl,
    fees: bucket.fees,
    winRate: bucket.trades ? (bucket.wins / bucket.trades) * 100 : 0,
    averagePnl: bucket.trades ? bucket.netPnl / bucket.trades : 0,
  };
}

function addToBucket(
  map: Map<string, MutableBucket>,
  key: string,
  label: string,
  netPnl: number,
  grossPnl: number,
  fees: number
) {
  const bucket = map.get(key) || {
    key,
    label,
    trades: 0,
    wins: 0,
    netPnl: 0,
    grossPnl: 0,
    fees: 0,
  };
  bucket.trades += 1;
  bucket.wins += netPnl > 0 ? 1 : 0;
  bucket.netPnl += netPnl;
  bucket.grossPnl += grossPnl;
  bucket.fees += fees;
  map.set(key, bucket);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
}

function buildInsights(
  diagnostics: Omit<LossDiagnostics, 'insights'>,
  worstHour: DiagnosticBucket | undefined,
  worstSymbol: DiagnosticBucket | undefined,
  worstBehavior: DiagnosticBucket | undefined
): DiagnosticInsight[] {
  if (diagnostics.trades < 3) {
    return [
      {
        id: 'sample',
        tone: 'neutral',
        eyebrow: 'Качество выборки',
        title: 'Пока недостаточно сделок для устойчивого вывода',
        description:
          'Tradeum покажет причины потерь после трёх сделок, а уверенность выводов вырастет после 20.',
        evidence: `${diagnostics.trades} из 3 минимальных сделок`,
      },
    ];
  }

  const insights: DiagnosticInsight[] = [];
  const feeShare = diagnostics.feeShareOfGrossPnl;
  if (diagnostics.fees > 0) {
    const feeTitle =
      diagnostics.grossPnl > 0 && feeShare !== null
        ? `Комиссии забрали ${feeShare.toFixed(0)}% валового результата`
        : `Комиссии усилили убыток на ${formatMoney(diagnostics.fees)}`;
    insights.push({
      id: 'fees',
      tone: feeShare !== null && feeShare >= 50 ? 'critical' : 'warning',
      eyebrow: 'Цена активности',
      title: feeTitle,
      description:
        feeShare !== null && feeShare >= 100
          ? 'Вы были правы по движению цены, но частота или размер исполнения превратили валовую прибыль в чистый убыток.'
          : 'Сравните инструменты и часы ниже: там видно, где торговая активность обходится дороже результата.',
      evidence: `${formatMoney(diagnostics.fees)} комиссий · ${formatMoney(diagnostics.averageFee)} в среднем`,
    });
  }

  if (worstHour && worstHour.netPnl < 0) {
    insights.push({
      id: 'time',
      tone: 'warning',
      eyebrow: 'Время торговли',
      title: `Самое слабое окно — ${worstHour.label}`,
      description:
        'Это не запрет на торговлю в этот час, а сигнал проверить ликвидность, новости и качество входов в этом окне.',
      evidence: `${formatMoney(worstHour.netPnl)} · ${worstHour.trades} сделок`,
    });
  }

  if (worstSymbol && worstSymbol.netPnl < 0) {
    insights.push({
      id: 'symbol',
      tone: 'critical',
      eyebrow: 'Инструмент',
      title: `${worstSymbol.label} создаёт наибольшую утечку P&L`,
      description:
        'Проверьте, компенсирует ли ваш edge комиссии и волатильность этого инструмента. Одной убыточной сделки недостаточно для вывода.',
      evidence: `${formatMoney(worstSymbol.netPnl)} · комиссии ${formatMoney(worstSymbol.fees)}`,
    });
  }

  if (worstBehavior && worstBehavior.netPnl < 0) {
    insights.push({
      id: 'behavior',
      tone: 'warning',
      eyebrow: 'Поведение',
      title: `Контекст «${worstBehavior.label}» связан с худшим результатом`,
      description:
        'Связь не доказывает причинность, но даёт конкретный сценарий для следующего правила и разбора сделок.',
      evidence: `${formatMoney(worstBehavior.netPnl)} · ${worstBehavior.trades} отмеченных сделок`,
    });
  }

  if (diagnostics.maxDrawdown > 0) {
    insights.push({
      id: 'drawdown',
      tone: diagnostics.netPnl < 0 ? 'critical' : 'neutral',
      eyebrow: 'Риск',
      title: `Максимальная просадка выборки — ${formatMoney(diagnostics.maxDrawdown)}`,
      description:
        'Просадка рассчитана по накопленному чистому P&L. Процент и Sharpe появятся после подключения истории капитала.',
      evidence: `Худшая сделка: ${formatMoney(diagnostics.maxLoss)}`,
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'sample',
      tone: 'positive',
      eyebrow: 'Диагноз',
      title: 'Явной системной утечки в выбранном периоде не найдено',
      description:
        'Продолжайте размечать сделки: контекст, исходный стоп и эмоция повышают точность поведенческого разбора.',
      evidence: `${diagnostics.trades} сделок в выборке`,
    });
  }

  const toneOrder = { critical: 0, warning: 1, neutral: 2, positive: 3 };
  return insights.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);
}

export function calculateLossDiagnostics(trades: Trade[]): LossDiagnostics {
  const chronological = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const hourlyMap = new Map<string, MutableBucket>();
  const dailyMap = new Map<string, MutableBucket>();
  const symbolMap = new Map<string, MutableBucket>();
  const emotionMap = new Map<string, MutableBucket>();
  const mistakeMap = new Map<string, MutableBucket>();

  let grossPnl = 0;
  let netPnl = 0;
  let fees = 0;
  let adjustments = 0;
  let turnover = 0;
  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let maxLoss = 0;
  let holdingTotal = 0;
  let holdingCount = 0;
  let rTotal = 0;
  let rCount = 0;
  let contextCount = 0;

  for (const trade of chronological) {
    const breakdown = calculateTradeBreakdown(trade);
    const meta = parseTradeMeta(trade.raw_data);
    const date = new Date(trade.timestamp);
    const timestampValid = Number.isFinite(date.getTime());

    grossPnl += breakdown.grossPnl;
    netPnl += breakdown.netPnl;
    fees += breakdown.fees;
    adjustments += breakdown.fundingAndAdjustments;
    turnover += breakdown.volume;
    wins += breakdown.netPnl > 0 ? 1 : 0;
    grossProfit += breakdown.netPnl > 0 ? breakdown.netPnl : 0;
    grossLoss += breakdown.netPnl < 0 ? Math.abs(breakdown.netPnl) : 0;
    maxLoss = Math.max(maxLoss, breakdown.netPnl < 0 ? Math.abs(breakdown.netPnl) : 0);

    equity += breakdown.netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    if (breakdown.durationMinutes !== null) {
      holdingTotal += breakdown.durationMinutes;
      holdingCount += 1;
    }
    if (breakdown.rMultiple !== null) {
      rTotal += breakdown.rMultiple;
      rCount += 1;
    }

    if (
      meta.emotion ||
      meta.mistake ||
      meta.strategy ||
      meta.notes ||
      meta.planScore !== undefined
    ) {
      contextCount += 1;
    }

    if (timestampValid) {
      const hour = date.getHours();
      const hourKey = String(hour).padStart(2, '0');
      addToBucket(
        hourlyMap,
        hourKey,
        `${hourKey}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`,
        breakdown.netPnl,
        breakdown.grossPnl,
        breakdown.fees
      );

      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;
      addToBucket(
        dailyMap,
        dayKey,
        new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date),
        breakdown.netPnl,
        breakdown.grossPnl,
        breakdown.fees
      );
    }

    const symbol = trade.symbol || 'Без инструмента';
    addToBucket(symbolMap, symbol, symbol, breakdown.netPnl, breakdown.grossPnl, breakdown.fees);

    if (meta.emotion) {
      const emotion = String(meta.emotion);
      addToBucket(
        emotionMap,
        emotion,
        emotionLabels[emotion] || emotion,
        breakdown.netPnl,
        breakdown.grossPnl,
        breakdown.fees
      );
    }
    if (meta.mistake) {
      const mistake = String(meta.mistake);
      addToBucket(
        mistakeMap,
        mistake,
        mistakeLabels[mistake] || mistake,
        breakdown.netPnl,
        breakdown.grossPnl,
        breakdown.fees
      );
    }
  }

  const hourly = [...hourlyMap.values()].map(toBucket).sort((a, b) => a.key.localeCompare(b.key));
  const daily = [...dailyMap.values()].map(toBucket).sort((a, b) => a.key.localeCompare(b.key));
  const symbols = [...symbolMap.values()].map(toBucket).sort((a, b) => b.netPnl - a.netPnl);
  const emotions = [...emotionMap.values()].map(toBucket).sort((a, b) => a.netPnl - b.netPnl);
  const mistakes = [...mistakeMap.values()].map(toBucket).sort((a, b) => a.netPnl - b.netPnl);

  const diagnosticsWithoutInsights: Omit<LossDiagnostics, 'insights'> = {
    trades: trades.length,
    grossPnl,
    netPnl,
    fees,
    adjustments,
    turnover,
    feeRateOfTurnover: turnover > 0 ? (fees / turnover) * 100 : null,
    feeShareOfGrossPnl: grossPnl > 0 ? (fees / grossPnl) * 100 : null,
    averageFee: trades.length ? fees / trades.length : 0,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    averageTrade: trades.length ? netPnl / trades.length : 0,
    maxDrawdown,
    maxLoss,
    averageHoldingMinutes: holdingCount ? holdingTotal / holdingCount : null,
    holdingCoverage: trades.length ? (holdingCount / trades.length) * 100 : 0,
    averageRMultiple: rCount ? rTotal / rCount : null,
    riskCoverage: trades.length ? (rCount / trades.length) * 100 : 0,
    contextCoverage: trades.length ? (contextCount / trades.length) * 100 : 0,
    hourly,
    daily,
    symbols,
    emotions,
    mistakes,
  };

  const minimumBucketSize = trades.length >= 20 ? 3 : 2;
  const worstHour = hourly
    .filter((bucket) => bucket.trades >= minimumBucketSize)
    .sort((a, b) => a.netPnl - b.netPnl)[0];
  const worstSymbol = [...symbols]
    .filter((bucket) => bucket.trades >= minimumBucketSize)
    .sort((a, b) => a.netPnl - b.netPnl)[0];
  const worstBehavior = [...emotions, ...mistakes]
    .filter((bucket) => bucket.trades >= minimumBucketSize)
    .sort((a, b) => a.netPnl - b.netPnl)[0];

  return {
    ...diagnosticsWithoutInsights,
    insights: buildInsights(diagnosticsWithoutInsights, worstHour, worstSymbol, worstBehavior),
  };
}
