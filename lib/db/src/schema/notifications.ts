import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    receiverId: integer("receiver_id").notNull(),
    actorId: integer("actor_id"),
    type: text("type").notNull(),
    message: text("message").notNull(),
    videoId: integer("video_id"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_receiver_idx").on(t.receiverId)],
);

export type NotificationRow = typeof notificationsTable.$inferSelect;
