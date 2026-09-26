import "server-only";
import { cache } from "react";
import { DEFAULT_SITE_CONTENT } from "@/config/site";
import { db } from "@/db";
import type { SiteContent } from "@/types/domain";

/** Admin-managed homepage content with safe defaults. */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    const c = await db().ops.getSiteContent();
    if (c) return { ...DEFAULT_SITE_CONTENT, ...c };
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULT_SITE_CONTENT, updatedAt: new Date(0).toISOString() };
});
