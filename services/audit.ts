import "server-only";
import { db } from "@/db";
import { log } from "@/lib/logger";

/** Append-only audit trail for security-relevant and administrative actions. */
export async function audit(action: string, opts: { actorId?: string | null; target?: string | null; metadata?: Record<string, unknown>; ip?: string | null } = {}) {
  try {
    await db().ops.audit({ actorId: opts.actorId ?? null, action, target: opts.target ?? null, metadata: opts.metadata ?? null, ip: opts.ip ?? null });
  } catch (e) {
    log.error("audit", "Failed to write audit log", { action, error: (e as Error).message });
  }
}
