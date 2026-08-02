import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth.js';
import { getEntitlements } from '../services/entitlements.js';

export async function requirePro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entitlements = await getEntitlements(req.userId!);
    if (entitlements.tier !== 'pro') {
      res.status(403).json({
        error: 'Эта возможность доступна в PRO',
        code: 'PRO_REQUIRED',
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
