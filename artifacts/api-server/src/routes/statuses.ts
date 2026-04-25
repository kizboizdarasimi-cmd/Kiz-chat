import { Router, type IRouter } from "express";
import {
  GetStatusesResponse,
  CreateStatusBody,
  CreateStatusResponse,
  DeleteStatusResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  statusesTable,
  followsTable,
} from "@workspace/db";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { requireMe } from "../lib/auth";
import { buildUserSummaries } from "../lib/userSummary";

const router: IRouter = Router();

const STATUS_TTL_MS = 24 * 60 * 60 * 1000;

router.get("/statuses", requireMe, async (req, res) => {
  const meId = req.meId!;
  const following = await db
    .select({ followingId: followsTable.followingId })
    .from(followsTable)
    .where(eq(followsTable.followerId, meId));
  const authorIds = Array.from(
    new Set([meId, ...following.map((f) => f.followingId)]),
  );
  const now = new Date();
  const rows = await db
    .select()
    .from(statusesTable)
    .where(
      and(
        inArray(statusesTable.userId, authorIds),
        gt(statusesTable.expiresAt, now),
      ),
    )
    .orderBy(desc(statusesTable.createdAt))
    .limit(500);
  const summaries = await buildUserSummaries(meId, authorIds);

  const grouped = new Map<number, ReturnType<typeof toStatus>[]>();
  for (const r of rows) {
    if (!grouped.has(r.userId)) grouped.set(r.userId, []);
    grouped.get(r.userId)!.push(toStatus(r));
  }
  const data = authorIds
    .filter((id) => grouped.has(id) || id === meId)
    .map((id) => ({
      author: summaries.get(id)!,
      statuses: (grouped.get(id) ?? []).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
      isMe: id === meId,
    }))
    .sort((a, b) => {
      // me first if I have any, then most recent author
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      const at = a.statuses[a.statuses.length - 1]?.createdAt ?? "";
      const bt = b.statuses[b.statuses.length - 1]?.createdAt ?? "";
      return bt.localeCompare(at);
    });

  res.json(GetStatusesResponse.parse(data));
});

router.post("/statuses", requireMe, async (req, res) => {
  const meId = req.meId!;
  const body = CreateStatusBody.parse(req.body);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STATUS_TTL_MS);
  const inserted = await db
    .insert(statusesTable)
    .values({
      userId: meId,
      kind: body.kind,
      body: body.body ?? "",
      mediaUrl: body.mediaUrl ?? "",
      backgroundColor: body.backgroundColor ?? "#ec4899",
      expiresAt,
    })
    .returning();
  const r = inserted[0]!;
  res.json(CreateStatusResponse.parse(toStatus(r)));
});

router.delete("/statuses/:id", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  await db
    .delete(statusesTable)
    .where(and(eq(statusesTable.id, id), eq(statusesTable.userId, meId)));
  res.json(DeleteStatusResponse.parse({ ok: true }));
});

function toStatus(r: typeof statusesTable.$inferSelect) {
  return {
    id: r.id,
    kind: r.kind,
    body: r.body,
    mediaUrl: r.mediaUrl,
    backgroundColor: r.backgroundColor,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  };
}

export default router;
