import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const blockedTable = pgTable(
  "blocked_users",
  {
    id: serial("id").primaryKey(),
    blockerId: integer("blocker_id").notNull(),
    blockedId: integer("blocked_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("blocked_unique").on(t.blockerId, t.blockedId),
    index("blocked_blocked_idx").on(t.blockedId),
  ],
);

export type BlockedRow = typeof blockedTable.$inferSelect;
