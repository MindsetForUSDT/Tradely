// lib/riskCalculator.ts — ПРОФЕССИОНАЛЬНЫЙ РИСК-МЕНЕДЖМЕНТ
// Формулы: Ralph Vince, Ed Thorp, Nauzer Balsara

/**
 * ========== КРИТЕРИЙ КЕЛЛИ (Kelly Criterion) ==========
 *
 * Базовая формула: f* = (bp - q) / b
 * где:
 *   b = avgWin / avgLoss (коэффициент выплаты)
 *   p = winRate (вероятность выигрыша)
 *   q = 1 - p (вероятность проигрыша)
 *
 * Оптимальная доля капитала для максимизации логарифмической прибыли.
 */
export interface KellyResult {
  kellyFraction: number; // Полный Келли (f*)
  halfKelly: number; // Половина Келли (консервативный)
  quarterKelly: number; // Четверть Келли (ультра-консервативный)
  optimalPositionSize: number; // Размер позиции в валюте
  expectedGrowth: number; // Ожидаемая скорость роста капитала
  ruinProbability: number; // Вероятность разорения при данном f
}

export function calculateKellyCriterion(
  accountBalance: number,
  winRate: number,
  avgWin: number,
  avgLoss: number,
  _riskFreeRate: number = 0.05
): KellyResult {
  // Защита от некорректных входных данных
  if (accountBalance <= 0 || winRate <= 0 || winRate >= 1 || avgWin <= 0 || avgLoss <= 0) {
    return {
      kellyFraction: 0,
      halfKelly: 0,
      quarterKelly: 0,
      optimalPositionSize: 0,
      expectedGrowth: 0,
      ruinProbability: 1,
    };
  }

  const b = Math.abs(avgWin / avgLoss); // Odds ratio
  const p = winRate;
  const q = 1 - p;

  // f* = (bp - q) / b
  const kellyFraction = (b * p - q) / b;

  // Защита от отрицательного/нулевого Келли
  if (kellyFraction <= 0) {
    return {
      kellyFraction: 0,
      halfKelly: 0,
      quarterKelly: 0,
      optimalPositionSize: 0,
      expectedGrowth: 0,
      ruinProbability: 1,
    };
  }

  // Консервативные варианты
  const halfKelly = kellyFraction / 2;
  const quarterKelly = kellyFraction / 4;

  // Размер позиции в валюте (используем Half Kelly как рекомендованный)
  const optimalPositionSize = accountBalance * halfKelly;

  // Ожидаемая скорость роста капитала (логарифмическая)
  // g(f) = p * ln(1 + b*f) + q * ln(1 - f)
  const growthWithKelly = p * Math.log(1 + b * kellyFraction) + q * Math.log(1 - kellyFraction);
  const expectedGrowth = Math.exp(growthWithKelly) - 1;

  // Вероятность разорения для данной доли f (метод Феллера)
  const ruinProbability = calculateRuinProbability(
    p,
    b,
    kellyFraction,
    accountBalance / Math.abs(avgLoss)
  );

  return {
    kellyFraction: +kellyFraction.toFixed(4),
    halfKelly: +halfKelly.toFixed(4),
    quarterKelly: +quarterKelly.toFixed(4),
    optimalPositionSize: +optimalPositionSize.toFixed(2),
    expectedGrowth: +expectedGrowth.toFixed(4),
    ruinProbability: +ruinProbability.toFixed(6),
  };
}

/**
 * ========== ФИКСИРОВАННЫЙ РИСК (Fixed Fractional) ==========
 * Для трейдеров, предпочитающих рисковать фиксированным % от капитала.
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLossPrice: number
): {
  positionSize: number;
  positionSizeUSD: number;
  riskAmount: number;
  stopDistancePercent: number;
  leverage: number;
} {
  if (accountBalance <= 0 || riskPercent <= 0 || entryPrice <= 0 || stopLossPrice <= 0) {
    return {
      positionSize: 0,
      positionSizeUSD: 0,
      riskAmount: 0,
      stopDistancePercent: 0,
      leverage: 1,
    };
  }

  const riskAmount = accountBalance * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const stopDistancePercent = (stopDistance / entryPrice) * 100;

  // Количество токенов = риск / расстояние до стопа
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const positionSizeUSD = positionSize * entryPrice;

  // Максимальное плечо для ограничения риска
  const leverage = accountBalance > 0 ? Math.floor(positionSizeUSD / accountBalance) : 1;

  return {
    positionSize: +positionSize.toFixed(6),
    positionSizeUSD: +positionSizeUSD.toFixed(2),
    riskAmount: +riskAmount.toFixed(2),
    stopDistancePercent: +stopDistancePercent.toFixed(2),
    leverage: Math.max(1, leverage),
  };
}

/**
 * ========== ВЕРОЯТНОСТЬ РАЗОРЕНИЯ (Risk of Ruin) ==========
 *
 * Точная формула для дискретного процесса:
 * R = ((1 - P) / P) ^ (Capital / UnitRisk)
 *
 * где P — скорректированная вероятность выигрыша с учетом edge.
 */
export function calculateRiskOfRuin(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  accountBalance: number,
  riskPerTrade: number
): number {
  if (accountBalance <= 0 || riskPerTrade <= 0) return 1;
  if (winRate <= 0) return 1;
  if (winRate >= 1) return 0;

  const absAvgLoss = Math.abs(avgLoss);
  const lossRatio = avgWin > 0 ? absAvgLoss / avgWin : 1;

  // Скорректированная вероятность с учетом соотношения win/loss
  const adjustedProb = winRate / (winRate + (1 - winRate) * lossRatio);

  // Капитал в единицах риска
  const capitalUnits = Math.floor(accountBalance / riskPerTrade);

  if (capitalUnits <= 0) return 1;

  // Точная формула разорения для biased random walk
  let ruinProb: number;
  if (Math.abs(adjustedProb - 0.5) < 0.0001) {
    // Симметричный случай
    ruinProb = 1;
  } else {
    const ratio = (1 - adjustedProb) / adjustedProb;
    ruinProb = Math.pow(ratio, capitalUnits);
  }

  return Math.min(1, +ruinProb.toFixed(6));
}

/**
 * ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ==========
 * Вероятность разорения для непрерывного процесса (метод Феллера)
 */
function calculateRuinProbability(
  winRate: number,
  oddsRatio: number,
  fraction: number,
  capitalUnits: number
): number {
  if (fraction <= 0 || fraction >= 1) return 1;
  if (capitalUnits <= 0) return 1;

  // Параметры смещенного случайного блуждания
  const upProb = winRate;
  const downProb = 1 - winRate;
  const upFactor = 1 + oddsRatio * fraction;
  const downFactor = 1 - fraction;

  // Логарифмический дрейф
  const drift = upProb * Math.log(upFactor) + downProb * Math.log(downFactor);

  if (drift <= 0) return 1;

  // Вероятность разорения: exp(-2 * drift * units / variance)
  const variance =
    upProb * Math.pow(Math.log(upFactor), 2) +
    downProb * Math.pow(Math.log(downFactor), 2) -
    Math.pow(drift, 2);

  if (variance <= 0) return 1;

  const ruinProb = Math.exp((-2 * drift * capitalUnits) / variance);
  return Math.min(1, +ruinProb.toFixed(6));
}

/**
 * ========== ПРОВЕРКА ЛИМИТОВ ==========
 */
export function checkRiskLimits(
  currentPnl: number,
  dailyLossLimit: number,
  weeklyLossLimit: number,
  maxDrawdownPercent: number = 20
): {
  dailyBreached: boolean;
  weeklyBreached: boolean;
  drawdownBreached: boolean;
  remainingDailyRisk: number;
  remainingWeeklyRisk: number;
  shouldStopTrading: boolean;
} {
  const dailyBreached = dailyLossLimit > 0 && currentPnl < -dailyLossLimit;
  const weeklyBreached = weeklyLossLimit > 0 && currentPnl < -weeklyLossLimit;
  const drawdownBreached =
    maxDrawdownPercent > 0 && currentPnl < -(maxDrawdownPercent / 100) * currentPnl;

  return {
    dailyBreached,
    weeklyBreached,
    drawdownBreached,
    remainingDailyRisk: dailyLossLimit > 0 ? Math.max(0, dailyLossLimit + currentPnl) : Infinity,
    remainingWeeklyRisk: weeklyLossLimit > 0 ? Math.max(0, weeklyLossLimit + currentPnl) : Infinity,
    shouldStopTrading: dailyBreached || weeklyBreached || drawdownBreached,
  };
}

/**
 * ========== ОПТИМАЛЬНОЕ F (Винс) ==========
 * Находит f, максимизирующее TWR (Terminal Wealth Relative).
 */
export function calculateOptimalF(trades: Array<{ pnl_percent: number }>): {
  optimalF: number;
  geometricMean: number;
  twr: number;
} {
  if (!trades?.length) {
    return { optimalF: 0, geometricMean: 1, twr: 1 };
  }

  const pnlPercents = trades.map((t) => t.pnl_percent / 100);
  let bestF = 0;
  let bestTWR = 1;

  // Перебираем f от 0.01 до 0.99 с шагом 0.01
  for (let f = 0.01; f < 1; f += 0.01) {
    let twr = 1;
    let valid = true;

    for (const pnl of pnlPercents) {
      const hpr = 1 + f * (-pnl / Math.min(...pnlPercents.filter((p) => p < 0), -0.01));
      if (hpr <= 0) {
        valid = false;
        break;
      }
      twr *= hpr;
    }

    if (valid && twr > bestTWR) {
      bestTWR = twr;
      bestF = f;
    }
  }

  const geometricMean = Math.pow(bestTWR, 1 / trades.length);

  return {
    optimalF: +bestF.toFixed(4),
    geometricMean: +geometricMean.toFixed(4),
    twr: +bestTWR.toFixed(4),
  };
}
