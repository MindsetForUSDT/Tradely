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

    res.json(profile);
  } catch (error) {
    console.error('[Profile GET]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.update({
      where: { clerk_id: req.userId! },
      data: req.body,
    });

    res.json(profile);
  } catch (error) {
    console.error('[Profile PATCH]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
