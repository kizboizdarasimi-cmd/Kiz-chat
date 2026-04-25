import {
  pgTable,
  serial,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const chatSettingsTable = pgTable(
  "chat_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    partnerId: integer("partner_id").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("chat_settings_unique").on(t.userId, t.partnerId)],
);

export type ChatSettingsRow = typeof chatSettingsTable.$inferSelect;
