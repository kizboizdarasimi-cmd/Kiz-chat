import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const likesTable = pgTable(
  "likes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    videoId: integer("video_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("likes_user_video_unique").on(t.userId, t.videoId)],
);

export type LikeRow = typeof likesTable.$inferSelect;
