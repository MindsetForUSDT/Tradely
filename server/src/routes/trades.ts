import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const orderBy = (req.query.orderBy as string) || 'timestamp';
    const ascending = req.query.ascending === 'true';

    // Фильтры
    const where: any = { user_id: profile.id };

    if (req.query.symbol) {
      where.symbol = { contains: req.query.symbol as string, mode: 'insensitive' };
    }
    if (req.query.side) {
      where.side = req.query.side as string;
    }
    if (req.query.dateFrom) {
      where.timestamp = { ...where.timestamp, gte: new Date(req.query.dateFrom as string) };
    }
    if (req.query.dateTo) {
      where.timestamp = { ...where.timestamp, lte: new Date(req.query.dateTo as string) };
    }
    if (req.query.walletId) {
      where.wallet_id = req.query.walletId as string;
    }

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { [orderBy]: ascending ? 'asc' : 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.trade.count({ where });

    res.json({ trades, total });
  } catch (error) {
    console.error('[Trades GET]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const trade = await prisma.trade.create({
      data: {
        ...req.body,
        user_id: profile.id,
      },
    });

    res.json(trade);
  } catch (error) {
    console.error('[Trades POST]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update wallet for trades
router.patch('/bulk-update-wallet', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { old_wallet_id, new_wallet_id } = req.body;

    if (!old_wallet_id || !new_wallet_id) {
      return res.status(400).json({ error: 'old_wallet_id and new_wallet_id required' });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const updated = await prisma.trade.updateMany({
      where: {
        user_id: profile.id,
        wallet_id: old_wallet_id,
      },
      data: {
        wallet_id: new_wallet_id,
      },
    });

    res.json({ success: true, updated: updated.count });
  } catch (error) {
    console.error('[Trades PATCH bulk-update-wallet]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const tradeId = String(req.params.id);
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const trade = await prisma.trade.updateMany({
      where: {
        id: tradeId,
        user_id: profile.id,
      },
      data: req.body,
    });

    if (trade.count === 0) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Trades PATCH]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
