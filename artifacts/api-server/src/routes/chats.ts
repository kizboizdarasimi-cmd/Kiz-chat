import { Router, type IRouter } from "express";
import {
  GetChatsResponse,
  GetMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
  MarkChatReadResponse,
  SetTypingResponse,
  PinChatResponse,
  UnpinChatResponse,
  ArchiveChatResponse,
  UnarchiveChatResponse,
  DeleteMessageResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  messagesTable,
  typingTable,
  notificationsTable,
  blockedTable,
  chatSettingsTable,
} from "@workspace/db";
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { requireMe } from "../lib/auth";
import { buildUserSummaries } from "../lib/userSummary";

const router: IRouter = Router();

const ONLINE_WINDOW_MS = 60_000;
const TYPING_WINDOW_MS = 4_000;

async function loadBlockSets(meId: number) {
  const blockedByMe = await db
    .select({ id: blockedTable.blockedId })
    .from(blockedTable)
    .where(eq(blockedTable.blockerId, meId));
  const blockedMe = await db
    .select({ id: blockedTable.blockerId })
    .from(blockedTable)
    .where(eq(blockedTable.blockedId, meId));
  return {
    iBlocked: new Set(blockedByMe.map((r) => r.id)),
    blockedMe: new Set(blockedMe.map((r) => r.id)),
  };
}

router.get("/chats", requireMe, async (req, res) => {
  const meId = req.meId!;
  const archived = req.query.archived === "true";

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

  const settingsRows = await db
    .select()
    .from(chatSettingsTable)
    .where(
      and(
        eq(chatSettingsTable.userId, meId),
        inArray(chatSettingsTable.partnerId, partnerIds),
      ),
    );
  const settingsMap = new Map(settingsRows.map((s) => [s.partnerId, s]));

  const { iBlocked } = await loadBlockSets(meId);

  const now = Date.now();
  const data = partnerIds
    .map((pid) => {
      const last = partnerLast.get(pid)!;
      const partner = partnerMap.get(pid);
      const setting = settingsMap.get(pid);
      const lastSeen = partner?.lastSeenAt?.getTime() ?? 0;
      const lastSeenVisible = partner?.lastSeenVisible ?? true;
      return {
        partner: summaries.get(pid)!,
        lastMessage: last.deletedForEveryone === "true"
          ? "This message was deleted"
          : last.body,
        lastMessageKind: last.kind,
        lastMessageAt: last.createdAt.toISOString(),
        lastMessageFromMe: last.senderId === meId,
        lastMessageStatus: last.status,
        unreadCount: unread.get(pid) ?? 0,
        partnerTyping: typingSet.has(pid),
        partnerOnline:
          lastSeenVisible && now - lastSeen < ONLINE_WINDOW_MS,
        pinned: setting?.pinned ?? false,
        archived: setting?.archived ?? false,
        blocked: iBlocked.has(pid),
      };
    })
    .filter((c) => c.archived === archived)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageAt.localeCompare(a.lastMessageAt);
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
  const data = rows
    .filter((m) => {
      if (m.senderId === meId && m.deletedForSender === "true") return false;
      if (m.receiverId === meId && m.deletedForReceiver === "true") return false;
      return true;
    })
    .map((m) => ({
      id: m.id,
      senderUsername: m.senderId === meId ? me.username : partner[0]!.username,
      receiverUsername:
        m.receiverId === meId ? me.username : partner[0]!.username,
      body: m.deletedForEveryone === "true" ? "" : m.body,
      kind: m.kind,
      status: m.status,
      deletedForEveryone: m.deletedForEveryone === "true",
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

  const { iBlocked, blockedMe } = await loadBlockSets(meId);
  if (iBlocked.has(partnerId) || blockedMe.has(partnerId)) {
    res.status(403).json({ error: "Cannot send to this user" });
    return;
  }

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
      deletedForEveryone: false,
      createdAt: m.createdAt.toISOString(),
    }),
  );
});

router.delete("/chats/:username/messages/:id", requireMe, async (req, res) => {
  const meId = req.meId!;
  const id = Number(req.params.id);
  const scope = req.query.scope === "everyone" ? "everyone" : "me";
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id));
  if (rows.length === 0) {
    res.json(DeleteMessageResponse.parse({ ok: true }));
    return;
  }
  const m = rows[0]!;
  if (m.senderId !== meId && m.receiverId !== meId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (scope === "everyone") {
    if (m.senderId !== meId) {
      res.status(403).json({ error: "Only sender can delete for everyone" });
      return;
    }
    await db
      .update(messagesTable)
      .set({ deletedForEveryone: "true", body: "" })
      .where(eq(messagesTable.id, id));
  } else if (m.senderId === meId) {
    await db
      .update(messagesTable)
      .set({ deletedForSender: "true" })
      .where(eq(messagesTable.id, id));
  } else {
    await db
      .update(messagesTable)
      .set({ deletedForReceiver: "true" })
      .where(eq(messagesTable.id, id));
  }
  res.json(DeleteMessageResponse.parse({ ok: true }));
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

async function setChatFlag(
  meId: number,
  partnerUsername: string,
  field: "pinned" | "archived",
  value: boolean,
) {
  const partner = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, partnerUsername));
  if (partner.length === 0) return;
  const partnerId = partner[0]!.id;
  const existing = await db
    .select()
    .from(chatSettingsTable)
    .where(
      and(
        eq(chatSettingsTable.userId, meId),
        eq(chatSettingsTable.partnerId, partnerId),
      ),
    );
  if (existing.length === 0) {
    await db.insert(chatSettingsTable).values({
      userId: meId,
      partnerId,
      pinned: field === "pinned" ? value : false,
      archived: field === "archived" ? value : false,
    });
  } else {
    await db
      .update(chatSettingsTable)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(chatSettingsTable.id, existing[0]!.id));
  }
}

router.post("/chats/:username/pin", requireMe, async (req, res) => {
  await setChatFlag(req.meId!, String(req.params.username), "pinned", true);
  res.json(PinChatResponse.parse({ ok: true }));
});
router.delete("/chats/:username/pin", requireMe, async (req, res) => {
  await setChatFlag(req.meId!, String(req.params.username), "pinned", false);
  res.json(UnpinChatResponse.parse({ ok: true }));
});
router.post("/chats/:username/archive", requireMe, async (req, res) => {
  await setChatFlag(req.meId!, String(req.params.username), "archived", true);
  res.json(ArchiveChatResponse.parse({ ok: true }));
});
router.delete("/chats/:username/archive", requireMe, async (req, res) => {
  await setChatFlag(req.meId!, String(req.params.username), "archived", false);
  res.json(UnarchiveChatResponse.parse({ ok: true }));
});

export default router;
