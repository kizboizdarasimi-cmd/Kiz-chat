import { Router, type IRouter } from "express";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
  RequestVerificationResponse,
  SearchUsersQueryParams,
  GetUserByUsernameResponse,
  GetUserFollowersResponse,
  GetUserFollowingResponse,
  GetUserVideosResponse,
  FollowUserResponse,
  UnfollowUserResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  followsTable,
  videosTable,
  likesTable,
  notificationsTable,
} from "@workspace/db";
import { and, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { requireMe } from "../lib/auth";
import { buildUserSummaries } from "../lib/userSummary";

const router: IRouter = Router();

router.get("/me", requireMe, async (req, res) => {
  const meId = req.meId!;
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, meId));
  const me = rows[0]!;
  const data = GetMeResponse.parse({
    id: me.id,
    clerkId: me.clerkId,
    username: me.username,
    displayName: me.displayName,
    bio: me.bio,
    profilePicture: me.profilePicture,
    isVerified: me.isVerified,
    verificationRequested: me.verificationRequested,
    followersCount: me.followersCount,
    followingCount: me.followingCount,
    videosCount: me.videosCount,
    createdAt: me.createdAt.toISOString(),
  });
  res.json(data);
});

router.patch("/me", requireMe, async (req, res) => {
  const meId = req.meId!;
  const body = UpdateMeBody.parse(req.body ?? {});
  const update: Record<string, unknown> = {};
  if (typeof body.displayName === "string") update.displayName = body.displayName;
  if (typeof body.bio === "string") update.bio = body.bio;
  if (typeof body.profilePicture === "string")
    update.profilePicture = body.profilePicture;
  if (Object.keys(update).length > 0) {
    await db.update(usersTable).set(update).where(eq(usersTable.id, meId));
  }
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, meId));
  const me = rows[0]!;
  const data = UpdateMeResponse.parse({
    id: me.id,
    clerkId: me.clerkId,
    username: me.username,
    displayName: me.displayName,
    bio: me.bio,
    profilePicture: me.profilePicture,
    isVerified: me.isVerified,
    verificationRequested: me.verificationRequested,
    followersCount: me.followersCount,
    followingCount: me.followingCount,
    videosCount: me.videosCount,
    createdAt: me.createdAt.toISOString(),
  });
  res.json(data);
});

router.post("/me/request-verification", requireMe, async (req, res) => {
  const meId = req.meId!;
  await db
    .update(usersTable)
    .set({ verificationRequested: true })
    .where(eq(usersTable.id, meId));
  const data = RequestVerificationResponse.parse({ verificationRequested: true });
  res.json(data);
});

router.get("/users/search", requireMe, async (req, res) => {
  const meId = req.meId!;
  const params = SearchUsersQueryParams.parse({ q: req.query.q ?? "" });
  const q = (params.q ?? "").trim();
  if (!q) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, meId),
        sql`(${usersTable.username} ILIKE ${`%${q}%`} OR ${usersTable.displayName} ILIKE ${`%${q}%`})`,
      ),
    )
    .limit(40);
  const summaries = await buildUserSummaries(
    meId,
    rows.map((r) => r.id),
  );
  res.json(rows.map((r) => summaries.get(r.id)!));
});

router.get("/users/:username", requireMe, async (req, res) => {
  const meId = req.meId!;
  const username = String(req.params.username);
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const u = rows[0]!;
  let isFollowing = false;
  if (u.id !== meId) {
    const f = await db
      .select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.followerId, meId),
          eq(followsTable.followingId, u.id),
        ),
      );
    isFollowing = f.length > 0;
  }
  const data = GetUserByUsernameResponse.parse({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    profilePicture: u.profilePicture,
    isVerified: u.isVerified,
    followersCount: u.followersCount,
    followingCount: u.followingCount,
    videosCount: u.videosCount,
    likesCount: u.likesCount,
    isFollowing,
    isMe: u.id === meId,
  });
  res.json(data);
});

router.get("/users/:username/followers", requireMe, async (req, res) => {
  const meId = req.meId!;
  const target = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (target.length === 0) {
    res.json([]);
    return;
  }
  const rows = await db
    .select({ followerId: followsTable.followerId })
    .from(followsTable)
    .where(eq(followsTable.followingId, target[0]!.id))
    .orderBy(desc(followsTable.createdAt))
    .limit(100);
  const ids = rows.map((r) => r.followerId);
  const summaries = await buildUserSummaries(meId, ids);
  res.json(GetUserFollowersResponse.parse(ids.map((id) => summaries.get(id)!)));
});

router.get("/users/:username/following", requireMe, async (req, res) => {
  const meId = req.meId!;
  const target = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (target.length === 0) {
    res.json([]);
    return;
  }
  const rows = await db
    .select({ followingId: followsTable.followingId })
    .from(followsTable)
    .where(eq(followsTable.followerId, target[0]!.id))
    .orderBy(desc(followsTable.createdAt))
    .limit(100);
  const ids = rows.map((r) => r.followingId);
  const summaries = await buildUserSummaries(meId, ids);
  res.json(GetUserFollowingResponse.parse(ids.map((id) => summaries.get(id)!)));
});

router.get("/users/:username/videos", requireMe, async (req, res) => {
  const meId = req.meId!;
  const target = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (target.length === 0) {
    res.json([]);
    return;
  }
  const u = target[0]!;
  const vids = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.userId, u.id))
    .orderBy(desc(videosTable.createdAt))
    .limit(100);
  const summaries = await buildUserSummaries(meId, [u.id]);
  const liked = vids.length
    ? new Set(
        (
          await db
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
            )
        ).map((r) => r.videoId),
      )
    : new Set<number>();
  const data = vids.map((v) => ({
    id: v.id,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    caption: v.caption,
    likesCount: v.likesCount,
    commentsCount: v.commentsCount,
    liked: liked.has(v.id),
    createdAt: v.createdAt.toISOString(),
    author: summaries.get(u.id)!,
  }));
  res.json(GetUserVideosResponse.parse(data));
});

router.post("/users/:username/follow", requireMe, async (req, res) => {
  const meId = req.meId!;
  const target = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (target.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const t = target[0]!;
  if (t.id === meId) {
    res.status(400).json({ error: "Cannot follow yourself" });
    return;
  }
  const existing = await db
    .select()
    .from(followsTable)
    .where(
      and(
        eq(followsTable.followerId, meId),
        eq(followsTable.followingId, t.id),
      ),
    );
  if (existing.length === 0) {
    await db
      .insert(followsTable)
      .values({ followerId: meId, followingId: t.id });
    await db
      .update(usersTable)
      .set({ followersCount: sql`${usersTable.followersCount} + 1` })
      .where(eq(usersTable.id, t.id));
    await db
      .update(usersTable)
      .set({ followingCount: sql`${usersTable.followingCount} + 1` })
      .where(eq(usersTable.id, meId));
    const me = (
      await db.select().from(usersTable).where(eq(usersTable.id, meId))
    )[0]!;
    await db.insert(notificationsTable).values({
      receiverId: t.id,
      actorId: meId,
      type: "follow",
      message: `@${me.username} started following you`,
    });
  }
  const refreshed = (
    await db.select().from(usersTable).where(eq(usersTable.id, t.id))
  )[0]!;
  res.json(
    FollowUserResponse.parse({
      isFollowing: true,
      followersCount: refreshed.followersCount,
    }),
  );
});

router.post("/users/:username/unfollow", requireMe, async (req, res) => {
  const meId = req.meId!;
  const target = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (target.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const t = target[0]!;
  const deleted = await db
    .delete(followsTable)
    .where(
      and(
        eq(followsTable.followerId, meId),
        eq(followsTable.followingId, t.id),
      ),
    )
    .returning({ id: followsTable.id });
  if (deleted.length > 0) {
    await db
      .update(usersTable)
      .set({
        followersCount: sql`GREATEST(${usersTable.followersCount} - 1, 0)`,
      })
      .where(eq(usersTable.id, t.id));
    await db
      .update(usersTable)
      .set({
        followingCount: sql`GREATEST(${usersTable.followingCount} - 1, 0)`,
      })
      .where(eq(usersTable.id, meId));
  }
  const refreshed = (
    await db.select().from(usersTable).where(eq(usersTable.id, t.id))
  )[0]!;
  res.json(
    UnfollowUserResponse.parse({
      isFollowing: false,
      followersCount: refreshed.followersCount,
    }),
  );
});

export default router;
