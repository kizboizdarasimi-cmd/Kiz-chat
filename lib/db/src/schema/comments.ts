import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const commentsTable = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id").notNull(),
    userId: integer("user_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_video_id_idx").on(t.videoId)],
);

export type CommentRow = typeof commentsTable.$inferSelect;
