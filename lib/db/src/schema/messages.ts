import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").notNull(),
    receiverId: integer("receiver_id").notNull(),
    body: text("body").notNull(),
    kind: text("kind").notNull().default("text"),
    status: text("status").notNull().default("sent"),
    deletedForSender: text("deleted_for_sender").notNull().default("false"),
    deletedForReceiver: text("deleted_for_receiver").notNull().default("false"),
    deletedForEveryone: text("deleted_for_everyone").notNull().default("false"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("messages_sender_receiver_idx").on(t.senderId, t.receiverId),
    index("messages_receiver_idx").on(t.receiverId),
  ],
);

export type MessageRow = typeof messagesTable.$inferSelect;

export const typingTable = pgTable(
  "typing_state",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    partnerId: integer("partner_id").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("typing_unique").on(t.userId, t.partnerId)],
);
