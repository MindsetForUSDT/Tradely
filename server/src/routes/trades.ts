import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
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
const manualTradeSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,12}([/-][A-Z0-9]{2,12})?$/),
  side: z.enum(['buy', 'sell']),
  amount: z.coerce.number().positive().max(1_000_000_000),
  price_usd: z.coerce.number().positive().max(1_000_000_000),
  value_usd: z.coerce.number().nonnegative().max(10_000_000_000),
  fee_usd: z.coerce.number().nonnegative().max(10_000_000),
  timestamp: z.string().datetime(),
  raw_data: z.string().max(10_000).optional(),
});
const contextUpdateSchema = z
  .object({
    raw_data: z.string().max(10_000).optional(),
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
    const trade = await prisma.trade.create({
      data: {
        user_id: req.userId!,
        symbol: parsed.data.symbol,
        side: parsed.data.side,
        amount: parsed.data.amount,
        price_usd: parsed.data.price_usd,
        value_usd: parsed.data.value_usd,
        fee_usd: parsed.data.fee_usd,
        timestamp: new Date(parsed.data.timestamp),
        raw_data: parsed.data.raw_data,
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
  const result = await prisma.trade.updateMany({
    where: { id: String(req.params.id), user_id: req.userId! },
    data: parsed.data,
  });
  if (!result.count) return res.status(404).json({ error: 'Сделка не найдена' });
  return res.json({ success: true });
});

export default router;
