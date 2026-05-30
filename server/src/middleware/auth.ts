import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Проверяем JWT токен
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.sub;
    next();
  } catch (err: any) {
    console.log('[requireAuth] Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
