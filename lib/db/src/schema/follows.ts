import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const followsTable = pgTable(
  "follows",
  {
    id: serial("id").primaryKey(),
    followerId: integer("follower_id").notNull(),
    followingId: integer("following_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("follows_follower_following_unique").on(
      t.followerId,
      t.followingId,
    ),
    index("follows_following_idx").on(t.followingId),
  ],
);

export type FollowRow = typeof followsTable.$inferSelect;
