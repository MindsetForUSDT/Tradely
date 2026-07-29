import type { Request } from 'express';
import { prisma } from '../db.js';

interface AuditEvent {
  action: string;
  userId?: string | null;
  request?: Request;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: event.action,
        user_id: event.userId || null,
        ip_address: event.request?.ip,
        user_agent: event.request?.get('user-agent')?.slice(0, 500),
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    });
  } catch (error) {
    console.error('[Audit] Failed to write audit event', event.action, error);
  }
}
