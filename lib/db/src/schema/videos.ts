import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const videosTable = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    videoUrl: text("video_url").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    caption: text("caption").notNull().default(""),
    likesCount: integer("likes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("videos_user_id_idx").on(t.userId),
    index("videos_created_at_idx").on(t.createdAt),
  ],
);

export type VideoRow = typeof videosTable.$inferSelect;
