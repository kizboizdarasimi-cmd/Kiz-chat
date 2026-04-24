import { Router, type IRouter } from "express";
import {
  GetNotificationsResponse,
  GetUnreadCountResponse,
  MarkAllNotificationsReadResponse,
} from "@workspace/api-zod";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireMe } from "../lib/auth";
import { buildUserSummaries } from "../lib/userSummary";

const router: IRouter = Router();

router.get("/notifications", requireMe, async (req, res) => {
  const meId = req.meId!;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.receiverId, meId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  const actorIds = rows
    .map((r) => r.actorId)
    .filter((x): x is number => x !== null && x !== undefined);
  const summaries = await buildUserSummaries(meId, actorIds);
  res.json(
    GetNotificationsResponse.parse(
      rows.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        videoId: n.videoId ?? null,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        actor: n.actorId ? summaries.get(n.actorId) ?? null : null,
      })),
    ),
  );
});

router.get("/notifications/unread-count", requireMe, async (req, res) => {
  const meId = req.meId!;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.receiverId, meId),
        eq(notificationsTable.isRead, false),
      ),
    );
  res.json(GetUnreadCountResponse.parse({ count: rows[0]?.count ?? 0 }));
});

router.post("/notifications/read-all", requireMe, async (req, res) => {
  const meId = req.meId!;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.receiverId, meId));
  res.json(MarkAllNotificationsReadResponse.parse({ ok: true }));
});

export default router;
