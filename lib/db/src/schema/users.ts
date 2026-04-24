import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    clerkId: text("clerk_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull().default(""),
    bio: text("bio").notNull().default(""),
    profilePicture: text("profile_picture").notNull().default(""),
    isVerified: boolean("is_verified").notNull().default(false),
    verificationRequested: boolean("verification_requested")
      .notNull()
      .default(false),
    followersCount: integer("followers_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    videosCount: integer("videos_count").notNull().default(0),
    likesCount: integer("likes_count").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_clerk_id_unique").on(t.clerkId),
    uniqueIndex("users_username_unique").on(t.username),
  ],
);

export type UserRow = typeof usersTable.$inferSelect;
