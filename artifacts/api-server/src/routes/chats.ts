import { Router, type IRouter } from "express";
import {
  GetChatsResponse,
  GetMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
  MarkChatReadResponse,
  SetTypingResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  messagesTable,
  typingTable,
  notificationsTable,
} from "@workspace/db";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { requireMe } from "../lib/auth";
import { buildUserSummaries } from "../lib/userSummary";

const router: IRouter = Router();

const ONLINE_WINDOW_MS = 60_000;
const TYPING_WINDOW_MS = 4_000;

router.get("/chats", requireMe, async (req, res) => {
  const meId = req.meId!;

  const allMsgs = await db
    .select()
    .from(messagesTable)
    .where(
      or(eq(messagesTable.senderId, meId), eq(messagesTable.receiverId, meId)),
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(500);

  const partnerLast = new Map<number, typeof messagesTable.$inferSelect>();
  const unread = new Map<number, number>();
  for (const m of allMsgs) {
    const partnerId = m.senderId === meId ? m.receiverId : m.senderId;
    if (!partnerLast.has(partnerId)) partnerLast.set(partnerId, m);
    if (m.receiverId === meId && m.status !== "read") {
      unread.set(partnerId, (unread.get(partnerId) ?? 0) + 1);
    }
  }
  const partnerIds = Array.from(partnerLast.keys());
  if (partnerIds.length === 0) {
    res.json([]);
    return;
  }
  const summaries = await buildUserSummaries(meId, partnerIds);
  const partners = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, partnerIds));
  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  const cutoff = new Date(Date.now() - TYPING_WINDOW_MS);
  const typingRows = await db
    .select()
    .from(typingTable)
    .where(
      and(
        eq(typingTable.partnerId, meId),
        inArray(typingTable.userId, partnerIds),
        gte(typingTable.updatedAt, cutoff),
      ),
    );
  const typingSet = new Set(typingRows.map((t) => t.userId));

  const now = Date.now();
  const data = partnerIds
    .sort(
      (a, b) =>
        (partnerLast.get(b)!.createdAt.getTime() ?? 0) -
        (partnerLast.get(a)!.createdAt.getTime() ?? 0),
    )
    .map((pid) => {
      const last = partnerLast.get(pid)!;
      const partner = partnerMap.get(pid);
      const lastSeen = partner?.lastSeenAt?.getTime() ?? 0;
      return {
        partner: summaries.get(pid)!,
        lastMessage: last.body,
        lastMessageAt: last.createdAt.toISOString(),
        lastMessageFromMe: last.senderId === meId,
        unreadCount: unread.get(pid) ?? 0,
        partnerTyping: typingSet.has(pid),
        partnerOnline: now - lastSeen < ONLINE_WINDOW_MS,
      };
    });
  res.json(GetChatsResponse.parse(data));
});

router.get("/chats/:username/messages", requireMe, async (req, res) => {
  const meId = req.meId!;
  const partner = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (partner.length === 0) {
    res.json([]);
    return;
  }
  const partnerId = partner[0]!.id;

  // Mark messages from partner as delivered when fetched
  await db
    .update(messagesTable)
    .set({ status: "delivered" })
    .where(
      and(
        eq(messagesTable.senderId, partnerId),
        eq(messagesTable.receiverId, meId),
        eq(messagesTable.status, "sent"),
      ),
    );

  const rows = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(
          eq(messagesTable.senderId, meId),
          eq(messagesTable.receiverId, partnerId),
        ),
        and(
          eq(messagesTable.senderId, partnerId),
          eq(messagesTable.receiverId, meId),
        ),
      ),
    )
    .orderBy(messagesTable.createdAt)
    .limit(500);

  const me = (
    await db.select().from(usersTable).where(eq(usersTable.id, meId))
  )[0]!;
  const data = rows.map((m) => ({
    id: m.id,
    senderUsername: m.senderId === meId ? me.username : partner[0]!.username,
    receiverUsername: m.receiverId === meId ? me.username : partner[0]!.username,
    body: m.body,
    kind: m.kind,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  }));
  res.json(GetMessagesResponse.parse(data));
});

router.post("/chats/:username/messages", requireMe, async (req, res) => {
  const meId = req.meId!;
  const partner = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (partner.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const partnerId = partner[0]!.id;
  const body = SendMessageBody.parse(req.body);

  const inserted = await db
    .insert(messagesTable)
    .values({
      senderId: meId,
      receiverId: partnerId,
      body: body.body,
      kind: body.kind,
      status: "sent",
    })
    .returning();
  const m = inserted[0]!;

  const me = (
    await db.select().from(usersTable).where(eq(usersTable.id, meId))
  )[0]!;
  await db.insert(notificationsTable).values({
    receiverId: partnerId,
    actorId: meId,
    type: "message",
    message: `@${me.username} sent you a message`,
  });

  res.json(
    SendMessageResponse.parse({
      id: m.id,
      senderUsername: me.username,
      receiverUsername: partner[0]!.username,
      body: m.body,
      kind: m.kind,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
    }),
  );
});

router.post("/chats/:username/read", requireMe, async (req, res) => {
  const meId = req.meId!;
  const partner = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (partner.length === 0) {
    res.json(MarkChatReadResponse.parse({ ok: true }));
    return;
  }
  const partnerId = partner[0]!.id;
  await db
    .update(messagesTable)
    .set({ status: "read" })
    .where(
      and(
        eq(messagesTable.senderId, partnerId),
        eq(messagesTable.receiverId, meId),
      ),
    );
  res.json(MarkChatReadResponse.parse({ ok: true }));
});

router.post("/chats/:username/typing", requireMe, async (req, res) => {
  const meId = req.meId!;
  const partner = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, String(req.params.username)));
  if (partner.length === 0) {
    res.json(SetTypingResponse.parse({ ok: true }));
    return;
  }
  const partnerId = partner[0]!.id;
  const existing = await db
    .select()
    .from(typingTable)
    .where(
      and(eq(typingTable.userId, meId), eq(typingTable.partnerId, partnerId)),
    );
  if (existing.length === 0) {
    await db
      .insert(typingTable)
      .values({ userId: meId, partnerId, updatedAt: new Date() });
  } else {
    await db
      .update(typingTable)
      .set({ updatedAt: new Date() })
      .where(eq(typingTable.id, existing[0]!.id));
  }
  res.json(SetTypingResponse.parse({ ok: true }));
});

export default router;
