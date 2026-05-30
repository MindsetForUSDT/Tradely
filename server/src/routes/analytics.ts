import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { clerk_id: req.userId! },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const analytics = await prisma.dailyAnalytics.findMany({
      where: {
        user_id: profile.id,
        date: { gte: fromDate },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ analytics });
  } catch (error) {
    console.error('[Analytics GET]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
