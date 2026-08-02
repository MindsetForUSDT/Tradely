import { prisma } from '../db.js';

export interface Entitlements {
  tier: 'free' | 'pro';
  historyDays: number;
  sourcesMax: number;
  syncIntervalMinutes: number;
  strategyComparison: boolean;
  riskManager: boolean;
}

export function buildEntitlements(
  profile: {
    subscription_tier: string;
    subscription_expires_at: Date | null;
  },
  now = new Date()
): Entitlements {
  const pro =
    profile.subscription_tier === 'pro' &&
    Boolean(profile.subscription_expires_at && profile.subscription_expires_at > now);
  return pro
    ? {
        tier: 'pro',
        historyDays: 730,
        sourcesMax: 5,
        syncIntervalMinutes: 60,
        strategyComparison: true,
        riskManager: true,
      }
    : {
        tier: 'free',
        historyDays: 30,
        sourcesMax: 1,
        syncIntervalMinutes: 1_440,
        strategyComparison: false,
        riskManager: false,
      };
}

export async function getEntitlements(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { subscription_tier: true, subscription_expires_at: true },
  });
  if (!profile) throw new Error('Профиль не найден');
  const entitlements = buildEntitlements(profile);
  if (profile.subscription_tier === 'pro' && entitlements.tier === 'free') {
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: userId },
        data: { subscription_tier: 'free', subscription_expires_at: null },
      }),
      prisma.subscription.updateMany({
        where: { user_id: userId, status: 'ACTIVE' },
        data: { status: 'EXPIRED', cancel_at_period_end: true },
      }),
    ]);
  }
  return entitlements;
}
