// lib/taxCalculator.ts — НОВЫЙ ФАЙЛ
import type { Trade } from '@/types';

interface TaxReport {
  totalProceeds: number;
  totalCostBasis: number;
  netGain: number;
  taxRate: number;
  taxAmount: number;
  trades: number;
  matchedTrades: Array<{
    buyTrade: Trade;
    sellTrade: Trade;
    amount: number;
    costBasis: number;
    proceeds: number;
    gain: number;
  }>;
}

/**
 * Расчет налоговой базы методом FIFO (First In, First Out).
 * Для РФ: налог = 13% до 5 млн, 15% свыше 5 млн.
 */
export function calculateFIFOTax(trades: Trade[], year: number): TaxReport {
  // Фильтруем сделки за год, сортируем по дате
  const yearTrades = trades
    .filter((t) => new Date(t.timestamp).getFullYear() === year)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const buys: Trade[] = []; // Очередь покупок
  const matchedTrades: TaxReport['matchedTrades'] = [];

  let totalProceeds = 0;
  let totalCostBasis = 0;

  for (const trade of yearTrades) {
    if (trade.side === 'buy') {
      buys.push(trade);
    } else if (trade.side === 'sell') {
      let remainingAmount = trade.amount || 0;
      let sellProceeds = 0;
      let matchedCostBasis = 0;

      // Сопоставляем продажу с покупками по FIFO
      while (remainingAmount > 0 && buys.length > 0) {
        const buy = buys[0];
        const matchAmount = Math.min(remainingAmount, buy.amount || 0);

        const costBasis = (buy.price || 0) * matchAmount;
        const proceeds = (trade.price || 0) * matchAmount;

        matchedCostBasis += costBasis;
        sellProceeds += proceeds;

        // Обновляем оставшееся количество в покупке
        buy.amount = (buy.amount || 0) - matchAmount;
        remainingAmount -= matchAmount;

        // Сохраняем сопоставленную сделку
        matchedTrades.push({
          buyTrade: buy,
          sellTrade: trade,
          amount: matchAmount,
          costBasis,
          proceeds,
          gain: proceeds - costBasis,
        });

        // Если покупка полностью использована, удаляем из очереди
        if ((buy.amount || 0) <= 0) {
          buys.shift();
        }
      }

      totalProceeds += sellProceeds;
      totalCostBasis += matchedCostBasis;
    }
  }

  const netGain = totalProceeds - totalCostBasis;
  const taxRate = netGain > 5_000_000 ? 0.15 : 0.13;
  const taxAmount = netGain > 0 ? netGain * taxRate : 0;

  return {
    totalProceeds: +totalProceeds.toFixed(2),
    totalCostBasis: +totalCostBasis.toFixed(2),
    netGain: +netGain.toFixed(2),
    taxRate: taxRate * 100,
    taxAmount: +taxAmount.toFixed(2),
    trades: yearTrades.length,
    matchedTrades,
  };
}
