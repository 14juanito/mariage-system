import { prisma } from "@/lib/prisma";

export async function writeAuditLog(entry: {
  weddingId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        weddingId: entry.weddingId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata as never,
      },
    });
  } catch (err) {
    // L'audit ne doit jamais faire échouer l'action métier elle-même.
    console.error("[audit] échec de l'écriture du journal :", err);
  }
}
