import { db, usersTable, followsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

export type UserSummary = {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  profilePicture: string;
  isVerified: boolean;
  followersCount: number;
  isFollowing: boolean;
};

export async function buildUserSummaries(
  meId: number | null,
  userIds: number[],
): Promise<Map<number, UserSummary>> {
  const map = new Map<number, UserSummary>();
  if (userIds.length === 0) return map;
  const uniq = Array.from(new Set(userIds));
  const rows = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, uniq));

  let followingSet = new Set<number>();
  if (meId !== null && uniq.length > 0) {
    const fr = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(
        and(
          eq(followsTable.followerId, meId),
          inArray(followsTable.followingId, uniq),
        ),
      );
    followingSet = new Set(fr.map((r) => r.followingId));
  }

  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      bio: r.bio,
      profilePicture: r.profilePicture,
      isVerified: r.isVerified,
      followersCount: r.followersCount,
      isFollowing: followingSet.has(r.id),
    });
  }
  return map;
}
