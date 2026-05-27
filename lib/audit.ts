import { prisma } from '@/lib/prisma';

interface AuditEntry {
  actor: string;
  actorIp?: string;
  action: string;
  targetType: 'QUOTE' | 'INVOICE' | 'CLIENT' | 'SETTINGS' | 'PAYMENT' | 'EMAIL' | 'USER';
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        actor: entry.actor,
        actorIp: entry.actorIp,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata as never,
      },
    });
  } catch (err) {
    console.error('Audit write failed:', err);
  }
}
