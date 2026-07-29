import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(5_000).default(50),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  orderBy: z.enum(['timestamp', 'pnl_realized', 'value_usd']).default('timestamp'),
  ascending: z.enum(['true', 'false']).default('false'),
  includeNonFinal: z.enum(['true', 'false']).default('false'),
  symbol: z.string().trim().max(40).optional(),
  side: z.enum(['buy', 'sell', 'long', 'short']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  walletId: z.string().uuid().optional(),
});
const manualTradeSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,12}([/-][A-Z0-9]{2,12})?$/),
    side: z.enum(['buy', 'sell']),
    amount: z.coerce.number().positive().max(1_000_000_000),
    entry_price: z.coerce.number().positive().max(1_000_000_000),
    exit_price: z.coerce.number().positive().max(1_000_000_000),
    fee_usd: z.coerce.number().nonnegative().max(10_000_000),
    opened_at: z.string().datetime(),
    closed_at: z.string().datetime(),
    stop_loss: z.coerce.number().positive().max(1_000_000_000).optional(),
    strategy: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(4_000).optional(),
    mistake: z.string().trim().max(100).optional(),
    emotion: z.string().trim().max(100).optional(),
    plan_score: z.coerce.number().min(0).max(10).optional(),
  })
  .refine((trade) => new Date(trade.closed_at) >= new Date(trade.opened_at), {
    message: 'Время закрытия должно быть позже времени открытия',
    path: ['closed_at'],
  });
const contextUpdateSchema = z
  .object({
    strategy: z.string().trim().max(100).nullable().optional(),
    mistake: z
      .enum(['early-entry', 'late-exit', 'oversize', 'revenge', 'no-plan'])
      .nullable()
      .optional(),
    emotion: z.enum(['calm', 'fear', 'fomo', 'greed', 'anger']).nullable().optional(),
    planScore: z.coerce.number().min(0).max(10).nullable().optional(),
    stopLoss: z.coerce.number().positive().max(1_000_000_000).nullable().optional(),
    notes: z.string().trim().max(4_000).nullable().optional(),
  })
  .strict();
const bulkWalletSchema = z.object({
  old_wallet_id: z.string().uuid(),
  new_wallet_id: z.string().uuid(),
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Некорректные параметры фильтра' });

  try {
    const query = parsed.data;
    const where: Prisma.TradeWhereInput = {
      user_id: req.userId!,
      ...(query.includeNonFinal === 'true' ? {} : { status: 'closed' }),
      ...(query.symbol ? { symbol: { contains: query.symbol, mode: 'insensitive' } } : {}),
      ...(query.side ? { side: query.side } : {}),
      ...(query.walletId ? { wallet_id: query.walletId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            timestamp: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { [query.orderBy]: query.ascending === 'true' ? 'asc' : 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.trade.count({ where }),
    ]);
    return res.json({ trades, total });
  } catch (error) {
    console.error('[Trades GET]', error);
    return res.status(500).json({ error: 'Не удалось загрузить сделки' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = manualTradeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message || 'Некорректная сделка' });
  }

  try {
    const input = parsed.data;
    const multiplier = input.side === 'buy' ? 1 : -1;
    const grossPnl = (input.exit_price - input.entry_price) * input.amount * multiplier;
    const netPnl = grossPnl - input.fee_usd;
    const trade = await prisma.trade.create({
      data: {
        user_id: req.userId!,
        symbol: input.symbol,
        side: input.side,
        amount: input.amount,
        price_usd: input.exit_price,
        value_usd: input.entry_price * input.amount,
        fee_usd: input.fee_usd,
        pnl_realized: netPnl,
        timestamp: new Date(input.closed_at),
        raw_data: JSON.stringify({
          version: 3,
          finalTrade: true,
          marketType: 'manual',
          entryPrice: input.entry_price,
          exitPrice: input.exit_price,
          openedAt: input.opened_at,
          closedAt: input.closed_at,
          grossPnl,
          tradingFees: input.fee_usd,
          fundingAndAdjustments: 0,
          netPnl,
          stopLoss: input.stop_loss,
          strategy: input.strategy,
          notes: input.notes,
          mistake: input.mistake,
          emotion: input.emotion,
          planScore: input.plan_score,
        }),
        status: 'closed',
        exchange: 'manual',
        import_source: 'manual',
      },
    });
    return res.status(201).json(trade);
  } catch (error) {
    console.error('[Trades POST]', error);
    return res.status(500).json({ error: 'Не удалось добавить сделку' });
  }
});

router.patch('/bulk-update-wallet', requireAuth, async (req: AuthRequest, res) => {
  const parsed = bulkWalletSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Некорректные источники' });

  const ownedWallets = await prisma.wallet.count({
    where: {
      id: { in: [parsed.data.old_wallet_id, parsed.data.new_wallet_id] },
      user_id: req.userId!,
    },
  });
  if (ownedWallets !== 2) return res.status(404).json({ error: 'Источник не найден' });

  const updated = await prisma.trade.updateMany({
    where: { user_id: req.userId!, wallet_id: parsed.data.old_wallet_id },
    data: { wallet_id: parsed.data.new_wallet_id },
  });
  return res.json({ success: true, updated: updated.count });
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = contextUpdateSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'Можно изменять только контекст сделки' });
  const existing = await prisma.trade.findFirst({
    where: { id: String(req.params.id), user_id: req.userId! },
    select: { id: true, raw_data: true },
  });
  if (!existing) return res.status(404).json({ error: 'Сделка не найдена' });

  let metadata: Record<string, unknown> = {};
  try {
    const decoded = existing.raw_data ? JSON.parse(existing.raw_data) : {};
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) metadata = decoded;
  } catch {
    metadata = {};
  }

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === null || value === '') delete metadata[key];
    else if (value !== undefined) metadata[key] = value;
  }

  const trade = await prisma.trade.update({
    where: { id: existing.id },
    data: { raw_data: JSON.stringify(metadata) },
  });
  return res.json(trade);
});

export default router;
