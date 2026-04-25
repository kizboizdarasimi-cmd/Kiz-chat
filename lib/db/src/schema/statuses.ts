import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const statusesTable = pgTable(
  "statuses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    kind: text("kind").notNull().default("text"),
    body: text("body").notNull().default(""),
    mediaUrl: text("media_url").notNull().default(""),
    backgroundColor: text("background_color").notNull().default("#ec4899"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    index("statuses_user_idx").on(t.userId),
    index("statuses_expires_idx").on(t.expiresAt),
  ],
);

export type StatusRow = typeof statusesTable.$inferSelect;
