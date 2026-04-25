import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      meId?: number;
    }
  }
}

function slugifyUsername(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 24);
  return `user_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;
  while (attempt < 20) {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    attempt += 1;
    candidate = `${base}${Math.floor(Math.random() * 9000 + 1000)}`.slice(0, 24);
  }
  return `user_${Date.now().toString(36)}`;
}

export async function getOrCreateMe(clerkId: string): Promise<number> {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(usersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(usersTable.id, existing[0]!.id));
    return existing[0]!.id;
  }

  let displayName = "";
  let profilePicture = "";
  let usernameBase = "";
  try {
    const u = await clerkClient.users.getUser(clerkId);
    displayName =
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      u.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "Kizchat user";
    profilePicture = u.imageUrl || "";
    usernameBase = slugifyUsername(
      u.username ||
        u.emailAddresses[0]?.emailAddress?.split("@")[0] ||
        "user",
    );
  } catch {
    displayName = "Kizchat user";
    usernameBase = `user_${Math.random().toString(36).slice(2, 8)}`;
  }
  const username = await ensureUniqueUsername(usernameBase);

  const inserted = await db
    .insert(usersTable)
    .values({
      clerkId,
      username,
      displayName,
      profilePicture,
    })
    .returning({ id: usersTable.id });
  return inserted[0]!.id;
}

export async function requireMe(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = await getOrCreateMe(auth.userId);
    req.meId = id;
    next();
  } catch (err) {
    req.log?.error({ err }, "failed to load user");
    res.status(500).json({ error: "Internal" });
  }
}

export async function touchLastSeen(userId: number) {
  await db
    .update(usersTable)
    .set({ lastSeenAt: new Date() })
    .where(eq(usersTable.id, userId));
}

export { sql };
