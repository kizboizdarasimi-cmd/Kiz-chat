import { Router, type IRouter } from "express";
import {
  GetTrendingVideosResponse,
  GetTrendingUsersResponse,
  GetNewestVideosResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  videosTable,
  likesTable,
} from "@workspace/db";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { requireMe } from "../lib/auth";
import { buildUserSummaries } from "../lib/userSummary";

const router: IRouter = Router();

async function shapeVideos(
  meId: number,
  vids: typeof videosTable.$inferSelect[],
) {
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

router.get("/explore/videos/trending", requireMe, async (req, res) => {
  const meId = req.meId!;
  const vids = await db
    .select()
    .from(videosTable)
    .orderBy(
      desc(sql`${videosTable.likesCount} + ${videosTable.commentsCount} * 2`),
      desc(videosTable.createdAt),
    )
    .limit(60);
  res.json(GetTrendingVideosResponse.parse(await shapeVideos(meId, vids)));
});

router.get("/explore/videos/newest", requireMe, async (req, res) => {
  const meId = req.meId!;
  const vids = await db
    .select()
    .from(videosTable)
    .orderBy(desc(videosTable.createdAt))
    .limit(60);
  res.json(GetNewestVideosResponse.parse(await shapeVideos(meId, vids)));
});

router.get("/explore/users/trending", requireMe, async (req, res) => {
  const meId = req.meId!;
  const rows = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.id, meId))
    .orderBy(desc(usersTable.followersCount), desc(usersTable.likesCount))
    .limit(40);
  const summaries = await buildUserSummaries(
    meId,
    rows.map((r) => r.id),
  );
  res.json(
    GetTrendingUsersResponse.parse(rows.map((r) => summaries.get(r.id)!)),
  );
});

export default router;
