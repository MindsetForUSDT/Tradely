import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requiredSecret } from '../config/env.js';

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  sub: string;
  typ: 'access';
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.td_access;
  const bearerToken = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = cookieToken || bearerToken;

  if (!token) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }

  try {
    const decoded = jwt.verify(token, requiredSecret('JWT_SECRET'), {
      issuer: 'tradeumdiary-api',
      audience: 'tradeumdiary-web',
    }) as JwtPayload;
    if (decoded.typ !== 'access' || !decoded.sub) throw new Error('Invalid token type');
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Сессия истекла' });
  }
}
