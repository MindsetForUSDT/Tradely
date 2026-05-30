# 📊 TradeumDiary — Метрики (Free vs Pro)

## 📋 Обзор

Все метрики разделены на 2 группы:

- **Free (Базовые)** — доступны всем пользователям
- **Pro (Продвинутые)** — требуют Pro подписки

---

## 🆓 FREE METRICS (Доступны на Dashboard и в Journal)

### 1. Общедоступные метрики (On-Chain Hygiene & Surface Performance)

#### 1.1. Базовые метрики портфеля

| Метрика          | Описание                                          | Где показывать     |
| ---------------- | ------------------------------------------------- | ------------------ |
| **Общий баланс** | Сумма балансов всех кошельков                     | Dashboard          |
| **Сделок всего** | Общее количество сделок                           | Dashboard, Journal |
| **P&L сегодня**  | Реализованная прибыль/убыток за последние 24 часа | Dashboard          |

#### 1.2. Базовая статистика

| Метрика         | Формула                                    | Где показывать                          |
| --------------- | ------------------------------------------ | --------------------------------------- |
| **Win Rate**    | `(прибыльные сделки / всего сделок) * 100` | Dashboard (Pro), Journal Metrics (Free) |
| **Total P&L**   | Сумма всех `pnl_realized`                  | Dashboard (Pro), Journal Metrics (Pro)  |
| **Общий объём** | Сумма всех `value_usd`                     | Dashboard (Pro), Journal Metrics (Pro)  |

#### 1.3. Календарь

- Визуализация сделок по дням
- Цветовая индикация прибыльных/убыточных дней
- **Доступно:** Free

---

## 💎 PRO METRICS (Только для Pro подписчиков)

### 2. PnL-разложение (Глубокая аналитика доходности)

#### 2.1. Продвинутый PnL

| Метрика                        | Описание                                            | Формула                                       | Где показывать |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------- | -------------- |
| **Realized vs Unrealized PnL** | Разделение зафиксированной и "бумажной" прибыли     | Разница между закрытыми и открытыми позициями | Pro Analytics  |
| **Intraday P&L**               | Прибыль по сделкам, открытым и закрытым в один день | Фильтрация по дате                            | Pro Analytics  |
| **PnL per Holding Minute**     | Нормированная прибыль                               | `PnL / holding_time_minutes`                  | Pro Analytics  |
| **Avg PnL per 1 USD Gas**      | Окупаемость комиссий                                | `PnL / gas_spent`                             | Pro Analytics  |
| **Personal OI Delta**          | Изменение открытого интереса                        | Сумма изменений позиций                       | Pro Analytics  |
| **PnL по дням недели**         | Тепловая карта по дням/часам                        | Агрегация по weekday/hour                     | Pro Analytics  |
| **HODL Benchmark Diff**        | PnL относительно простого удержания                 | `my_PnL - hodl_PnL`                           | Pro Analytics  |

#### 2.2. Поведенческая аналитика

| Метрика                    | Описание                          | Формула                                | Где показывать  |
| -------------------------- | --------------------------------- | -------------------------------------- | --------------- |
| **Impulsivity Score**      | Частота импульсивных сделок       | `% сделок с time_between < 60 сек`     | Journal Metrics |
| **DCA Probability**        | Вероятность усреднения            | `(сделки с усреднением / всего) * 100` | Journal Metrics |
| **Early/Late Entry Ratio** | Вход в начале/конце движения      | Анализ цены относительно min/max       | Pro Analytics   |
| **Tilt Onset Threshold**   | Сделок до тильта                  | Анализ серии убытков                   | Pro Analytics   |
| **Time to Take Loss**      | Время удержания убыточной позиции | Среднее время для убыточных сделок     | Journal Metrics |
| **Martingale Factor**      | Увеличение позиции после убытка   | Анализ размера позиции после loss      | Pro Analytics   |
| **Entry Signature**        | Тип входа (лимит/рынок/лесенка)   | Кластеризация паттернов входа          | Pro Analytics   |

#### 2.3. Комиссионная эффективность

| Метрика                  | Описание                    | Формула                                             | Где показывать |
| ------------------------ | --------------------------- | --------------------------------------------------- | -------------- | --------- | --------------- |
| **Fee Loss Ratio**       | Доля комиссий в P&L         | `(комиссии /                                        | P&L            | ) \* 100` | Journal Metrics |
| **Slippage Analysis**    | Проскальзывание в bps       | `(realized_price - expected_price) / price * 10000` | Pro Analytics  |
| **Priority Fee Overpay** | Переплата за приоритет      | `paid_priority_fee - optimal_priority_fee`          | Pro Analytics  |
| **Reverted TX Cost**     | Газ на неудачные транзакции | Сумма газа на failed tx                             | Pro Analytics  |
| **MEV-комиссия**         | Взятки валидаторам          | Сумма bribes через dark pools                       | Pro Analytics  |

#### 2.4. Анализ портфельных активов

| Метрика                     | Описание                       | Формула                             | Где показывать |
| --------------------------- | ------------------------------ | ----------------------------------- | -------------- |
| **HHI Index**               | Концентрация портфеля          | `Σ(weight_i²) * 10000`              | Pro Analytics  |
| **Effective N**             | Эффективное количество позиций | `10000 / HHI`                       | Pro Analytics  |
| **Blue Chips vs Memecoins** | Распределение по типу активов  | Разделение по market cap            | Pro Analytics  |
| **Avg Coin Age**            | Средний возраст монет          | Взвешенное среднее времени владения | Pro Analytics  |
| **Touchpoints**             | Количество касаний актива      | Число входов/выходов в токен        | Pro Analytics  |

---

### 3. Institutional Alpha & Forensic Analytics (Pro Only)

#### 3.1. Анализ контрагента и потока заявок

| Метрика                               | Описание                            | Требует                     | Где показывать |
| ------------------------------------- | ----------------------------------- | --------------------------- | -------------- |
| **Retail vs Institutional PnL Split** | PnL по типам контрагентов           | Кластеризация адресов       | Pro Analytics  |
| **Signal vs Noise PnL**               | PnL от смарт-кошельков vs случайных | База смарт-кошельков        | Pro Analytics  |
| **Flow Toxicity Score**               | Токсичность потока ордеров          | Анализ мэмпула              | Pro Analytics  |
| **CEX-DEX Arbitrage Index**           | Частота быть exit liquidity         | Синхронизация с CEX данными | Pro Analytics  |
| **Sandwich Vulnerability**            | Вероятность сэндвича                | Анализ slippage + liquidity | Pro Analytics  |
| **Copy-Trade Detection**              | Кто копирует мои сделки             | Кластеризация кошельков     | Pro Analytics  |
| **JIT Attack Detection**              | Атаки Just-in-Time ликвидности      | Анализ пулов                | Pro Analytics  |

#### 3.2. Симуляция и атрибуция исполнения

| Метрика                       | Описание                        | Формула                                  | Где показывать |
| ----------------------------- | ------------------------------- | ---------------------------------------- | -------------- |
| **Realized vs VWAP**          | Цена vs средневзвешенная блока  | `my_price - block_VWAP`                  | Pro Analytics  |
| **Missed Alpha**              | Упущенная выгода                | `close_price - price_after_15/60/240min` | Pro Analytics  |
| **Cancel/Replace Efficiency** | Эффективность изменения ордеров | Анализ отмен vs исполнений               | Pro Analytics  |
| **Optimal Stop Simulation**   | Идеальный стоп по ATR           | Постфактум расчёт optimal stop           | Pro Analytics  |
| **Optimal Kelly Size**        | Рекомендуемый размер позиции    | Критерий Келли по истории                | Pro Analytics  |

#### 3.3. Психометрика

| Метрика                              | Описание                         | Формула                                    | Где показывать |
| ------------------------------------ | -------------------------------- | ------------------------------------------ | -------------- |
| **Tunnel Vision Index**              | Туннельный зрение                | Увеличение сделок в одном токене           | Pro Analytics  |
| **Revenge Trading Score**            | Месть рынку                      | Скорость противоположной сделки после loss | Pro Analytics  |
| **Familiarity Bias**                 | Смещение к знакомому             | Перевес знакомых токенов                   | Pro Analytics  |
| **Session Decay**                    | Усталость по времени             | Quality(decreasing) vs session_time        | Pro Analytics  |
| **Disposition Effect Delta**         | Резать прибыль vs терпеть убыток | `avg_win_time / avg_loss_time`             | Pro Analytics  |
| **Day-over-Day PnL Autocorrelation** | Влияние вчерашнего PnL           | Корреляция PnL(t) vs PnL(t-1)              | Pro Analytics  |

#### 3.4. Продвинутый риск

| Метрика                        | Описание                        | Формула                                    | Где показывать |
| ------------------------------ | ------------------------------- | ------------------------------------------ | -------------- |
| **Conditional VaR**            | Value at Risk с условиями       | CVaR(95%) по портфелю                      | Pro Analytics  |
| **Distance to Liq (Std Devs)** | Дистанция до ликвидации         | `(liq_price - current_price) / volatility` | Pro Analytics  |
| **Liquidity Cluster Risk**     | Риск ликвидности пулов          | Глубина TVL vs position_size               | Pro Analytics  |
| **Endogenous Risk Score**      | Влияние своих действий на рынок | `slippage * position_size`                 | Pro Analytics  |
| **Black Swan Sync**            | Синхронизация с кризисами       | Наложение на LUNA/FTX/SVB даты             | Pro Analytics  |
| **Credit Risk (CEX)**          | Риск CEX экспозиции             | Корреляция вывода с news                   | Pro Analytics  |

#### 3.5. Бенчмаркинг и сентимент

| Метрика                     | Описание                  | Требует                         | Где показывать |
| --------------------------- | ------------------------- | ------------------------------- | -------------- |
| **CT Lead/Lag Index**       | Опережение Crypto Twitter | Анализ соцсетей                 | Pro Analytics  |
| **Peer Percentile**         | Процентиль среди когорты  | Агрегированные данные платформы | Pro Analytics  |
| **Whale Mimicry Score**     | Копирование китов         | Пересечение со smart money      | Pro Analytics  |
| **Funding Rate Divergence** | Дивергенция фандинга      | Сравнение funding rates         | Pro Analytics  |

---

## 📍 Где какие метрики показывать

### Dashboard (Главная страница)

**Free:**

- Общий баланс
- P&L сегодня
- Сделок всего

**Pro (внизу с lock или в отдельной секции):**

- Общий P&L
- Win Rate
- Общий объём

### Journal (Журнал сделок)

**Free (всегда):**

- Список сделок
- Календарь
- Win Rate
- Total P&L

**Pro (в разделе "Аналитика"):**

- Все метрики из раздела 2
- Продвинутая поведенческая аналитика
- Комиссионная эффективность
- Анализ портфеля

### Pro Analytics (Отдельная страница)

**Только для Pro подписчиков:**

- Все метрики из раздела 3
- AI Insights
- Forensic Analysis
- Institutional metrics

---

## 🔐 Защита Pro метрик

```typescript
// 1. Фронтенд защита
<ProFeature fallback={<LockComponent />}>
  <AdvancedChart data={proData} />
</ProFeature>

// 2. Бэкенд защита
app.get('/api/analytics/pro', authenticate, requirePro, (req, res) => {
  // Только если user.pro === true
  res.json(proAnalytics);
});

// 3. Пропуск метрик через фильтр
function filterMetrics(metrics: Metric[], user: User) {
  return metrics.filter(m =>
    m.pro === false || user.hasProSubscription
  );
}
```

---

**Версия:** 1.0.0  
**Обновлено:** 2025-01-20
