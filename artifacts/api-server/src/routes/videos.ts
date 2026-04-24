import { Router, type IRouter } from "express";
import {
  CreateVideoBody,
  CreateVideoResponse,
  GetFeedResponse,
  GetFollowingFeedResponse,
  GetVideoResponse,
  DeleteVideoResponse,
  LikeVideoResponse,
  UnlikeVideoResponse,
  GetCommentsResponse,
  AddCommentBody,
  AddCommentResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  videosTable,
  likesTable,
  commentsTable,
  followsTable,
  notificationsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireMe } from "../lib/auth";
import { buildUserSummaries } from "../lib/userSummary";

const router: IRouter = Router();

async function shapeVideos(meId: number, vids: typeof videosTable.$inferSelect[]) {
  if (vids.length === 0) return [];
  const userIds = Array.from(new Set(vids.map((v) => v.userId)));
  const summaries = await buildUserSummaries(meId, userIds);
  const likedRows = await db
    .select({ videoId: likesTable.videoId })
    .from(likesTable)
    .where(
      and(
        eq(likesTable.userId, meId),
        inArray(
          likesTable.videoId,
          vids.map((v) => v.id),
        ),
      ),
    );
  const liked = new Set(likedRows.map((r) => r.videoId));
  return vids.map((v) => ({
    id: v.id,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    caption: v.caption,
    likesCount: v.likesCount,
    commentsCount: v.commentsCount,
    liked: liked.has(v.id),
    createdAt: v.createdAt.toISOString(),
    author: summaries.get(v.userId)!,
  }));
}

router.get("/videos/feed", requireMe, async (req, res) => {
  const meId = req.meId!;
  const vids = await db
    .select()
    .from(videosTable)
    .orderBy(desc(videosTable.createdAt))
    .limit(50);
  res.json(GetFeedResponse.parse(await shapeVideos(meId, vids)));
});

router.get("/videos/following", requireMe, async (req, res) => {
  const meId = req.meId!;
  const followingRows = await db
    .select({ followingId: followsTable.followingId })
    .from(followsTable)
    .where(eq(followsTable.followerId, meId));
  const ids = followingRows.map((r) => r.followingId);
  if (ids.length === 0) {
    res.json([]);
    return;
  }
  const vids = await db
    .select()
    .from(videosTable)
    .where(inArray(videosTable.userId, ids))
    .orderBy(desc(videosTable.createdAt))
    .limit(50);
  res.json(GetFollowingFeedResponse.parse(await shapeVideos(meId, vids)));
});

router.post("/videos", requireMe, async (req, res) => {
  const meId = req.meId!;
  const body = CreateVideoBody.parse(req.body);
  const inserted = await db
    .insert(videosTable)
    .values({
      userId: meId,
      videoUrl: body.videoUrl,
      thumbnailUrl: body.thumbnailUrl,
      caption: body.caption,
    })
    .returning();
  await db
    .update(usersTable)
    .set({ videosCount: sql`${usersTable.videosCount} + 1` })
    .where(eq(usersTable.id, meId));
  const v = inserted[0]!;
  const summaries = await buildUserSummaries(meId, [meId]);
  res.json(
    CreateVideoResponse.parse({
      id: v.id,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      caption: v.caption,
      likesCount: 0,
      commentsCount: 0,
      liked: false,
      createdAt: v.createdAt.toISOString(),
      author: summaries.get(meId)!,
    }),
  );
});

router.get("/videos/:id", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  const vids = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (vids.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const shaped = await shapeVideos(meId, vids);
  res.json(GetVideoResponse.parse(shaped[0]));
});

router.delete("/videos/:id", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  const vids = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (vids.length === 0 || vids[0]!.userId !== meId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(commentsTable).where(eq(commentsTable.videoId, id));
  await db.delete(likesTable).where(eq(likesTable.videoId, id));
  await db.delete(videosTable).where(eq(videosTable.id, id));
  await db
    .update(usersTable)
    .set({ videosCount: sql`GREATEST(${usersTable.videosCount} - 1, 0)` })
    .where(eq(usersTable.id, meId));
  res.json(DeleteVideoResponse.parse({ ok: true }));
});

router.post("/videos/:id/like", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  const vids = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (vids.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const existing = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.userId, meId), eq(likesTable.videoId, id)));
  if (existing.length === 0) {
    await db.insert(likesTable).values({ userId: meId, videoId: id });
    await db
      .update(videosTable)
      .set({ likesCount: sql`${videosTable.likesCount} + 1` })
      .where(eq(videosTable.id, id));
    await db
      .update(usersTable)
      .set({ likesCount: sql`${usersTable.likesCount} + 1` })
      .where(eq(usersTable.id, vids[0]!.userId));
    if (vids[0]!.userId !== meId) {
      const me = (
        await db.select().from(usersTable).where(eq(usersTable.id, meId))
      )[0]!;
      await db.insert(notificationsTable).values({
        receiverId: vids[0]!.userId,
        actorId: meId,
        type: "like",
        message: `@${me.username} liked your video`,
        videoId: id,
      });
    }
  }
  const refreshed = (
    await db.select().from(videosTable).where(eq(videosTable.id, id))
  )[0]!;
  res.json(LikeVideoResponse.parse({ liked: true, likesCount: refreshed.likesCount }));
});

router.post("/videos/:id/unlike", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  const vids = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (vids.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const deleted = await db
    .delete(likesTable)
    .where(and(eq(likesTable.userId, meId), eq(likesTable.videoId, id)))
    .returning({ id: likesTable.id });
  if (deleted.length > 0) {
    await db
      .update(videosTable)
      .set({ likesCount: sql`GREATEST(${videosTable.likesCount} - 1, 0)` })
      .where(eq(videosTable.id, id));
    await db
      .update(usersTable)
      .set({ likesCount: sql`GREATEST(${usersTable.likesCount} - 1, 0)` })
      .where(eq(usersTable.id, vids[0]!.userId));
  }
  const refreshed = (
    await db.select().from(videosTable).where(eq(videosTable.id, id))
  )[0]!;
  res.json(UnlikeVideoResponse.parse({ liked: false, likesCount: refreshed.likesCount }));
});

router.get("/videos/:id/comments", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  const rows = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.videoId, id))
    .orderBy(desc(commentsTable.createdAt))
    .limit(100);
  const summaries = await buildUserSummaries(
    meId,
    rows.map((r) => r.userId),
  );
  res.json(
    GetCommentsResponse.parse(
      rows.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: summaries.get(c.userId)!,
      })),
    ),
  );
});

router.post("/videos/:id/comments", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  const body = AddCommentBody.parse(req.body);
  const vids = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (vids.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const inserted = await db
    .insert(commentsTable)
    .values({ videoId: id, userId: meId, body: body.body })
    .returning();
  await db
    .update(videosTable)
    .set({ commentsCount: sql`${videosTable.commentsCount} + 1` })
    .where(eq(videosTable.id, id));
  if (vids[0]!.userId !== meId) {
    const me = (
      await db.select().from(usersTable).where(eq(usersTable.id, meId))
    )[0]!;
    await db.insert(notificationsTable).values({
      receiverId: vids[0]!.userId,
      actorId: meId,
      type: "comment",
      message: `@${me.username} commented: ${body.body.slice(0, 80)}`,
      videoId: id,
    });
  }
  const c = inserted[0]!;
  const summaries = await buildUserSummaries(meId, [meId]);
  res.json(
    AddCommentResponse.parse({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: summaries.get(meId)!,
    }),
  );
});

export default router;
