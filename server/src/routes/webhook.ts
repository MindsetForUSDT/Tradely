import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

router.post('/clerk', async (req, res) => {
  const { type, data } = req.body;

  try {
    if (type === 'user.created' || type === 'user.updated') {
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address;
      const username = data.username || data.first_name || email?.split('@')[0];
      const avatarUrl = data.image_url;

      await prisma.profile.upsert({
        where: { clerk_id: clerkId },
        update: {
          email: email || '',
          username: username || '',
          avatar_url: avatarUrl,
        },
        create: {
          clerk_id: clerkId,
          email: email || '',
          username: username || '',
          avatar_url: avatarUrl,
          subscription_tier: 'free',
        },
      });

      res.json({ success: true });
      return;
    }

    if (type === 'user.deleted') {
      const clerkId = data.id;

      await prisma.profile.deleteMany({
        where: { clerk_id: clerkId },
      });

      res.json({ success: true });
      return;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Clerk Webhook]', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
