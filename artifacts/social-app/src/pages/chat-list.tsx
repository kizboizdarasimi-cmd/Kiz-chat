import { AppShell } from "@/components/AppShell";
import {
  useGetChats,
  useGetStatuses,
  usePinChat,
  useUnpinChat,
  useArchiveChat,
  useUnarchiveChat,
  getGetChatsQueryKey,
  getGetStatusesQueryKey,
  type StatusGroup,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle,
  Check,
  CheckCheck,
  Loader2,
  Image as ImageIcon,
  Mic,
  Pin,
  Archive,
  ArchiveRestore,
  MoreVertical,
  Settings as SettingsIcon,
  PenSquare,
  Camera,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatList() {
  const [archivedView, setArchivedView] = useState(false);
  const { data: chats, isLoading } = useGetChats(
    { archived: archivedView ? "true" : undefined },
    {
      query: {
        refetchInterval: 3000,
        queryKey: [
          ...getGetChatsQueryKey({ archived: archivedView ? "true" : undefined }),
        ],
      },
    },
  );
  const { data: groups } = useGetStatuses({
    query: { refetchInterval: 15000, queryKey: getGetStatusesQueryKey() },
  });
  const qc = useQueryClient();
  const pin = usePinChat();
  const unpin = useUnpinChat();
  const archive = useArchiveChat();
  const unarchive = useUnarchiveChat();
  const [, setLocation] = useLocation();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetChatsQueryKey() });
  };

  const archivedCount = chats?.filter((c) => c.archived).length ?? 0;

  return (
    <AppShell title={archivedView ? "Archived" : "Kizchat"} showBack={archivedView}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          {archivedView ? "Archived chats" : "Chats"}
        </h2>
        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="New chat"
          >
            <PenSquare className="h-5 w-5" />
          </Link>
          <Link
            href="/settings"
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {!archivedView && (
        <StatusBar groups={groups ?? []} />
      )}

      <div className="px-2 pb-4 flex flex-col gap-1">
        {!archivedView && archivedCount === 0 && (
          <></>
        )}
        {!archivedView && archivedCount === 0 && chats?.every((c) => !c.archived) && (
          <></>
        )}

        {isLoading && !chats ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chats?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground px-8">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {archivedView ? "Nothing here" : "No messages yet"}
            </h3>
            <p>
              {archivedView
                ? "Archived chats will appear here."
                : "Tap the pencil icon above or visit a profile to start a chat."}
            </p>
          </div>
        ) : (
          chats?.map((chat) => (
            <div
              key={chat.partner.username}
              className="group flex items-center gap-3 pl-3 pr-1 py-2 rounded-2xl hover:bg-secondary/50 transition-colors"
            >
              <Link
                href={`/chats/${chat.partner.username}`}
                className="flex items-center gap-3 flex-1 overflow-hidden"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={chat.partner.profilePicture} />
                    <AvatarFallback>{chat.partner.displayName[0]}</AvatarFallback>
                  </Avatar>
                  {chat.partnerOnline && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <h3 className="font-semibold text-foreground truncate">
                        {chat.partner.displayName}
                      </h3>
                      {chat.partner.isVerified && (
                        <Check
                          className="h-3 w-3 text-primary shrink-0"
                          strokeWidth={3}
                        />
                      )}
                      {chat.pinned && (
                        <Pin className="h-3 w-3 text-muted-foreground shrink-0 fill-current" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(chat.lastMessageAt), {
                        addSuffix: false,
                      }).replace("about ", "")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p
                      className={`text-sm truncate flex items-center gap-1 ${
                        chat.unreadCount > 0
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {chat.partnerTyping ? (
                        <span className="text-primary italic">typing…</span>
                      ) : (
                        <>
                          {chat.lastMessageFromMe && (
                            <DeliveryIcon status={chat.lastMessageStatus} />
                          )}
                          <MessagePreview
                            kind={chat.lastMessageKind}
                            body={chat.lastMessage}
                          />
                        </>
                      )}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="shrink-0 bg-primary text-primary-foreground text-xs font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2 rounded-full hover:bg-secondary text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      const m = chat.pinned ? unpin : pin;
                      m.mutate(
                        { username: chat.partner.username },
                        { onSuccess: invalidate },
                      );
                    }}
                  >
                    <Pin className="h-4 w-4 mr-2" />
                    {chat.pinned ? "Unpin" : "Pin"} chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const m = chat.archived ? unarchive : archive;
                      m.mutate(
                        { username: chat.partner.username },
                        { onSuccess: invalidate },
                      );
                    }}
                  >
                    {chat.archived ? (
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                    ) : (
                      <Archive className="h-4 w-4 mr-2" />
                    )}
                    {chat.archived ? "Unarchive" : "Archive"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}

        {!archivedView && archivedCount > 0 && (
          <button
            onClick={() => setArchivedView(true)}
            className="flex items-center gap-3 p-3 mt-2 rounded-2xl hover:bg-secondary/50 text-muted-foreground"
          >
            <Archive className="h-5 w-5" />
            <span className="text-sm font-medium">Archived ({archivedCount})</span>
          </button>
        )}
        {archivedView && (
          <button
            onClick={() => setLocation("/chats")}
            className="text-sm text-primary p-3 mx-auto"
          >
            Back to chats
          </button>
        )}
      </div>
    </AppShell>
  );
}

function StatusBar({ groups }: { groups: StatusGroup[] }) {
  if (groups.length === 0) {
    return (
      <Link
        href="/status"
        className="flex items-center gap-3 mx-4 mb-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/50"
      >
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
          <Camera className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Add status</p>
          <p className="text-xs text-muted-foreground">
            Share an update that disappears in 24h
          </p>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href="/status"
      className="flex items-center gap-3 mx-4 mb-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/50 overflow-hidden"
    >
      <div className="flex -space-x-3 shrink-0">
        {groups.slice(0, 4).map((g) => (
          <div
            key={g.author.username}
            className="rounded-full p-[2px] bg-gradient-to-br from-primary to-accent"
          >
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={g.author.profilePicture} />
              <AvatarFallback>{g.author.displayName[0]}</AvatarFallback>
            </Avatar>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold text-foreground">Status</p>
        <p className="text-xs text-muted-foreground truncate">
          {groups[0]!.isMe && groups.length === 1
            ? "Tap to add"
            : `${groups.length} ${groups.length === 1 ? "person" : "people"} posted`}
        </p>
      </div>
    </Link>
  );
}

function DeliveryIcon({ status }: { status: "sent" | "delivered" | "read" }) {
  if (status === "sent") return <Check className="h-3.5 w-3.5 shrink-0" />;
  if (status === "delivered")
    return <CheckCheck className="h-3.5 w-3.5 shrink-0" />;
  return <CheckCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />;
}

function MessagePreview({
  kind,
  body,
}: {
  kind: "text" | "voice" | "emoji" | "image";
  body: string;
}) {
  if (kind === "image")
    return (
      <span className="flex items-center gap-1">
        <ImageIcon className="h-3.5 w-3.5" /> Photo
      </span>
    );
  if (kind === "voice")
    return (
      <span className="flex items-center gap-1">
        <Mic className="h-3.5 w-3.5" /> Voice message
      </span>
    );
  return <span className="truncate">{body}</span>;
}
